import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accessSnapshot: vi.fn(),
  admin: { rpc: vi.fn() },
  authenticatedUser: vi.fn(),
  claimBillingForUser: vi.fn(),
  executeAccountDeletion: vi.fn(),
  requireFreshToken: vi.fn(),
  scheduleBillingDeletion: vi.fn(),
}));

vi.mock('../../api/_lib/account-deletion.js', () => ({
  executeAccountDeletion: mocks.executeAccountDeletion,
  scheduleBillingDeletion: mocks.scheduleBillingDeletion,
}));
vi.mock('../../api/_lib/billing-service.js', () => ({
  accessSnapshot: mocks.accessSnapshot,
  billingConflict: vi.fn(),
  claimBillingForUser: mocks.claimBillingForUser,
  refreshSubscription: vi.fn(),
}));
vi.mock('../../api/_lib/clients.js', () => ({
  authenticatedUser: mocks.authenticatedUser,
  getSupabaseAdmin: () => mocks.admin,
  requireFreshToken: mocks.requireFreshToken,
}));

import requestDeletion from '../../api/account/deletion-request.js';
import processDeletions from '../../api/account/process-deletions.js';

const operationId = '10000000-0000-4000-8000-000000000001';
const userId = '20000000-0000-4000-8000-000000000002';
const pendingRequest = {
  request_id: '30000000-0000-4000-8000-000000000003',
  operation_id: operationId,
  user_id: userId,
  stripe_customer_id: 'cus_zynergia',
  stripe_subscription_id: 'sub_zynergia',
  execute_at: '2099-01-01T00:00:00.000Z',
  should_schedule: true,
};

function response() {
  return {
    headersSent: false,
    statusCode: 0,
    body: null,
    setHeader() {},
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; this.headersSent = true; return this; },
    end() { this.headersSent = true; },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'account-deletion-test-secret';
  mocks.authenticatedUser.mockResolvedValue({
    admin: mocks.admin,
    token: {},
    user: { id: userId, email: 'person@example.com', email_confirmed_at: '2026-01-01' },
  });
  mocks.claimBillingForUser.mockResolvedValue({ status: 'none' });
  mocks.accessSnapshot.mockResolvedValue(null);
});

test('an immediate deletion stays immediate after an intermediate failure and worker retry', async () => {
  let persistedExecuteAt = null;
  mocks.admin.rpc.mockImplementation(async (name, params) => {
    if (name === 'begin_account_deletion') return { data: pendingRequest, error: null };
    if (name === 'schedule_account_deletion') {
      persistedExecuteAt = params.p_execute_at;
      return { data: null, error: null };
    }
    if (name === 'claim_due_account_deletions') {
      return {
        data: [{
          ...pendingRequest,
          execute_at: persistedExecuteAt,
          mode: new Date(persistedExecuteAt).getTime() <= Date.now() ? 'execute' : 'schedule',
        }],
        error: null,
      };
    }
    return { data: null, error: null };
  });
  mocks.executeAccountDeletion
    .mockRejectedValueOnce(new Error('intermediate_failure'))
    .mockResolvedValueOnce(undefined);
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    const firstResponse = response();
    await requestDeletion({
      method: 'POST',
      headers: {},
      body: { confirmation: 'DELETE', operation_id: operationId, delete_now: true },
    }, firstResponse);

    expect(firstResponse.statusCode).toBe(500);
    expect(new Date(persistedExecuteAt).getTime()).toBeLessThanOrEqual(Date.now());
    const persistCall = mocks.admin.rpc.mock.calls.find(([name]) => name === 'schedule_account_deletion');
    expect(persistCall?.[1]).toEqual({
      p_request_id: pendingRequest.request_id,
      p_execute_at: persistedExecuteAt,
    });
    expect(mocks.executeAccountDeletion.mock.calls[0][1].execute_at).toBe(persistedExecuteAt);
    expect(mocks.admin.rpc).toHaveBeenCalledWith('fail_account_deletion', expect.any(Object));

    const retryResponse = response();
    await processDeletions({
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }, retryResponse);

    expect(retryResponse.statusCode).toBe(200);
    expect(retryResponse.body).toEqual({ scheduled: 0, completed: 1, failed: 0 });
    expect(mocks.executeAccountDeletion).toHaveBeenCalledTimes(2);
    expect(mocks.scheduleBillingDeletion).not.toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
  }
});
