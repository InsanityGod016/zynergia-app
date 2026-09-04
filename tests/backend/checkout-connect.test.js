import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectCohortMetadata: vi.fn(),
  createCheckout: vi.fn(),
  partnerTransferData: vi.fn(),
  reserveCheckoutOperation: vi.fn(),
  validatedPriceForPlan: vi.fn(),
}));

vi.mock('../../api/_lib/clients.js', () => ({
  authenticatedUser: vi.fn(async () => ({
    user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'persona@example.com' },
  })),
  appUrl: (path) => new URL(path, 'https://zynergia.pro').toString(),
  getStripe: () => ({ checkout: { sessions: { create: mocks.createCheckout } } }),
  newSignupsEnabled: () => true,
  validatedPriceForPlan: mocks.validatedPriceForPlan,
}));

vi.mock('../../api/_lib/billing-service.js', () => ({
  accessSnapshot: vi.fn(async () => ({
    billing: { subscription_status: 'none' },
    access: { entitled: false, state: 'inactive' },
  })),
  billingConflict: vi.fn(),
  claimBillingForUser: vi.fn(async () => ({ status: 'not_found' })),
  ensureStripeCustomer: vi.fn(async () => 'cus_persona'),
  refreshSubscription: vi.fn(),
  reserveCheckoutOperation: mocks.reserveCheckoutOperation,
}));

vi.mock('../../api/_lib/connect.js', () => ({
  connectCohortMetadata: mocks.connectCohortMetadata,
  partnerTransferData: mocks.partnerTransferData,
}));

import handler from '../../api/billing/checkout.js';
import { HttpError } from '../../api/_lib/http.js';

function response() {
  return {
    headersSent: false,
    headers: {},
    statusCode: 0,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; this.headersSent = true; return this; },
    end() { this.headersSent = true; },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.validatedPriceForPlan.mockResolvedValue('price_monthly');
  mocks.connectCohortMetadata.mockReturnValue({
    zynergia_connect_cohort: 'zynergia_80_20_2026_09_01',
    zynergia_connect_effective_at: '2026-09-01T06:00:00.000Z',
    zynergia_partner_share_percent: '20',
  });
  mocks.partnerTransferData.mockResolvedValue({
    destination: 'acct_partner123',
    amount_percent: 20,
  });
  mocks.reserveCheckoutOperation.mockResolvedValue({ status: 'reserved' });
  mocks.createCheckout.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });
});

test('creates a recurring Checkout whose invoices transfer exactly 20 percent to the partner', async () => {
  const operationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const res = response();

  await handler({
    method: 'POST',
    headers: {},
    body: { plan: 'monthly', operation_id: operationId },
  }, res);

  expect(mocks.createCheckout).toHaveBeenCalledWith(
    expect.objectContaining({
      mode: 'subscription',
      customer: 'cus_persona',
      line_items: [{ price: 'price_monthly', quantity: 1 }],
      subscription_data: {
        metadata: {
          supabase_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          operation_id: operationId,
          plan: 'monthly',
          zynergia_connect_cohort: 'zynergia_80_20_2026_09_01',
          zynergia_connect_effective_at: '2026-09-01T06:00:00.000Z',
          zynergia_partner_share_percent: '20',
        },
        transfer_data: {
          destination: 'acct_partner123',
          amount_percent: 20,
        },
      },
    }),
    { idempotencyKey: `checkout:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:${operationId}` },
  );
  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ url: 'https://checkout.stripe.com/session' });
});

test('never reaches Connect or Checkout when the configured Stripe Price is not 17 USD monthly', async () => {
  mocks.validatedPriceForPlan.mockRejectedValue(
    new HttpError(500, 'INVALID_MONTHLY_PRICE_CONFIGURATION', 'Precio inválido')
  );
  const res = response();

  await handler({
    method: 'POST',
    headers: {},
    body: {
      plan: 'monthly',
      operation_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
  }, res);

  expect(mocks.partnerTransferData).not.toHaveBeenCalled();
  expect(mocks.createCheckout).not.toHaveBeenCalled();
  expect(res.body).toMatchObject({ code: 'INVALID_MONTHLY_PRICE_CONFIGURATION' });
});

test('never creates Checkout when the Connect preflight fails', async () => {
  mocks.partnerTransferData.mockRejectedValue(
    new HttpError(503, 'CONNECT_ACCOUNT_NOT_READY', 'Connect no listo')
  );
  const res = response();

  await handler({
    method: 'POST',
    headers: {},
    body: {
      plan: 'monthly',
      operation_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
  }, res);

  expect(mocks.createCheckout).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(503);
  expect(res.body).toMatchObject({ code: 'CONNECT_ACCOUNT_NOT_READY' });
});

test('never retries a failed Connect Checkout without the partner transfer', async () => {
  mocks.createCheckout.mockRejectedValue(new Error('destination account disabled'));
  const res = response();

  await handler({
    method: 'POST',
    headers: {},
    body: {
      plan: 'monthly',
      operation_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
  }, res);

  expect(mocks.createCheckout).toHaveBeenCalledOnce();
  expect(mocks.createCheckout.mock.calls[0][0].subscription_data.transfer_data)
    .toEqual({ destination: 'acct_partner123', amount_percent: 20 });
  expect(res.statusCode).toBe(500);
});
