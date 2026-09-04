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

export function mobileRouteForAppUrl(value) {
  try {
    const target = new URL(value);
    if (target.protocol !== 'https:' || target.hostname !== 'zynergia.pro') return null;
    return target.pathname === '/app' || target.pathname === '/app/' ? '/' : null;
  } catch {
    return null;
  }
}
