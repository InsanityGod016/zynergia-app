import { createHash, timingSafeEqual } from 'node:crypto';

import { allowedPriceIds, getStripe, getSupabaseAdmin } from './clients.js';
import { syncSubscription } from './billing-service.js';
import {
  isNonTerminalSubscription,
  normalizeEmail,
  stripeCustomerId,
  stripeMetadataOwnership,
  stripePriceId,
} from './billing-state.js';
import { HttpError } from './http.js';

const PAGE_SIZE = 100;
const USER_PAGE_SIZE = 1000;
const MAX_PAGES = 100;

function safeHash(value) {
  return createHash('sha256').update(value).digest();
}

export function requireLegacyReconciliationAdmin(req) {
  if (process.env.LEGACY_RECONCILIATION_ENABLED !== 'true') {
    throw new HttpError(404, 'LEGACY_RECONCILIATION_DISABLED', 'La conciliación no está habilitada.');
  }

  const expected = String(process.env.LEGACY_RECONCILIATION_SECRET || '');
  const match = String(req.headers?.authorization || '').match(/^Bearer ([^\s]+)$/);
  const provided = match?.[1] || '';
  if (expected.length < 32) {
    throw new HttpError(
      500,
      'LEGACY_RECONCILIATION_NOT_CONFIGURED',
      'Falta configurar la conciliación legacy.'
    );
  }
  if (!timingSafeEqual(safeHash(expected), safeHash(provided))) {
    throw new HttpError(401, 'INVALID_LEGACY_RECONCILIATION_SECRET', 'No autorizado.');
  }
}

async function listStripeSubscriptions(stripe, prices) {
  const subscriptions = new Map();

  for (const price of prices) {
    let startingAfter;
    let complete = false;

    for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
      const page = await stripe.subscriptions.list({
        price,
        status: 'all',
        limit: PAGE_SIZE,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      if (!Array.isArray(page?.data)) throw new Error('stripe_subscription_page_invalid');

      for (const subscription of page.data) {
        if (subscription?.id) subscriptions.set(subscription.id, subscription);
      }
      if (!page.has_more) {
        complete = true;
        break;
      }

      startingAfter = page.data.at(-1)?.id;
      if (!startingAfter) throw new Error('stripe_subscription_pagination_invalid');
    }

    if (!complete) throw new Error('stripe_subscription_pagination_limit');
  }

  return [...subscriptions.values()];
}

async function listVerifiedUsers(admin) {
  const usersByEmail = new Map();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USER_PAGE_SIZE });
    if (error) throw error;
    const users = data?.users;
    if (!Array.isArray(users)) throw new Error('supabase_auth_user_page_invalid');

    for (const user of users) {
      const email = normalizeEmail(user.email);
      if (!email || !user.email_confirmed_at) continue;
      const matches = usersByEmail.get(email) || [];
      matches.push(user);
      usersByEmail.set(email, matches);
    }
    if (users.length < USER_PAGE_SIZE) return usersByEmail;
  }

  throw new Error('supabase_auth_user_pagination_limit');
}

async function listBillingAccounts(admin) {
  const rows = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * USER_PAGE_SIZE;
    const { data, error } = await admin
      .from('billing_accounts')
      .select('id,user_id,stripe_customer_id,stripe_subscription_id,claim_email,subscription_status,anonymized_at')
      .order('id', { ascending: true })
      .range(from, from + USER_PAGE_SIZE - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('billing_account_page_invalid');
    rows.push(...data);
    if (data.length < USER_PAGE_SIZE) return rows;
  }

  throw new Error('billing_account_pagination_limit');
}

function billingConflict(rows, userId, email, customerId, subscriptionId) {
  const related = rows.filter((row) =>
    row.user_id === userId ||
    row.stripe_customer_id === customerId ||
    row.stripe_subscription_id === subscriptionId
  );
  if (new Set(related.map((row) => row.id)).size > 1) return 'billing_account_conflict';

  const row = related[0];
  if (!row) return null;
  if (row.anonymized_at) return 'billing_account_anonymized';
  if (row.user_id && row.user_id !== userId) return 'billing_owned_by_other_user';
  if (row.claim_email && normalizeEmail(row.claim_email) !== email) {
    return 'billing_claim_email_mismatch';
  }
  if (row.user_id === userId && row.stripe_customer_id !== customerId) {
    return 'user_has_other_billing_account';
  }
  if (row.stripe_subscription_id === subscriptionId && row.stripe_customer_id !== customerId) {
    return 'subscription_customer_mismatch';
  }
  if (row.stripe_customer_id === customerId &&
      row.stripe_subscription_id &&
      row.stripe_subscription_id !== subscriptionId &&
      isNonTerminalSubscription(row.subscription_status)) {
    return 'customer_has_other_current_subscription';
  }
  return null;
}

