import { expect, test } from 'vitest';

import {
  chooseLegacySubscription,
  disputeAccessBlockReason,
  effectiveAccess,
  fullRefundBlocksCurrentSubscription,
  invoiceSubscriptionId,
  isFullRefund,
  stripeMetadataOwnership,
  stripePriceId,
  subscriptionPeriodEnd,
} from '../../api/_lib/billing-state.js';
import { publicBillingStatus } from '../../api/_lib/billing-service.js';
import { assertMonthlyPrice, requireFreshToken } from '../../api/_lib/clients.js';

function unsignedToken(payload) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
}

test('reads Stripe subscription fields across supported API shapes', () => {
  const legacy = {
    current_period_end: 100,
    items: { data: [{ price: { id: 'price_legacy' } }] },
  };
  const current = {
    items: {
      data: [{
        current_period_end: 200,
        pricing: { price_details: { price: 'price_current' } },
      }],
    },
  };

  expect(stripePriceId(legacy)).toBe('price_legacy');
  expect(stripePriceId(current)).toBe('price_current');
  expect(subscriptionPeriodEnd(legacy)).toBe(100);
  expect(subscriptionPeriodEnd(current)).toBe(200);
  expect(subscriptionPeriodEnd({ current_period_end: null, items: { data: [] } })).toBeNull();
});

test('reads invoice subscription IDs across Stripe API shapes', () => {
  expect(invoiceSubscriptionId({ subscription: 'sub_legacy' })).toBe('sub_legacy');
  expect(
    invoiceSubscriptionId({ parent: { subscription_details: { subscription: 'sub_current' } } }),
  ).toBe('sub_current');
});

test('only a total refund blocks access', () => {
  expect(isFullRefund({ amount: 1000, amount_refunded: 1000 })).toBe(true);
  expect(isFullRefund({ amount: 1000, amount_refunded: 1200 })).toBe(true);
  expect(isFullRefund({ amount: 1000, amount_refunded: 999 })).toBe(false);
  expect(isFullRefund({ amount: 0, amount_refunded: 0 })).toBe(false);
});

test('a delayed refund of an older invoice does not revoke a newer paid period', () => {
  const fullRefund = { amount: 1700, amount_refunded: 1700 };
  expect(fullRefundBlocksCurrentSubscription(
    fullRefund,
    { latest_invoice: 'in_current' },
    'in_old',
  )).toBe(false);
  expect(fullRefundBlocksCurrentSubscription(
    fullRefund,
    { latest_invoice: { id: 'in_current' } },
    'in_current',
  )).toBe(true);
  expect(fullRefundBlocksCurrentSubscription(
    fullRefund,
    {},
    'in_current',
  )).toBe(true);
});

test('only financially withdrawn disputes block access', () => {
  expect(disputeAccessBlockReason('needs_response')).toBe('dispute_open');
  expect(disputeAccessBlockReason('under_review')).toBe('dispute_open');
  expect(disputeAccessBlockReason('lost')).toBe('dispute_lost');
  expect(disputeAccessBlockReason('won')).toBeNull();
  expect(disputeAccessBlockReason('prevented')).toBeNull();
  expect(disputeAccessBlockReason('warning_needs_response')).toBeNull();
  expect(disputeAccessBlockReason('warning_under_review')).toBeNull();
  expect(disputeAccessBlockReason('warning_closed')).toBeNull();
  expect(disputeAccessBlockReason('unknown_future_status')).toBe('dispute_open');
});

test('legacy email claiming cannot override Stripe ownership metadata', () => {
  const attacker = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const victim = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  expect(stripeMetadataOwnership([{}, null], attacker)).toBe('unbound');
  expect(stripeMetadataOwnership([
    { metadata: { supabase_user_id: attacker } },
    { metadata: { user_id: attacker } },
  ], attacker)).toBe('owned');
  expect(stripeMetadataOwnership([
    { metadata: { supabase_user_id: victim } },
    { metadata: {} },
  ], attacker)).toBe('conflict');
  expect(stripeMetadataOwnership([
    { metadata: { supabase_user_id: attacker, user_id: victim } },
  ], attacker)).toBe('conflict');
});

