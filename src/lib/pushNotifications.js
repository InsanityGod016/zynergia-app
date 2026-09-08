import { Capacitor } from '@capacitor/core';
import { apiFetch } from '@/lib/api';

const ONE_SIGNAL_APP_ID = String(import.meta.env.VITE_ONESIGNAL_APP_ID || '').trim();
const ALLOWED_ROUTES = new Set(['/', '/Tasks', '/Partners']);

let sdkPromise;
let initialized = false;
let activeExternalId = null;
let activeUserId = null;
let identityEpoch = 0;
let pendingIdentity = null;

function isNative() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function loadSdk() {
  if (!isNative() || !ONE_SIGNAL_APP_ID) return null;
  sdkPromise ||= import('@onesignal/capacitor-plugin')
    .then(module => module.default)
    .catch(() => null);
  return sdkPromise;
}

async function prepareSdk() {
  const OneSignal = await loadSdk();
  if (!OneSignal) return null;
  if (!initialized) {
    // Do not let the SDK collect subscription data before the person enables
    // notifications from Zynergia's own explanation screen.
    OneSignal.setConsentRequired(true);
    await OneSignal.initialize(ONE_SIGNAL_APP_ID);
    initialized = true;
  }
  return OneSignal;
}

function validExternalId(value) {
  return typeof value === 'string' && /^zyv1_[A-Za-z0-9_-]{43}$/.test(value);
}

async function resolveExternalId(userId) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) throw new Error('push_identity_required');
  if (activeUserId === normalizedUserId && validExternalId(activeExternalId)) return activeExternalId;
  if (pendingIdentity?.userId !== normalizedUserId) {
    const promise = apiFetch('/api/notifications/identity')
      .then(result => {
        if (!validExternalId(result?.externalId)) throw new Error('invalid_push_identity');
        return result.externalId;
      });
    pendingIdentity = {
      userId: normalizedUserId,
      promise,
    };
    promise.catch(() => {
      if (pendingIdentity?.promise === promise) pendingIdentity = null;
    });
  }
  return pendingIdentity.promise;
}

async function loginVerifiedIdentity(OneSignal, userId) {
  const epoch = identityEpoch;
  const normalizedUserId = String(userId || '').trim();
  const externalId = await resolveExternalId(normalizedUserId);
  if (epoch !== identityEpoch) throw new Error('push_identity_changed');
  if (externalId !== activeExternalId) await OneSignal.login(externalId);
  if (epoch !== identityEpoch) {
    await OneSignal.logout();
    throw new Error('push_identity_changed');
  }
  activeExternalId = externalId;
  activeUserId = normalizedUserId;
}

export function safePushRoute(value) {
  if (typeof value !== 'string' || value.length > 240) return null;
  try {
    const parsed = new URL(value, 'https://zynergia.invalid');
    if (parsed.origin !== 'https://zynergia.invalid' || !ALLOWED_ROUTES.has(parsed.pathname)) return null;
    if (parsed.pathname === '/') return '/';
    const allowedId = parsed.searchParams.get(parsed.pathname === '/Tasks' ? 'taskId' : 'partnerId');
    if (!allowedId) return parsed.pathname;
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(allowedId)) return parsed.pathname;
    const key = parsed.pathname === '/Tasks' ? 'taskId' : 'partnerId';
    return `${parsed.pathname}?${key}=${encodeURIComponent(allowedId)}`;
  } catch {
    return null;
  }
}

export function partnerForPushRoute(partners, partnerId) {
  if (!partnerId) return null;
  return (partners || []).find(partner => String(partner.id) === String(partnerId)) || null;
}

export async function setPushIdentity(userId, consentGiven = false) {
  const normalizedUserId = userId ? String(userId) : null;
  const OneSignal = await prepareSdk();
  if (!OneSignal) return { status: ONE_SIGNAL_APP_ID ? 'unavailable' : 'unconfigured' };
  if (consentGiven && normalizedUserId) {
    await resolveExternalId(normalizedUserId);
    OneSignal.setConsentGiven(true);
    await loginVerifiedIdentity(OneSignal, normalizedUserId);
  }
  return { status: 'ready' };
}

export async function disconnectPushIdentity() {
  identityEpoch += 1;
  activeExternalId = null;
  activeUserId = null;
  pendingIdentity = null;
  const OneSignal = await prepareSdk();
  if (!OneSignal) return;
  await OneSignal.logout();
}

export async function requestPushPermission(userId) {
  const OneSignal = await prepareSdk();
  if (!OneSignal) return { granted: false, status: ONE_SIGNAL_APP_ID ? 'unavailable' : 'unconfigured' };
  if (!userId) return { granted: false, status: 'identity-unavailable' };
  await resolveExternalId(userId);
  OneSignal.setConsentGiven(true);
  await loginVerifiedIdentity(OneSignal, userId);
  const granted = await OneSignal.Notifications.requestPermission(false);
  if (granted) await OneSignal.User.pushSubscription.optIn();
  return { granted: Boolean(granted), status: granted ? 'granted' : 'denied' };
}

export async function setPushSubscriptionEnabled(enabled) {
  const OneSignal = await prepareSdk();
  if (!OneSignal) return { status: ONE_SIGNAL_APP_ID ? 'unavailable' : 'unconfigured' };
  if (enabled) {
    if (!validExternalId(activeExternalId)) return { status: 'identity-unavailable' };
    OneSignal.setConsentGiven(true);
    await OneSignal.User.pushSubscription.optIn();
  } else {
    await OneSignal.User.pushSubscription.optOut();
    OneSignal.setConsentGiven(false);
  }
  return { status: enabled ? 'enabled' : 'disabled' };
}

export async function initializePushNavigation({ userId, enabled, consentGiven, navigate }) {
  if (!enabled || !consentGiven) return () => {};
  const OneSignal = await prepareSdk();
  if (!OneSignal) return () => {};
  await resolveExternalId(userId);
  OneSignal.setConsentGiven(true);
  await loginVerifiedIdentity(OneSignal, userId);

  const onClick = event => {
    const route = safePushRoute(event?.notification?.additionalData?.route);
    navigate(route || '/');
  };
  OneSignal.Notifications.addEventListener('click', onClick);
  return () => OneSignal.Notifications.removeEventListener('click', onClick);
}

export async function pushPermissionStatus() {
  const OneSignal = await prepareSdk();
  if (!OneSignal) return { granted: false, status: ONE_SIGNAL_APP_ID ? 'unavailable' : 'unconfigured' };
  const granted = await OneSignal.Notifications.hasPermission();
  return { granted: Boolean(granted), status: granted ? 'granted' : 'not-granted' };
}
