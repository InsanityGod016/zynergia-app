import { supabase } from '@/lib/supabaseClient';
import { Capacitor } from '@capacitor/core';
import { createOperationId } from '@/lib/operationId';

const isNative = Capacitor.isNativePlatform();
export const API_BASE = isNative ? (import.meta.env.VITE_API_BASE_URL || 'https://zynergia.pro') : '';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * @param {string} path
 * @param {RequestInit & {auth?: boolean}} [options]
 * @returns {Promise<any>}
 */
export async function apiFetch(path, options = {}) {
  const { auth = true, headers, ...request } = options;
  const requestHeaders = new Headers(headers);
  if (request.body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401, 'session_expired');
    requestHeaders.set('Authorization', `Bearer ${session.access_token}`);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...request, headers: requestHeaders });
  } catch {
    throw new ApiError(
      'No pudimos conectar con el servicio. Revisa tu conexión e intenta de nuevo.',
      503,
      'NETWORK_UNAVAILABLE',
    );
  }
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError(
      'El servidor respondió de forma incorrecta. Intenta de nuevo más tarde.',
      502,
      'INVALID_API_RESPONSE',
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'El servidor respondió de forma incorrecta. Intenta de nuevo más tarde.',
      502,
      'INVALID_API_RESPONSE',
    );
  }
  if (!response.ok) {
    throw new ApiError(data.error || 'No pudimos completar la solicitud.', response.status, data.code);
  }
  return data;
}

export function getCheckoutIdempotencyKey() {
  const storageKey = 'zynergia_checkout_idempotency';
  let value = sessionStorage.getItem(storageKey);
  if (!value) {
    value = createOperationId();
    sessionStorage.setItem(storageKey, value);
  }
  return value;
}

export function clearCheckoutIdempotencyKey() {
  sessionStorage.removeItem('zynergia_checkout_idempotency');
}
