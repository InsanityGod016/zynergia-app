import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adminRpc: vi.fn(),
  chargeRetrieve: vi.fn(),
  invoicePaymentsList: vi.fn(),
  subscriptionRetrieve: vi.fn(),
}));

vi.mock('../../api/_lib/clients.js', () => ({
  allowedPriceIds: () => new Set(['price_zynergia']),
  getStripe: () => ({
    charges: { retrieve: mocks.chargeRetrieve },
    invoicePayments: { list: mocks.invoicePaymentsList },
    subscriptions: { retrieve: mocks.subscriptionRetrieve },
  }),
  getSupabaseAdmin: () => ({ rpc: mocks.adminRpc }),
  graceDays: () => 3,
  newSignupsEnabled: () => false,
}));

vi.mock('../../api/_lib/connect-ledger.js', () => ({
  reconcileStripeConnectCharge: vi.fn(),
}));

import { processEvent } from '../../api/stripe/webhook.js';

function event(type, object = { id: 'sub_other' }) {
  return {
    id: 'evt_test',
    type,
    created: 1_800_000_000,
    data: { object },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.adminRpc.mockResolvedValue({ data: null, error: null });
});

test('ignores subscriptions from another CoreFlowAI product', async () => {
  mocks.subscriptionRetrieve.mockResolvedValue({
    id: 'sub_other',
    customer: 'cus_shared',
    status: 'active',
    items: { data: [{ price: { id: 'price_other_product' } }] },
  });

  await processEvent(event('customer.subscription.updated'));

  expect(mocks.adminRpc).not.toHaveBeenCalled();
});

test('ignores non-subscription charges instead of retrying them forever', async () => {
  mocks.chargeRetrieve.mockResolvedValue({
    id: 'ch_other',
    customer: 'cus_shared',
    payment_intent: 'pi_other',
  });
  mocks.invoicePaymentsList.mockResolvedValue({ data: [], has_more: false });

  await processEvent(event('charge.succeeded', { id: 'ch_other' }));

  expect(mocks.adminRpc).not.toHaveBeenCalled();
});

test('ignores unrelated charge updates that do not belong to a Stripe Customer', async () => {
  mocks.chargeRetrieve.mockResolvedValue({
    id: 'ch_unrelated',
    customer: null,
    payment_intent: 'pi_unrelated',
  });

  await processEvent(event('charge.updated', { id: 'ch_unrelated' }));

  expect(mocks.invoicePaymentsList).not.toHaveBeenCalled();
  expect(mocks.adminRpc).not.toHaveBeenCalled();
});