test('legacy discovery refuses ambiguous active subscriptions', () => {
  const selected = chooseLegacySubscription([
    { id: 'sub_1', status: 'active' },
    { id: 'sub_2', status: 'past_due' },
  ]);

  expect(selected.subscription).toBeNull();
  expect(selected.conflict).toBe('multiple_current_subscriptions');
});

test('legacy discovery selects the newest terminal subscription', () => {
  const selected = chooseLegacySubscription([
    { id: 'sub_old', status: 'canceled', created: 10 },
    { id: 'sub_new', status: 'canceled', created: 20 },
  ]);

  expect(selected.conflict).toBeNull();
  expect(selected.subscription.id).toBe('sub_new');
});

test('effective access excludes expired and revoked grants', () => {
  const result = effectiveAccess([
    { status: 'active', access_until: '2026-01-01T00:00:00Z', revoked_at: null },
    { status: 'active', access_until: '2030-01-01T00:00:00Z', revoked_at: '2025-01-01T00:00:00Z' },
    { status: 'grace', access_until: '2028-01-01T00:00:00Z', revoked_at: null },
  ], new Date('2027-01-01T00:00:00Z'));

  expect(result).toEqual({
    entitled: true,
    state: 'grace',
    accessUntil: '2028-01-01T00:00:00Z',
  });
});

test('public billing status exposes only the camelCase client contract', () => {
  const result = publicBillingStatus({
    billing: {
      subscription_status: 'active',
      entitlement_eligible: true,
      current_period_end: '2027-02-01T00:00:00Z',
      grace_until: null,
      scheduled_cancel_at: '2027-01-20T00:00:00Z',
      cancel_at_period_end: true,
      stripe_customer_id: 'cus_customer',
    },
    access: { entitled: true, state: 'active' },
  });

  expect(result).toEqual({
    state: 'active',
    subscriptionStatus: 'active',
    currentPeriodEnd: '2027-02-01T00:00:00Z',
    graceEndsAt: null,
    accessEndsAt: null,
    cancelAtPeriodEnd: true,
    deletionScheduledFor: null,
    canCancelSubscription: false,
    canUpdatePaymentMethod: true,
    canCheckout: false,
  });
});

test('validates the live monthly Price as active recurring 17 USD', () => {
  const price = {
    id: 'price_monthly',
    active: true,
    currency: 'usd',
    unit_amount: 1700,
    type: 'recurring',
    recurring: { interval: 'month', interval_count: 1 },
  };
  expect(assertMonthlyPrice(price, 'price_monthly')).toBe('price_monthly');

  for (const invalid of [
    { ...price, active: false },
    { ...price, currency: 'mxn' },
    { ...price, unit_amount: 1699 },
    { ...price, type: 'one_time', recurring: null },
    { ...price, recurring: { interval: 'year', interval_count: 1 } },
  ]) {
    expect(() => assertMonthlyPrice(invalid, 'price_monthly')).toThrow(
      expect.objectContaining({ code: 'INVALID_MONTHLY_PRICE_CONFIGURATION' })
    );
  }
});

test('payment recovery stays available for grace and past_due, but not unpaid', () => {
  for (const [subscriptionStatus, access] of [
    ['past_due', { entitled: true, state: 'grace' }],
    ['past_due', { entitled: false, state: 'inactive' }],
  ]) {
    const result = publicBillingStatus({
      billing: {
        stripe_customer_id: 'cus_customer',
        subscription_status: subscriptionStatus,
        entitlement_eligible: true,
      },
      access,
    });
    expect(result.canUpdatePaymentMethod).toBe(true);
  }

  const unpaid = publicBillingStatus({
    billing: {
      stripe_customer_id: 'cus_customer',
      subscription_status: 'unpaid',
      entitlement_eligible: true,
    },
    access: { entitled: false, state: 'inactive' },
  });
  expect(unpaid.canUpdatePaymentMethod).toBe(false);
});

test('nonterminal subscriptions can be canceled even after access is blocked', () => {
  const result = publicBillingStatus({
    billing: {
      stripe_customer_id: 'cus_customer',
      stripe_subscription_id: 'sub_customer',
      subscription_status: 'past_due',
      entitlement_eligible: true,
      cancel_at_period_end: false,
    },
    access: { entitled: false, state: 'inactive', access_until: null },
  });

  expect(result.canCancelSubscription).toBe(true);
});

