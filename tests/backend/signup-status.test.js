import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectCohortMetadata: vi.fn(),
  newSignupsEnabled: vi.fn(),
  partnerTransferData: vi.fn(),
  validatedPriceForPlan: vi.fn(),
}));

vi.mock('../../api/_lib/clients.js', () => ({
  newSignupsEnabled: mocks.newSignupsEnabled,
  validatedPriceForPlan: mocks.validatedPriceForPlan,
}));

vi.mock('../../api/_lib/connect.js', () => ({
  connectCohortMetadata: mocks.connectCohortMetadata,
  partnerTransferData: mocks.partnerTransferData,
}));

import handler from '../../api/billing/signup-status.js';

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
  mocks.newSignupsEnabled.mockReturnValue(true);
  mocks.validatedPriceForPlan.mockResolvedValue('price_monthly');
  mocks.connectCohortMetadata.mockReturnValue({ zynergia_connect_cohort: 'cohort' });
  mocks.partnerTransferData.mockResolvedValue({ destination: 'acct_partner', amount_percent: 20 });
});

async function requestStatus() {
  const res = response();
  await handler({ method: 'GET', headers: {} }, res);
  expect(res.statusCode).toBe(200);
  expect(res.headers['Cache-Control']).toBe('no-store');
  return res.body;
}

test('stays closed without touching Stripe or Connect when the master flag is disabled', async () => {
  mocks.newSignupsEnabled.mockReturnValue(false);

  expect(await requestStatus()).toEqual({ enabled: false });
  expect(mocks.validatedPriceForPlan).not.toHaveBeenCalled();
  expect(mocks.connectCohortMetadata).not.toHaveBeenCalled();
  expect(mocks.partnerTransferData).not.toHaveBeenCalled();
});

test('fails closed when the monthly Price is invalid', async () => {
  mocks.validatedPriceForPlan.mockRejectedValue(new Error('price_123 belongs to private@example.com'));

  expect(await requestStatus()).toEqual({ enabled: false });
  expect(mocks.validatedPriceForPlan).toHaveBeenCalledWith('monthly');
  expect(mocks.partnerTransferData).not.toHaveBeenCalled();
});

test('fails closed without exposing details when the Connect preflight fails', async () => {
  mocks.partnerTransferData.mockRejectedValue(new Error('acct_secret for private@example.com is incomplete'));

  const body = await requestStatus();

  expect(body).toEqual({ enabled: false });
  expect(JSON.stringify(body)).not.toMatch(/acct_secret|private@example\.com|incomplete/);
});

test('opens registration only after Price, cohort, ledger and Connect checks pass', async () => {
  expect(await requestStatus()).toEqual({ enabled: true });
  expect(mocks.validatedPriceForPlan).toHaveBeenCalledWith('monthly');
  expect(mocks.connectCohortMetadata).toHaveBeenCalledOnce();
  expect(mocks.partnerTransferData).toHaveBeenCalledOnce();
});
