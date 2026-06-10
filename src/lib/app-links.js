/**
 * app-links.js — URLs de descarga de la app en las stores.
 *
 * Cuando Apple y Google aprueben la app, pegar aquí las URLs reales.
 * Mientras estén vacías, la pantalla de descarga (/download) muestra solo
 * el botón "Continuar en el navegador" y oculta los QRs.
 */
export const APP_STORE_URL = '';   // ej. 'https://apps.apple.com/app/id1234567890'
export const PLAY_STORE_URL = '';  // ej. 'https://play.google.com/store/apps/details?id=com.zynergia.app'

export function qrFor(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}`;
}
