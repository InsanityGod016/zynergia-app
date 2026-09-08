import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildOneSignalPayload,
  isRetryableOneSignalError,
  oneSignalExternalId,
  sendOneSignalPush,
} from '../../api/_lib/onesignal.js';

let previousAppId;
let previousApiKey;
let previousServiceKey;

beforeEach(() => {
  previousAppId = process.env.ONESIGNAL_APP_ID;
  previousApiKey = process.env.ONESIGNAL_REST_API_KEY;
  previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ONESIGNAL_APP_ID = '10000000-0000-4000-8000-000000000001';
  process.env.ONESIGNAL_REST_API_KEY = 'test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-with-at-least-32-characters';
});

afterEach(() => {
  if (previousAppId === undefined) delete process.env.ONESIGNAL_APP_ID;
  else process.env.ONESIGNAL_APP_ID = previousAppId;
  if (previousApiKey === undefined) delete process.env.ONESIGNAL_REST_API_KEY;
  else process.env.ONESIGNAL_REST_API_KEY = previousApiKey;
  if (previousServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
});

describe('OneSignal transactional payload', () => {
  it('targets only the server-derived opaque identity and uses a UUID idempotency key', () => {
    const userId = '30000000-0000-4000-8000-000000000003';
    const externalId = oneSignalExternalId(userId);
    const payload = buildOneSignalPayload({
      appId: '10000000-0000-4000-8000-000000000001',
      notificationId: '20000000-0000-4000-8000-000000000002',
      externalId,
      title: 'Meta alcanzada',
      body: 'Completaste Q-Team.',
      route: '/Partners',
    });
    expect(payload.include_aliases).toEqual({ external_id: [externalId] });
    expect(externalId).toMatch(/^zyv1_[A-Za-z0-9_-]{43}$/);
    expect(externalId).not.toContain(userId);
    expect(payload.target_channel).toBe('push');
    expect(payload.idempotency_key).toBe('20000000-0000-4000-8000-000000000002');
    expect(payload.data).toEqual({ route: '/Partners' });
    expect(JSON.stringify(payload)).not.toContain('session');
  });

  it('derives stable, app-scoped identities and fails closed without a server secret', () => {
    const userId = '30000000-0000-4000-8000-000000000003';
    expect(oneSignalExternalId(userId)).toBe(oneSignalExternalId(userId));
    expect(oneSignalExternalId(userId, {
      appId: '90000000-0000-4000-8000-000000000009',
      secret: process.env.SUPABASE_SERVICE_ROLE_KEY,
    })).not.toBe(oneSignalExternalId(userId));
    expect(() => oneSignalExternalId(userId, { secret: '' })).toThrow('No se pudo proteger la identidad push.');
  });

  it('classifies throttling as retryable and validation failures as terminal', async () => {
    const notification = {
      notificationId: '20000000-0000-4000-8000-000000000002',
      userId: '30000000-0000-4000-8000-000000000003',
      title: 'Meta', body: 'Avance', route: '/Partners',
    };
    const throttled = await sendOneSignalPush(notification, async () => ({ ok: false, status: 429 }))
      .catch(error => error);
    const invalid = await sendOneSignalPush(notification, async () => ({ ok: false, status: 400 }))
      .catch(error => error);

    expect(throttled.message).toBe('onesignal_http_429');
    expect(isRetryableOneSignalError(throttled)).toBe(true);
    expect(invalid.message).toBe('onesignal_http_400');
    expect(isRetryableOneSignalError(invalid)).toBe(false);
  });

  it('aborts a stalled provider call and marks it retryable', async () => {
    const notification = {
      notificationId: '20000000-0000-4000-8000-000000000002',
      userId: '30000000-0000-4000-8000-000000000003',
      title: 'Meta', body: 'Avance', route: '/Partners',
    };
    const stalled = (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });

    const error = await sendOneSignalPush(notification, stalled, 10).catch(cause => cause);
    expect(error.message).toBe('onesignal_timeout');
    expect(isRetryableOneSignalError(error)).toBe(true);
  });

  it('does not claim delivery when OneSignal accepted zero recipients', async () => {
    const notification = {
      notificationId: '20000000-0000-4000-8000-000000000002',
      userId: '30000000-0000-4000-8000-000000000003',
      title: 'Meta', body: 'Avance', route: '/Partners',
    };
    const response = await sendOneSignalPush(notification, async () => ({
      ok: true,
      json: async () => ({ id: '40000000-0000-4000-8000-000000000004', recipients: 0 }),
    }));

    expect(response).toEqual({ sent: false, errorCode: 'no_subscribed_device' });
  });
});
