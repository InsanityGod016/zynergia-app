import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
  reconcileLegacySubscriptions,
  requireLegacyReconciliationAdmin,
} from '../../api/_lib/legacy-reconciliation.js';

const originalEnv = { ...process.env };
const userA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function subscription(id, customer, price = 'price_monthly', status = 'active', extraItems = []) {
  return {
    id,
    customer,
    status,
    items: { data: [{ price: { id: price } }, ...extraItems] },
  };
}

function adminWith(users, billingRows = []) {
  return {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users }, error: null }),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn().mockResolvedValue({ data: billingRows, error: null }),
        })),
      })),
    })),
  };
}

function stripeWith(pages, customers, events = []) {
  return {
    subscriptions: {
      list: vi.fn().mockImplementation(async (params) => {
        const index = params.starting_after ? 1 : 0;
        return pages[index];
      }),
      update: vi.fn().mockImplementation(async () => {
        events.push('subscription-metadata');
        return {};
      }),
    },
    customers: {
      retrieve: vi.fn().mockImplementation(async (id) => customers[id]),
      update: vi.fn().mockImplementation(async () => {
        events.push('customer-metadata');
        return {};
      }),
    },
  };
}

beforeEach(() => {
  process.env.STRIPE_MONTHLY_PRICE_ID = 'price_monthly';
  delete process.env.STRIPE_ANNUAL_PRICE_ID;
  delete process.env.STRIPE_LEGACY_PRICE_IDS;
  process.env.LEGACY_RECONCILIATION_ENABLED = 'true';
  process.env.LEGACY_RECONCILIATION_SECRET = 'a'.repeat(32);
});

afterEach(() => {
  process.env = { ...originalEnv };
});

test('requires an explicitly enabled constant-time bearer secret', () => {
  const request = { headers: { authorization: `Bearer ${'a'.repeat(32)}` } };
  expect(() => requireLegacyReconciliationAdmin(request)).not.toThrow();

  expect(() => requireLegacyReconciliationAdmin({
    headers: { authorization: `Bearer ${'b'.repeat(32)}` },
  })).toThrow(expect.objectContaining({ status: 401, code: 'INVALID_LEGACY_RECONCILIATION_SECRET' }));

  process.env.LEGACY_RECONCILIATION_ENABLED = 'false';
  expect(() => requireLegacyReconciliationAdmin(request)).toThrow(
    expect.objectContaining({ status: 404, code: 'LEGACY_RECONCILIATION_DISABLED' })
  );
});

test('finishes pagination, syncs exact eligible matches, then attaches metadata idempotently', async () => {
  const events = [];
  const subA = subscription('sub_a', 'cus_a');
  const subB = subscription('sub_b', 'cus_b');
  const multiItem = subscription(
    'sub_multi',
    'cus_multi',
    'price_monthly',
    'active',
    [{ price: { id: 'price_other' } }]
  );
  const terminal = subscription('sub_terminal', 'cus_terminal', 'price_monthly', 'canceled');
  const stripe = stripeWith(
    [
      { data: [subA], has_more: true },
      { data: [subB, multiItem, terminal], has_more: false },
    ],
    {
      cus_a: { id: 'cus_a', email: ' One@Example.com ', metadata: {} },
      cus_b: { id: 'cus_b', email: 'two@example.com', metadata: {} },
    },
    events
  );
  const admin = adminWith([
    { id: userA, email: 'one@example.com', email_confirmed_at: '2026-01-01' },
    { id: userB, email: 'TWO@example.com', email_confirmed_at: '2026-01-01' },
  ]);
  const sync = vi.fn().mockImplementation(async (item) => {
    events.push(`sync:${item.id}`);
    return {
      status: 'synced',
      stripe_customer_id: item.customer,
      stripe_subscription_id: item.id,
    };
  });

  const summary = await reconcileLegacySubscriptions({ stripe, admin, sync });

  expect(summary).toEqual({
    scanned: 4,
    eligible: 2,
    reconciled: 2,
    skipped: 2,
    failed: 0,
    reasons: {
      not_exact_single_allowed_price: 1,
      terminal_subscription: 1,
    },
  });
  expect(stripe.subscriptions.list).toHaveBeenNthCalledWith(1, {
    price: 'price_monthly',
    status: 'all',
    limit: 100,
  });
  expect(stripe.subscriptions.list).toHaveBeenNthCalledWith(2, {
    price: 'price_monthly',
    status: 'all',
    limit: 100,
    starting_after: 'sub_a',
  });
  expect(sync).toHaveBeenCalledWith(subA, { userId: userA, email: 'one@example.com' });
  expect(events.indexOf('sync:sub_a')).toBeLessThan(events.indexOf('customer-metadata'));
  expect(stripe.customers.update).toHaveBeenCalledWith(
    'cus_a',
    { metadata: { supabase_user_id: userA } },
    { idempotencyKey: `legacy-reconcile:customer:cus_a:${userA}` }
  );

  const repeated = await reconcileLegacySubscriptions({ stripe, admin, sync });
  expect(repeated).toEqual(summary);
  expect(stripe.customers.update).toHaveBeenNthCalledWith(
    3,
    'cus_a',
    { metadata: { supabase_user_id: userA } },
    { idempotencyKey: `legacy-reconcile:customer:cus_a:${userA}` }
  );
});