function addReason(summary, reason, count = 1, kind = 'skipped') {
  summary[kind] += count;
  summary.reasons[reason] = (summary.reasons[reason] || 0) + count;
}

async function attachMetadata(stripe, customerId, subscriptionId, userId) {
  const metadata = { supabase_user_id: userId };
  const updates = await Promise.allSettled([
    stripe.customers.update(
      customerId,
      { metadata },
      { idempotencyKey: `legacy-reconcile:customer:${customerId}:${userId}` }
    ),
    stripe.subscriptions.update(
      subscriptionId,
      { metadata },
      { idempotencyKey: `legacy-reconcile:subscription:${subscriptionId}:${userId}` }
    ),
  ]);
  if (updates.some((update) => update.status === 'rejected')) {
    throw new Error('stripe_metadata_update_failed');
  }
}

export async function reconcileLegacySubscriptions({
  stripe = getStripe(),
  admin = getSupabaseAdmin(),
  sync = syncSubscription,
} = {}) {
  const prices = [...allowedPriceIds()];
  if (prices.length === 0) {
    throw new HttpError(500, 'ALLOWED_PRICES_NOT_CONFIGURED', 'No hay precios permitidos configurados.');
  }

  // Finish every inventory page before writing anything. A truncated inventory must never merge accounts.
  const [subscriptions, usersByEmail, billingRows] = await Promise.all([
    listStripeSubscriptions(stripe, prices),
    listVerifiedUsers(admin),
    listBillingAccounts(admin),
  ]);
  const summary = {
    scanned: subscriptions.length,
    eligible: 0,
    reconciled: 0,
    skipped: 0,
    failed: 0,
    reasons: {},
  };
  const candidatesByEmail = new Map();
  const customers = new Map();

  for (const subscription of subscriptions) {
    const items = subscription?.items?.data || [];
    const priceId = stripePriceId(subscription);
    if (items.length !== 1 || !prices.includes(priceId)) {
      addReason(summary, 'not_exact_single_allowed_price');
      continue;
    }
    if (!isNonTerminalSubscription(subscription.status)) {
      addReason(summary, 'terminal_subscription');
      continue;
    }

    summary.eligible += 1;
    const customerId = stripeCustomerId(subscription);
    if (!customerId) {
      addReason(summary, 'missing_customer');
      continue;
    }
    if (!customers.has(customerId)) {
      customers.set(customerId, await stripe.customers.retrieve(customerId));
    }
    const customer = customers.get(customerId);
    const email = !customer?.deleted ? normalizeEmail(customer?.email) : '';
    if (!email) {
      addReason(summary, 'customer_without_email');
      continue;
    }

    const candidates = candidatesByEmail.get(email) || [];
    candidates.push({ customer, customerId, email, subscription });
    candidatesByEmail.set(email, candidates);
  }

  for (const [email, candidates] of candidatesByEmail) {
    if (candidates.length !== 1) {
      addReason(summary, 'multiple_eligible_stripe_accounts', candidates.length);
      continue;
    }

    const candidate = candidates[0];
    const users = usersByEmail.get(email) || [];
    if (users.length === 0) {
      addReason(summary, 'no_verified_supabase_user');
      continue;
    }
    if (users.length !== 1) {
      addReason(summary, 'multiple_verified_supabase_users');
      continue;
    }

    const user = users[0];
    if (stripeMetadataOwnership([candidate.customer, candidate.subscription], user.id) === 'conflict') {
      addReason(summary, 'stripe_metadata_owner_mismatch');
      continue;
    }
    const conflict = billingConflict(
      billingRows,
      user.id,
      email,
      candidate.customerId,
      candidate.subscription.id
    );
    if (conflict) {
      addReason(summary, conflict);
      continue;
    }

    try {
      const synced = await sync(candidate.subscription, { userId: user.id, email });
      if (synced?.status !== 'synced' ||
          synced.stripe_customer_id !== candidate.customerId ||
          synced.stripe_subscription_id !== candidate.subscription.id) {
        throw new Error('billing_sync_result_invalid');
      }
      await attachMetadata(
        stripe,
        candidate.customerId,
        candidate.subscription.id,
        user.id
      );
      summary.reconciled += 1;
    } catch {
      console.error('[legacy-reconciliation:item] reconciliation_failed');
      addReason(summary, 'reconciliation_failed', 1, 'failed');
    }
  }

  return summary;
}
