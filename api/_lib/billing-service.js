import {
  allowedPriceIds,
  getStripe,
  getSupabaseAdmin,
  graceDays,
  newSignupsEnabled,
} from './clients.js';
import { HttpError } from './http.js';
import {
  chooseLegacySubscription,
  isNonTerminalSubscription,
  isUuid,
  normalizeEmail,
  stripeCustomerId,
  stripeMetadataOwnership,
  stripePriceId,
  subscriptionPeriodEnd,
} from './billing-state.js';

async function rpc(name, params) {
  const { data, error } = await getSupabaseAdmin().rpc(name, params);
  if (error) throw error;
  return data;
}

function isoFromUnix(seconds) {
  const value = Number(seconds);
  return seconds !== null && seconds !== undefined && seconds !== '' &&
    Number.isFinite(value) && value > 0
    ? new Date(value * 1000).toISOString()
    : null;
}

export async function syncBillingAccount({
  customerId,
  subscriptionId = null,
  userId = null,
  claimEmail = null,
  priceId = null,
  status = 'none',
  currentPeriodEnd = null,
  cancelAtPeriodEnd = false,
  scheduledCancelAt = null,
  entitlementEligible = false,
  operationId = null,
  eventId = null,
  eventCreatedAt = null,
}) {
  if (!customerId?.startsWith('cus_')) throw new Error('Stripe Customer inválido');

  const eventTime = Date.parse(eventCreatedAt || '');
  const graceUntil = status === 'past_due' && Number.isFinite(eventTime)
    ? new Date(eventTime + graceDays() * 86400000).toISOString()
    : null;

  return rpc('sync_stripe_billing_account', {
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_user_id: isUuid(userId) ? userId : null,
    p_claim_email: normalizeEmail(claimEmail) || null,
    p_price_id: priceId,
    p_subscription_status: status,
    p_current_period_end: currentPeriodEnd,
    p_grace_until: graceUntil,
    p_cancel_at_period_end: Boolean(cancelAtPeriodEnd),
    p_scheduled_cancel_at: scheduledCancelAt,
    p_entitlement_eligible: Boolean(entitlementEligible),
    p_operation_id: isUuid(operationId) ? operationId : null,
    p_last_event_id: eventId,
    p_event_created_at: eventCreatedAt,
  });
}

export async function syncSubscription(subscription, hints = {}) {
  const customerId = stripeCustomerId(subscription);
  if (!customerId) throw new Error('La suscripción no tiene Customer');

  const metadataUserId = subscription?.metadata?.supabase_user_id || subscription?.metadata?.user_id;
  const userId = hints.userId || metadataUserId || null;
  let claimEmail = hints.email || null;

  if (!claimEmail && !isUuid(userId)) {
    const customer = await getStripe().customers.retrieve(customerId);
    if (!customer.deleted) claimEmail = customer.email;
  }

  const priceId = stripePriceId(subscription);
  const items = subscription?.items?.data || [];
  const entitlementEligible = items.length === 1 && allowedPriceIds().has(priceId);

  return syncBillingAccount({
    customerId,
    subscriptionId: subscription.id,
    userId,
    claimEmail,
    priceId,
    status: subscription.status,
    currentPeriodEnd: isoFromUnix(subscriptionPeriodEnd(subscription)),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    scheduledCancelAt: isoFromUnix(subscription.cancel_at),
    entitlementEligible,
    operationId: hints.operationId || subscription?.metadata?.operation_id,
    eventId: hints.eventId,
    eventCreatedAt: hints.eventCreatedAt,
  });
}

export async function recordStripeAccessIncident({
  customerId,
  subscriptionId,
  claimEmail = null,
  incidentKey,
  incidentKind,
  blockedReason = null,
  eventId,
  eventCreatedAt,
}) {
  if (!customerId?.startsWith('cus_')) throw new Error('Stripe Customer inválido');

  return rpc('record_stripe_access_incident', {
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_claim_email: normalizeEmail(claimEmail) || null,
    p_incident_key: incidentKey,
    p_incident_kind: incidentKind,
    p_access_blocked_reason: blockedReason,
    p_event_id: eventId,
    p_event_created_at: eventCreatedAt,
  });
}