test('never merges ambiguous Stripe accounts, Supabase users, metadata, or billing owners', async () => {
  const subscriptions = [
    subscription('sub_same_1', 'cus_same_1'),
    subscription('sub_same_2', 'cus_same_2'),
    subscription('sub_duplicate_user', 'cus_duplicate_user'),
    {
      ...subscription('sub_metadata', 'cus_metadata'),
      metadata: { supabase_user_id: userB },
    },
    subscription('sub_billing_owner', 'cus_billing_owner'),
  ];
  const stripe = stripeWith(
    [{ data: subscriptions, has_more: false }],
    {
      cus_same_1: { id: 'cus_same_1', email: 'same@example.com', metadata: {} },
      cus_same_2: { id: 'cus_same_2', email: 'same@example.com', metadata: {} },
      cus_duplicate_user: { id: 'cus_duplicate_user', email: 'duplicate@example.com', metadata: {} },
      cus_metadata: { id: 'cus_metadata', email: 'metadata@example.com', metadata: {} },
      cus_billing_owner: { id: 'cus_billing_owner', email: 'billing@example.com', metadata: {} },
    }
  );
  const admin = adminWith([
    { id: userA, email: 'same@example.com', email_confirmed_at: '2026-01-01' },
    { id: userA, email: 'duplicate@example.com', email_confirmed_at: '2026-01-01' },
    { id: userB, email: 'duplicate@example.com', email_confirmed_at: '2026-01-01' },
    { id: userA, email: 'metadata@example.com', email_confirmed_at: '2026-01-01' },
    { id: userA, email: 'billing@example.com', email_confirmed_at: '2026-01-01' },
  ], [{
    id: 'billing-row',
    user_id: userB,
    stripe_customer_id: 'cus_billing_owner',
    stripe_subscription_id: 'sub_billing_owner',
    claim_email: null,
    subscription_status: 'active',
    anonymized_at: null,
  }]);
  const sync = vi.fn();

  const summary = await reconcileLegacySubscriptions({ stripe, admin, sync });

  expect(summary.reconciled).toBe(0);
  expect(summary.skipped).toBe(5);
  expect(summary.reasons).toEqual({
    multiple_eligible_stripe_accounts: 2,
    multiple_verified_supabase_users: 1,
    stripe_metadata_owner_mismatch: 1,
    billing_owned_by_other_user: 1,
  });
  expect(sync).not.toHaveBeenCalled();
  expect(stripe.customers.update).not.toHaveBeenCalled();
  expect(stripe.subscriptions.update).not.toHaveBeenCalled();
});

test('does not attach Stripe ownership metadata when the database sync fails', async () => {
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  const stripe = stripeWith(
    [{ data: [subscription('sub_a', 'cus_a')], has_more: false }],
    { cus_a: { id: 'cus_a', email: 'one@example.com', metadata: {} } }
  );
  const admin = adminWith([
    { id: userA, email: 'one@example.com', email_confirmed_at: '2026-01-01' },
  ]);

  const summary = await reconcileLegacySubscriptions({
    stripe,
    admin,
    sync: vi.fn().mockRejectedValue(new Error('one@example.com cus_a sub_a')),
  });

  expect(summary.failed).toBe(1);
  expect(summary.reasons).toEqual({ reconciliation_failed: 1 });
  expect(errorLog).toHaveBeenCalledWith('[legacy-reconciliation:item] reconciliation_failed');
  expect(stripe.customers.update).not.toHaveBeenCalled();
  expect(stripe.subscriptions.update).not.toHaveBeenCalled();
  errorLog.mockRestore();
});

test('fails before any sync when Stripe pagination cannot advance', async () => {
  const stripe = stripeWith(
    [{ data: [], has_more: true }],
    {}
  );
  const sync = vi.fn();

  await expect(reconcileLegacySubscriptions({
    stripe,
    admin: adminWith([]),
    sync,
  })).rejects.toThrow('stripe_subscription_pagination_invalid');
  expect(sync).not.toHaveBeenCalled();
});

test('the administrative endpoint is POST-only and returns aggregate data', async () => {
  const endpoint = await readFile(
    new URL('../../api/admin/reconcile-legacy.js', import.meta.url),
    'utf8'
  );

  expect(endpoint).toMatch(/methods: \['POST'\]/);
  expect(endpoint).toMatch(/requireLegacyReconciliationAdmin\(req\)/);
  expect(endpoint).toMatch(/summary\.reconciled === summary\.eligible/);
  expect(endpoint).toMatch(/!summary\.reasons\.not_exact_single_allowed_price/);
  expect(endpoint).toMatch(/summary\.failed > 0 \? 500 : 200/);
  expect(endpoint).not.toMatch(/email|customerId|subscriptionId/);
});
