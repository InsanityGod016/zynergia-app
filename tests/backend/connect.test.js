import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const clients = vi.hoisted(() => ({
  retrieve: vi.fn(),
  retrieveCurrent: vi.fn(),
  ledgerRpc: vi.fn(),
}));

vi.mock('../../api/_lib/clients.js', () => ({
  getStripe: () => ({
    accounts: { retrieve: clients.retrieve, retrieveCurrent: clients.retrieveCurrent },
  }),
  getSupabaseAdmin: () => ({ rpc: clients.ledgerRpc }),
}));

import {
  CONNECT_COHORT,
  PARTNER_TRANSFER_PERCENT,
  connectCohortMetadata,
  partnerTransferData,
  requireConnectAdmin,
  subscriptionUsesConnectCohort,
} from '../../api/_lib/connect.js';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  clients.ledgerRpc.mockResolvedValue({ error: null });
  clients.retrieveCurrent.mockResolvedValue({ country: 'US' });
  process.env.STRIPE_PARTNER_ACCOUNT_ID = 'acct_partner123';
  process.env.STRIPE_PARTNER_EMAIL = 'partner@example.com';
  process.env.STRIPE_PLATFORM_COUNTRY = 'US';
  process.env.STRIPE_PARTNER_COUNTRY = 'MX';
  process.env.STRIPE_CONNECT_REVERSALS_READY = 'true';
  process.env.STRIPE_CONNECT_EFFECTIVE_AT = '2026-09-01T06:00:00.000Z';
  process.env.CONNECT_ADMIN_SECRET = 'a'.repeat(32);
});

afterEach(() => {
  process.env = { ...originalEnv };
});

test('sends exactly 20 percent to the configured ready partner account', async () => {
  clients.retrieve.mockResolvedValue({
    id: 'acct_partner123',
    email: 'partner@example.com',
    country: 'MX',
    metadata: { role: 'zynergia_partner' },
    details_submitted: true,
    payouts_enabled: true,
    capabilities: { transfers: 'active' },
    requirements: { currently_due: [], disabled_reason: null },
  });

  await expect(partnerTransferData()).resolves.toEqual({
    destination: 'acct_partner123',
    amount_percent: 20,
  });
  expect(PARTNER_TRANSFER_PERCENT).toBe(20);
  expect(clients.retrieve).toHaveBeenCalledWith('acct_partner123');
});

test('only explicitly tagged subscriptions created after the cutoff belong to Connect', () => {
  const metadata = connectCohortMetadata(new Date('2026-09-01T06:00:01.000Z'));
  expect(metadata).toEqual({
    zynergia_connect_cohort: CONNECT_COHORT,
    zynergia_connect_effective_at: '2026-09-01T06:00:00.000Z',
    zynergia_partner_share_percent: '20',
  });
  expect(subscriptionUsesConnectCohort({ metadata: {}, created: 1 })).toBe(false);
  expect(subscriptionUsesConnectCohort({
    created: Math.floor(Date.parse('2026-09-01T06:00:01.000Z') / 1000),
    metadata,
    transfer_data: { destination: 'acct_partner123', amount_percent: 20 },
  })).toBe(true);
  expect(() => subscriptionUsesConnectCohort({
    created: Math.floor(Date.parse('2026-09-01T05:59:59.000Z') / 1000),
    metadata,
    transfer_data: { destination: 'acct_partner123', amount_percent: 20 },
  })).toThrow(/anterior al corte/);

  expect(() => subscriptionUsesConnectCohort({
    created: Math.floor(Date.parse('2026-09-01T06:00:01.000Z') / 1000),
    metadata,
    transfer_data: { destination: 'acct_wrong', amount_percent: 20 },
  })).toThrow(/cohorte 80\/20/);
});

test('fails closed before contacting Stripe while reversal controls are disabled', async () => {
  process.env.STRIPE_CONNECT_REVERSALS_READY = 'false';

  await expect(partnerTransferData()).rejects.toMatchObject({
    status: 503,
    code: 'CONNECT_REVERSALS_NOT_READY',
  });
  expect(clients.retrieve).not.toHaveBeenCalled();
});

test.each([
  { details_submitted: false, payouts_enabled: true, capabilities: { transfers: 'active' }, requirements: {} },
  { details_submitted: true, payouts_enabled: false, capabilities: { transfers: 'active' }, requirements: {} },
  { details_submitted: true, payouts_enabled: true, capabilities: { transfers: 'pending' }, requirements: {} },
  { details_submitted: true, payouts_enabled: true, capabilities: { transfers: 'active' }, requirements: { currently_due: ['external_account'] } },
  { details_submitted: true, payouts_enabled: true, capabilities: { transfers: 'active' }, requirements: { eventually_due: ['individual.verification.document'] } },
  { details_submitted: true, payouts_enabled: true, capabilities: { transfers: 'active' }, requirements: { past_due: ['individual.verification.document'] } },
  { details_submitted: true, payouts_enabled: true, capabilities: { transfers: 'active' }, requirements: { pending_verification: ['individual.verification.document'] } },
  { details_submitted: true, payouts_enabled: true, capabilities: { transfers: 'active' }, requirements: { disabled_reason: 'requirements.past_due' } },
])('refuses a connected account that is not fully ready', async (account) => {
  clients.retrieve.mockResolvedValue({
    id: 'acct_partner123',
    email: 'partner@example.com',
    country: 'MX',
    metadata: { role: 'zynergia_partner' },
    ...account,
  });

  await expect(partnerTransferData()).rejects.toMatchObject({
    status: 503,
    code: 'CONNECT_ACCOUNT_NOT_READY',
  });
});

test('refuses an unreviewed platform-to-partner country route', async () => {
  clients.retrieve.mockResolvedValue({
    id: 'acct_partner123',
    email: 'partner@example.com',
    country: 'CO',
    metadata: { role: 'zynergia_partner' },
    details_submitted: true,
    payouts_enabled: true,
    capabilities: { transfers: 'active' },
    requirements: { currently_due: [], disabled_reason: null },
  });

  await expect(partnerTransferData()).rejects.toMatchObject({
    status: 503,
    code: 'CONNECT_COUNTRY_MISMATCH',
  });
});

test('refuses a ready account whose approved identity does not match', async () => {
  clients.retrieve.mockResolvedValue({
    id: 'acct_partner123',
    email: 'another@example.com',
    country: 'MX',
    metadata: { role: 'zynergia_partner' },
    details_submitted: true,
    payouts_enabled: true,
    capabilities: { transfers: 'active' },
    requirements: { currently_due: [], disabled_reason: null },
  });

  await expect(partnerTransferData()).rejects.toMatchObject({
    status: 503,
    code: 'CONNECT_ACCOUNT_IDENTITY_MISMATCH',
  });
});

test('pauses new checkout while any Connect ledger entry is unresolved', async () => {
  clients.ledgerRpc.mockResolvedValue({ error: new Error('stripe_connect_ledger_unhealthy') });

  await expect(partnerTransferData()).rejects.toMatchObject({
    status: 503,
    code: 'CONNECT_LEDGER_UNHEALTHY',
  });
  expect(clients.retrieve).not.toHaveBeenCalled();
});

test('requires a constant-time bearer secret for the onboarding endpoint', () => {
  expect(() => requireConnectAdmin({ headers: { authorization: `Bearer ${'a'.repeat(32)}` } }))
    .not.toThrow();
  expect(() => requireConnectAdmin({ headers: { authorization: `Bearer ${'b'.repeat(32)}` } }))
    .toThrow(expect.objectContaining({ status: 401, code: 'INVALID_CONNECT_ADMIN_SECRET' }));
});
