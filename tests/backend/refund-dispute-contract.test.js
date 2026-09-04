import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('webhook resolves a Charge to a canonical Zynergia subscription', async () => {
  const webhook = await source('api/stripe/webhook.js');

  expect(webhook).toMatch(/charges\.retrieve\(chargeId\)/);
  expect(webhook).toMatch(/invoicePayments\.list/);
  expect(webhook).toMatch(/invoices\.retrieve\(invoiceId\)/);
  expect(webhook).toMatch(/subscriptions\.retrieve\(subscriptionId\)/);
  expect(webhook).toMatch(/priceIds\.has\(stripePriceId\(subscription\)\)/);
  expect(webhook).toMatch(/disputes\.retrieve\(event\.data\.object\.id\)/);
  expect(webhook).toMatch(/disputeAccessBlockReason\(dispute\.status\)/);
  expect(webhook).not.toMatch(/event\.data\.object\.customer/);
});

test('refund and dispute decisions are isolated and ordered in SQL', async () => {
  const migration = await source(
    'supabase/migrations/202608190003_stripe_refunds_and_disputes.sql'
  );

  expect(migration).toMatch(/create table if not exists public\.stripe_access_incidents/);
  expect(migration).toMatch(/alter table public\.stripe_access_incidents enable row level security/);
  expect(migration).toMatch(/unique \(stripe_customer_id, incident_key\)/);
  expect(migration).toMatch(/last_event_created_at timestamptz not null/);
  expect(migration).toMatch(/excluded\.last_event_created_at > public\.stripe_access_incidents\.last_event_created_at/);
  expect(migration).toMatch(/excluded\.status = 'blocking'/);
  expect(migration).toMatch(/incident_kind = 'full_refund'[\s\S]+last_event_created_at < p_event_created_at/);
  expect(migration).toMatch(/access_blocked_reason is not null[\s\S]+v_status := 'revoked'/);
});

test('Stripe webhook inventory includes refunds and dispute transitions', async () => {
  const webhook = await source('api/stripe/webhook.js');
  const docs = await source('supabase/README.md');

  for (const event of [
    'charge.refunded',
    'charge.updated',
    'refund.created',
    'refund.updated',
    'refund.failed',
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.closed',
    'charge.dispute.funds_withdrawn',
    'charge.dispute.funds_reinstated',
    'transfer.created',
    'transfer.updated',
    'transfer.reversed',
  ]) {
    expect(webhook).toContain(`'${event}'`);
    expect(docs).toContain(`\`${event}\``);
  }
});

test('refund and dispute access is blocked before a financial clawback can fail', async () => {
  const webhook = await source('api/stripe/webhook.js');
  const refundHandler = webhook.match(/async function processRefund[\s\S]*?\n}/)?.[0] || '';
  const disputeHandler = webhook.match(/async function processDispute[\s\S]*?\n}/)?.[0] || '';

  expect(refundHandler.indexOf('recordChargeIncident')).toBeGreaterThan(-1);
  expect(refundHandler.indexOf('recordChargeIncident')).toBeLessThan(
    refundHandler.indexOf('reconcileStripeConnectCharge')
  );
  expect(disputeHandler.indexOf('recordChargeIncident')).toBeGreaterThan(-1);
  expect(disputeHandler.indexOf('recordChargeIncident')).toBeLessThan(
    disputeHandler.indexOf('reconcileStripeConnectCharge')
  );
});
