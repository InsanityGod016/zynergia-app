import { afterEach, expect, test, vi } from 'vitest';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

import { apiFetch } from '@/lib/api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('rechaza HTML aunque el hosting responda 200', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })));

  await expect(apiFetch('/api/billing/status', { auth: false })).rejects.toMatchObject({
    status: 502,
    code: 'INVALID_API_RESPONSE',
  });
});

test('conserva el error JSON real del backend', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    error: 'Las altas están pausadas.',
    code: 'NEW_SIGNUPS_DISABLED',
  }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  })));

  await expect(apiFetch('/api/billing/checkout', { auth: false })).rejects.toMatchObject({
    message: 'Las altas están pausadas.',
    status: 503,
    code: 'NEW_SIGNUPS_DISABLED',
  });
});

test('convierte una falla de red en un error entendible', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

  await expect(apiFetch('/api/billing/status', { auth: false })).rejects.toMatchObject({
    status: 503,
    code: 'NETWORK_UNAVAILABLE',
  });
});
