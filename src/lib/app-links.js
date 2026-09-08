/**
 * app-links.js — URLs de descarga de la app en las stores.
 *
 * Las URLs de las tiendas se inyectan por entorno cuando hace falta, pero
 * production tiene defaults publicos estables. Los QR solo contienen URLs de
 * tienda, nunca credenciales ni estado de sesion.
 */
export const APP_LANDING_URL = 'https://zynergia.pro/app';
export const APP_WEB_URL = 'https://app.zynergia.pro';
export const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/mx/app/zynergia/id6761772857?l=en-GB';
export const PLAY_STORE_URL = import.meta.env.VITE_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.zynergia.app';
export const APP_QR_IMAGE = '/zynergia-app-qr.png';
export const TEMPLATE_SHARE_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const PENDING_TEMPLATE_SHARE_KEY = 'zynergia:pending-template-share:v1';

export const APP_DOWNLOAD_LINKS = [
  {
    platform: 'ios',
    name: 'Tengo iPhone',
    store: 'Descargar en App Store',
    url: APP_STORE_URL,
    badgeSrc: '/badges/app-store-es.svg',
  },
  {
    platform: 'android',
    name: 'Tengo Android',
    store: 'Descargar en Google Play',
    url: PLAY_STORE_URL,
    badgeSrc: '/badges/google-play-es.svg',
  },
].filter(link => Boolean(link.url));

export function isAppWebHost(hostname) {
  return hostname === 'app.zynergia.pro';
}

export function templateSharePath(token) {
  const normalized = String(token || '').trim().toLowerCase();
  return TEMPLATE_SHARE_TOKEN_PATTERN.test(normalized) ? `/app/plantillas/${normalized}` : null;
}

export function templateShareUrl(token) {
  const path = templateSharePath(token);
  return path ? new URL(path, 'https://zynergia.pro').toString() : null;
}

export function rememberPendingTemplateShare(route, storage = globalThis.localStorage) {
  if (!storage || !/^\/app\/plantillas\/[a-f0-9]{64}$/i.test(String(route || ''))) return false;
  try {
    storage.setItem(PENDING_TEMPLATE_SHARE_KEY, String(route).toLowerCase());
    return true;
  } catch {
    return false;
  }
}

export function readPendingTemplateShare(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const route = storage.getItem(PENDING_TEMPLATE_SHARE_KEY);
    return /^\/app\/plantillas\/[a-f0-9]{64}$/i.test(String(route || '')) ? route : null;
  } catch {
    return null;
  }
}

export function clearPendingTemplateShare(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(PENDING_TEMPLATE_SHARE_KEY);
  } catch {
    // The current route still works even when browser storage is unavailable.
  }
}

export function mobileRouteForAppUrl(value) {
  try {
    const target = new URL(value);
    if (target.protocol !== 'https:' || target.hostname !== 'zynergia.pro') return null;
    if (target.pathname === '/app' || target.pathname === '/app/') return '/';
    const match = target.pathname.match(/^\/app\/plantillas\/([a-f0-9]{64})\/?$/i);
    return match ? templateSharePath(match[1]) : null;
  } catch {
    return null;
  }
}