export async function reconcileStripeAccessIncidentCanonical({
  customerId,
  subscriptionId,
  claimEmail = null,
  incidentKey,
  incidentKind,
  blockedReason = null,
  eventId,
  eventCreatedAt,
}) {
  if (!customerId?.startsWith('cus_')) throw new Error('Stripe Customer inválido');

  return rpc('reconcile_stripe_access_incident_canonical', {
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_claim_email: normalizeEmail(claimEmail) || null,
    p_incident_key: incidentKey,
    p_incident_kind: incidentKind,
    p_access_blocked_reason: blockedReason,
    p_event_id: eventId,
    p_event_created_at: eventCreatedAt,
  });
}

export async function recordStripeInvoicePaid({
  customerId,
  subscriptionId,
  eventId,
  eventCreatedAt,
}) {
  if (!customerId?.startsWith('cus_')) throw new Error('Stripe Customer inválido');
  return rpc('record_stripe_invoice_paid', {
    p_stripe_customer_id: customerId,
    p_stripe_subscription_id: subscriptionId,
    p_event_id: eventId,
    p_event_created_at: eventCreatedAt,
  });
}

export async function reconcileCustomerBilling(customerId, hints = {}) {
  const subscriptions = await getStripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  });
  if (subscriptions.has_more) throw new Error('Demasiadas suscripciones para conciliar');

  const selected = chooseLegacySubscription(subscriptions.data);
  if (selected.conflict) throw new Error(`Conciliación ambigua: ${selected.conflict}`);
  if (selected.subscription) {
    return syncSubscription(selected.subscription, hints);
  }

  return syncBillingAccount({
    customerId,
    claimEmail: hints.email,
    eventId: hints.eventId,
    eventCreatedAt: hints.eventCreatedAt,
  });
}

async function claimRow(user, expectedCustomerId = null) {
  return rpc('claim_billing_account', {
    p_user_id: user.id,
    p_email: normalizeEmail(user.email),
    p_expected_stripe_customer_id: expectedCustomerId,
  });
}

async function attachStripeMetadata(user, result) {
  const stripe = getStripe();
  const updates = [
    stripe.customers.update(result.stripe_customer_id, {
      metadata: { supabase_user_id: user.id },
    }),
  ];

  if (result.stripe_subscription_id) {
    updates.push(stripe.subscriptions.update(result.stripe_subscription_id, {
      metadata: { supabase_user_id: user.id },
    }));
  }

  const settled = await Promise.allSettled(updates);
  for (const update of settled) {
    if (update.status === 'rejected') console.error('[billing-claim-metadata]', update.reason);
  }
}

async function discoverLegacyBilling(user) {
  const stripe = getStripe();
  const email = normalizeEmail(user.email);
  const customers = await stripe.customers.list({ email: user.email, limit: 100 });
  const exact = customers.data.filter((customer) => !customer.deleted && normalizeEmail(customer.email) === email);

  if (customers.has_more || exact.length > 1) return { status: 'conflict', reason: 'multiple_customers' };
  if (exact.length === 0) return { status: 'not_found' };

  const customer = exact[0];
  const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 100 });
  if (subscriptions.has_more) return { status: 'conflict', reason: 'too_many_subscriptions' };

  const selected = chooseLegacySubscription(subscriptions.data);
  if (selected.conflict) return { status: 'conflict', reason: selected.conflict };
  if (stripeMetadataOwnership([customer, selected.subscription], user.id) === 'conflict') {
    return { status: 'conflict', reason: 'metadata_owner_mismatch' };
  }

  if (selected.subscription) {
    const priceId = stripePriceId(selected.subscription);
    const allowed = allowedPriceIds();
    if (isNonTerminalSubscription(selected.subscription.status) &&
        (!priceId || allowed.size === 0 || !allowed.has(priceId))) {
      return { status: 'conflict', reason: 'unsupported_price' };
    }
    await syncSubscription(selected.subscription, { email });
  } else {
    await syncBillingAccount({ customerId: customer.id, claimEmail: email });
  }

  return { status: 'imported', customerId: customer.id };
}

export async function claimBillingForUser(user) {
  let result = await claimRow(user);
  if (result?.status === 'existing') return result;
  if (result?.status === 'conflict') return result;

  const discovered = await discoverLegacyBilling(user);
  if (discovered.status === 'conflict') return discovered;
  if (discovered.status === 'not_found') return discovered;

  result = await claimRow(user, discovered.customerId);
  if (result?.status === 'claimed') {
    await attachStripeMetadata(user, result);
  }
  return result || { status: 'not_found' };
}

export async function accessSnapshot(userId) {
  return rpc('get_access_snapshot', { p_user_id: userId });
}