test('new checkout remains fail-closed until inventory reconciliation enables it', () => {
  const previous = process.env.NEW_SIGNUPS_ENABLED;
  delete process.env.NEW_SIGNUPS_ENABLED;

  const snapshot = {
    billing: { subscription_status: 'canceled', entitlement_eligible: true },
    access: { entitled: false, state: 'inactive' },
  };
  expect(publicBillingStatus(snapshot).canCheckout).toBe(false);

  process.env.NEW_SIGNUPS_ENABLED = 'true';
  expect(publicBillingStatus(snapshot).canCheckout).toBe(true);

  if (previous === undefined) delete process.env.NEW_SIGNUPS_ENABLED;
  else process.env.NEW_SIGNUPS_ENABLED = previous;
});

test('manual access is exposed as complimentary without enabling checkout', () => {
  const result = publicBillingStatus({
    billing: null,
    access: { entitled: true, state: 'complimentary', access_until: null },
  });

  expect(result.state).toBe('complimentary');
  expect(result.canCheckout).toBe(false);
});

test('a manual complimentary grant remains authoritative over an old Stripe incident', () => {
  const result = publicBillingStatus({
    billing: {
      subscription_status: 'canceled',
      entitlement_eligible: true,
      access_blocked_reason: 'dispute_lost',
    },
    access: { entitled: true, state: 'complimentary', access_until: null },
  });

  expect(result.state).toBe('complimentary');
  expect(result.canCheckout).toBe(false);
});

test('Stripe status alone never grants access without a valid access grant', () => {
  const result = publicBillingStatus({
    billing: { subscription_status: 'active', entitlement_eligible: true },
    access: { entitled: false, state: 'inactive' },
  });

  expect(result.state).toBe('inactive');
  expect(result.canCheckout).toBe(false);
});

test('a pending account deletion prevents a second checkout', () => {
  const result = publicBillingStatus({
    billing: {
      subscription_status: 'active',
      entitlement_eligible: true,
      current_period_end: '2027-02-01T00:00:00Z',
      cancel_at_period_end: true,
    },
    access: { entitled: true, state: 'active' },
    deletion_scheduled_for: '2027-02-01T00:00:00Z',
  });

  expect(result.deletionScheduledFor).toBe('2027-02-01T00:00:00Z');
  expect(result.state).toBe('pending_deletion');
  expect(result.canCheckout).toBe(false);
});

test('refunds and disputes expose blocked states and never enable checkout', () => {
  const previous = process.env.NEW_SIGNUPS_ENABLED;
  process.env.NEW_SIGNUPS_ENABLED = 'true';

  for (const [reason, state] of [
    ['full_refund', 'refunded'],
    ['dispute_open', 'disputed'],
    ['dispute_lost', 'disputed'],
  ]) {
    const result = publicBillingStatus({
      billing: {
        subscription_status: 'active',
        entitlement_eligible: true,
        access_blocked_reason: reason,
      },
      access: { entitled: false, state: 'inactive' },
    });
    expect(result.state).toBe(state);
    expect(result.canCheckout).toBe(false);
  }

  if (previous === undefined) delete process.env.NEW_SIGNUPS_ENABLED;
  else process.env.NEW_SIGNUPS_ENABLED = previous;
});

test('account deletion freshness uses password AMR, not a refreshed token iat', () => {
  const now = Math.floor(Date.now() / 1000);

  expect(() => requireFreshToken(unsignedToken({
    iat: now,
    amr: [{ method: 'password', timestamp: now - 60 }],
  }))).not.toThrow();

  expect(() => requireFreshToken(unsignedToken({
    iat: now,
    amr: [{ method: 'password', timestamp: now - 3600 }],
  }))).toThrow(expect.objectContaining({ code: 'REAUTH_REQUIRED' }));

  expect(() => requireFreshToken(unsignedToken({ iat: now })))
    .toThrow(expect.objectContaining({ code: 'REAUTH_REQUIRED' }));
});
