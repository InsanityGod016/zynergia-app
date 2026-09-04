import { beforeEach, expect, test, vi } from 'vitest';

const stripe = vi.hoisted(() => ({
  retrieve: vi.fn(),
  update: vi.fn(),
  cancel: vi.fn(),
}));
const supabase = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('../../api/_lib/clients.js', () => ({
  allowedPriceIds: () => new Set(['price_monthly']),
  getStripe: () => ({
    subscriptions: { retrieve: stripe.retrieve, update: stripe.update, cancel: stripe.cancel },
  }),
  getSupabaseAdmin: () => supabase,
  graceDays: () => 3,
  newSignupsEnabled: () => false,
}));

import {
  cancelSubscriptionAtPeriodEnd,
  syncBillingAccount,
} from '../../api/_lib/billing-service.js';

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const activeSubscription = {
  id: 'sub_123',
  customer: 'cus_123',
  status: 'active',
  cancel_at_period_end: false,
  current_period_end: 1_800_000_000,
  metadata: { supabase_user_id: userId },
  items: { data: [{ price: { id: 'price_monthly' } }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  supabase.rpc.mockResolvedValue({ data: {}, error: null });
});

test('cancels only the authenticated account renewal and preserves the paid period', async () => {
  const canceled = { ...activeSubscription, cancel_at_period_end: true };
  stripe.retrieve.mockResolvedValue(activeSubscription);
  stripe.update.mockResolvedValue(canceled);

  await cancelSubscriptionAtPeriodEnd({
    userId,
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
  });

  expect(stripe.update).toHaveBeenCalledWith(
    'sub_123',
    { cancel_at_period_end: true },
    { idempotencyKey: `cancel:${userId}:sub_123:1800000000` },
  );
  expect(supabase.rpc).toHaveBeenCalledWith(
    'sync_stripe_billing_account',
    expect.objectContaining({
      p_user_id: userId,
      p_current_period_end: new Date(1_800_000_000 * 1000).toISOString(),
      p_cancel_at_period_end: true,
    }),
  );
});

test('a repeated cancellation is idempotent', async () => {
  stripe.retrieve.mockResolvedValue({ ...activeSubscription, cancel_at_period_end: true });

  await cancelSubscriptionAtPeriodEnd({
    userId,
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
  });

  expect(stripe.update).not.toHaveBeenCalled();
  expect(supabase.rpc).toHaveBeenCalledOnce();
});

test('a failed renewal cancels immediately without proration or future retries', async () => {
  const pastDue = { ...activeSubscription, status: 'past_due' };
  const canceled = { ...pastDue, status: 'canceled', cancel_at_period_end: false };
  stripe.retrieve.mockResolvedValue(pastDue);
  stripe.cancel.mockResolvedValue(canceled);

  await cancelSubscriptionAtPeriodEnd({
    userId,
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
  });

  expect(stripe.cancel).toHaveBeenCalledWith(
    'sub_123',
    { invoice_now: false, prorate: false },
    { idempotencyKey: `cancel-unpaid:${userId}:sub_123` },
  );
  expect(stripe.update).not.toHaveBeenCalled();
});

test('legacy reconciliation never invents a fresh grace period without a canonical event time', async () => {
  await syncBillingAccount({
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
    status: 'past_due',
  });

  expect(supabase.rpc).toHaveBeenLastCalledWith(
    'sync_stripe_billing_account',
    expect.objectContaining({ p_grace_until: null, p_event_created_at: null }),
  );

  await syncBillingAccount({
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
    status: 'past_due',
    eventCreatedAt: '2027-01-01T00:00:00.000Z',
  });

  expect(supabase.rpc).toHaveBeenLastCalledWith(
    'sync_stripe_billing_account',
    expect.objectContaining({
      p_grace_until: '2027-01-04T00:00:00.000Z',
      p_event_created_at: '2027-01-01T00:00:00.000Z',
    }),
  );
});

test('refuses a subscription owned by another account', async () => {
  stripe.retrieve.mockResolvedValue({
    ...activeSubscription,
    metadata: { supabase_user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
  });

  await expect(cancelSubscriptionAtPeriodEnd({
    userId,
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
  })).rejects.toMatchObject({ code: 'BILLING_CONFLICT' });
  expect(stripe.update).not.toHaveBeenCalled();
});

test('refuses to cancel another product on a shared Stripe Customer', async () => {
  stripe.retrieve.mockResolvedValue({
    ...activeSubscription,
    items: { data: [{ price: { id: 'price_other_product' } }] },
  });

  await expect(cancelSubscriptionAtPeriodEnd({
    userId,
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
  })).rejects.toMatchObject({ code: 'BILLING_CONFLICT' });
  expect(stripe.update).not.toHaveBeenCalled();
});