export function publicBillingStatus(snapshot) {
  const billing = snapshot?.billing || null;
  const access = snapshot?.access || { entitled: false, state: 'inactive', access_until: null };
  const subscriptionStatus = billing?.subscription_status || 'none';
  const terminal = ['none', 'canceled', 'incomplete_expired'].includes(subscriptionStatus);
  const deletionScheduledFor = snapshot?.deletion_scheduled_for || null;
  const canCancelSubscription = Boolean(
    billing?.stripe_customer_id &&
    billing?.stripe_subscription_id &&
    !deletionScheduledFor &&
    !terminal &&
    !billing?.cancel_at_period_end
  );
  const canUpdatePaymentMethod = Boolean(
    billing?.stripe_customer_id &&
    !deletionScheduledFor &&
    !billing?.access_blocked_reason &&
    ['active', 'trialing', 'past_due'].includes(subscriptionStatus)
  );
  const needsManualReview = billing &&
    !billing.entitlement_eligible &&
    isNonTerminalSubscription(subscriptionStatus);
  const inactiveDespiteStripe = !access.entitled &&
    ['active', 'trialing'].includes(subscriptionStatus);
  const accessBlockedState = billing?.access_blocked_reason === 'full_refund'
    ? 'refunded'
    : billing?.access_blocked_reason
      ? 'disputed'
      : null;

  return {
    state: deletionScheduledFor && access.entitled
      ? 'pending_deletion'
      : access.entitled
        ? access.state
        : accessBlockedState
          ? accessBlockedState
          : needsManualReview
            ? 'manual_review'
            : inactiveDespiteStripe
              ? 'inactive'
              : subscriptionStatus,
    subscriptionStatus,
    currentPeriodEnd: billing?.current_period_end || null,
    graceEndsAt: billing?.grace_until || null,
    accessEndsAt: access?.access_until || null,
    cancelAtPeriodEnd: Boolean(billing?.cancel_at_period_end),
    deletionScheduledFor,
    canCancelSubscription,
    canUpdatePaymentMethod,
    canCheckout: newSignupsEnabled() && !deletionScheduledFor &&
      !billing?.access_blocked_reason && !access.entitled && terminal,
  };
}

export async function ensureStripeCustomer(user, billing) {
  if (billing?.stripe_customer_id) return billing.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: user.email,
    metadata: { supabase_user_id: user.id },
  }, { idempotencyKey: `customer:${user.id}` });

  await syncBillingAccount({ customerId: customer.id, userId: user.id });
  return customer.id;
}

export async function refreshSubscription(subscriptionId, hints = {}) {
  if (!subscriptionId) return null;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await syncSubscription(subscription, hints);
  return subscription;
}

export async function cancelSubscriptionAtPeriodEnd({ userId, customerId, subscriptionId }) {
  if (!isUuid(userId) || !customerId?.startsWith('cus_') || !subscriptionId?.startsWith('sub_')) {
    throw new HttpError(409, 'NO_ACTIVE_SUBSCRIPTION', 'Tu cuenta no tiene una suscripción que podamos cancelar.');
  }

  const stripe = getStripe();
  let subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (stripeCustomerId(subscription) !== customerId ||
      stripeMetadataOwnership([subscription], userId) === 'conflict' ||
      subscription.items?.data?.length !== 1 ||
      !allowedPriceIds().has(stripePriceId(subscription))) {
    throw new HttpError(409, 'BILLING_CONFLICT', 'No pudimos verificar la suscripción. Contacta a soporte.');
  }

  if (['past_due', 'unpaid', 'paused'].includes(subscription.status)) {
    subscription = await stripe.subscriptions.cancel(
      subscription.id,
      { invoice_now: false, prorate: false },
      { idempotencyKey: `cancel-unpaid:${userId}:${subscription.id}` }
    );
  } else if (isNonTerminalSubscription(subscription.status) && !subscription.cancel_at_period_end) {
    const periodEnd = subscriptionPeriodEnd(subscription) || 'unknown';
    subscription = await stripe.subscriptions.update(
      subscription.id,
      { cancel_at_period_end: true },
      { idempotencyKey: `cancel:${userId}:${subscription.id}:${periodEnd}` }
    );
  }

  await syncSubscription(subscription, { userId });
  return subscription;
}

export async function reserveCheckoutOperation(userId, operationId) {
  return rpc('reserve_checkout_operation', {
    p_user_id: userId,
    p_operation_id: operationId,
  });
}

export function billingConflict(result) {
  const reason = result?.reason || 'billing_conflict';
  throw new HttpError(409, 'BILLING_CONFLICT', `No pudimos vincular tu pago automáticamente (${reason}). Contacta a soporte.`);
}
