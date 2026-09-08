import { createHmac } from 'node:crypto';
import { HttpError } from './http.js';

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new HttpError(500, 'PUSH_NOT_CONFIGURED', `Falta configurar ${name}.`);
  return value;
}

function clipped(value, maximum) {
  return String(value || '').trim().slice(0, maximum);
}

function deliveryError(code, retryable) {
  return Object.assign(new Error(code), { retryable });
}

function retryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function oneSignalRequest(url, options, fetcher, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(10, Math.min(timeoutMs, 15000)));
  try {
    return await fetcher(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      throw deliveryError('onesignal_timeout', true);
    }
    throw deliveryError('onesignal_network_error', true);
  } finally {
    clearTimeout(timeout);
  }
}

export function oneSignalExternalId(userId, {
  appId = process.env.ONESIGNAL_APP_ID,
  secret = process.env.SUPABASE_SERVICE_ROLE_KEY,
} = {}) {
  const normalizedUserId = String(userId || '').trim().toLowerCase();
  const normalizedAppId = String(appId || '').trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalizedUserId)) {
    throw new Error('invalid_user_id');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(normalizedAppId)) {
    throw new HttpError(500, 'PUSH_NOT_CONFIGURED', 'Falta configurar ONESIGNAL_APP_ID.');
  }
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new HttpError(500, 'PUSH_IDENTITY_NOT_CONFIGURED', 'No se pudo proteger la identidad push.');
  }
  return `zyv1_${createHmac('sha256', secret)
    .update(`onesignal-external-id:v1:${normalizedAppId}:${normalizedUserId}`)
    .digest('base64url')}`;
}

export function isRetryableOneSignalError(error) {
  return error?.retryable === true;
}

export function buildOneSignalPayload({ appId, notificationId, externalId, title, body, route }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(notificationId || ''))) throw new Error('invalid_notification_id');
  if (!/^zyv1_[A-Za-z0-9_-]{43}$/.test(String(externalId || ''))) throw new Error('invalid_external_id');
  return {
    app_id: appId,
    include_aliases: { external_id: [externalId] },
    target_channel: 'push',
    headings: { en: clipped(title, 80) || 'Zynergia' },
    contents: { en: clipped(body, 220) },
    data: { route: clipped(route, 240) || '/' },
    idempotency_key: notificationId,
  };
}

export async function sendOneSignalPush(notification, fetcher = fetch, timeoutMs = 8000) {
  const appId = required('ONESIGNAL_APP_ID');
  const apiKey = required('ONESIGNAL_REST_API_KEY');
  const externalId = oneSignalExternalId(notification.userId, { appId });
  const payload = buildOneSignalPayload({ appId, externalId, ...notification });
  const response = await oneSignalRequest('https://api.onesignal.com/notifications?c=push', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, fetcher, timeoutMs);
  if (!response.ok) {
    const status = Number(response.status || 0);
    throw deliveryError(`onesignal_http_${status || 'unknown'}`, retryableStatus(status));
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw deliveryError('onesignal_invalid_response', true);
  }
  // OneSignal may accept the request and still report zero recipients when the
  // external ID has no subscribed device. Treat that as a clean skip instead
  // of a delivered push; a missing `recipients` field remains compatible with
  // provider responses that only return the notification ID.
  if (!result?.id || result.recipients === 0) {
    return { sent: false, errorCode: 'no_subscribed_device' };
  }
  return { sent: true, providerMessageId: result.id };
}

export async function deleteOneSignalUser(userId, fetcher = fetch, timeoutMs = 8000) {
  const appId = String(process.env.ONESIGNAL_APP_ID || '').trim();
  const apiKey = String(process.env.ONESIGNAL_REST_API_KEY || '').trim();
  if (!appId && !apiKey) return;
  if (!appId || !apiKey) {
    throw new HttpError(500, 'PUSH_NOT_CONFIGURED', 'Falta completar la configuración de OneSignal.');
  }

  const externalId = oneSignalExternalId(userId, { appId });
  const response = await oneSignalRequest(
    `https://api.onesignal.com/apps/${appId}/users/by/external_id/${encodeURIComponent(externalId)}`,
    { method: 'DELETE', headers: { Authorization: `Key ${apiKey}` } },
    fetcher,
    timeoutMs,
  );
  const status = Number(response.status || 0);
  if (status === 202 || status === 404) return;
  throw deliveryError(`onesignal_http_${status || 'unknown'}`, retryableStatus(status));
}
