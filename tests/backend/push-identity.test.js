import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ authenticatedUser: vi.fn() }));

vi.mock('../../api/_lib/clients.js', () => ({ authenticatedUser: mocks.authenticatedUser }));

import handler from '../../api/notifications/identity.js';

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
  process.env.ONESIGNAL_APP_ID = '10000000-0000-4000-8000-000000000001';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-with-at-least-32-characters';
  mocks.authenticatedUser.mockReset();
  mocks.authenticatedUser.mockResolvedValue({
    user: { id: '30000000-0000-4000-8000-000000000003' },
  });
});

test('returns only the authenticated user opaque push identity and never caches it', async () => {
  const res = response();
  await handler({ method: 'GET', headers: { authorization: 'Bearer session' } }, res);

  expect(mocks.authenticatedUser).toHaveBeenCalledOnce();
  expect(res.statusCode).toBe(200);
  expect(res.headers['Cache-Control']).toBe('no-store');
  expect(res.body.externalId).toMatch(/^zyv1_[A-Za-z0-9_-]{43}$/);
  expect(JSON.stringify(res.body)).not.toContain('30000000-0000-4000-8000-000000000003');
});
