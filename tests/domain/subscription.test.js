import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));
import { apiFetch } from '@/lib/api';
import {
  BILLING_CHANGED_EVENT,
  billingAccessEndsAt,
  cancellationEndsImmediately,
  notifyBillingChanged,
  resolveBillingStatus,
} from '@/lib/subscription';

beforeEach(() => {
  apiFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('una cuenta con acceso explícito no depende de Stripe', async () => {
  apiFetch.mockResolvedValueOnce({ state: 'complimentary' });

  await expect(resolveBillingStatus()).resolves.toEqual({ state: 'complimentary' });
  expect(apiFetch).toHaveBeenCalledTimes(1);
  expect(apiFetch).toHaveBeenCalledWith('/api/billing/status');
});

test('una cuenta sin acceso intenta reclamar su suscripción legacy', async () => {
  apiFetch
    .mockResolvedValueOnce({ state: 'inactive' })
    .mockResolvedValueOnce({ claimed: true })
    .mockResolvedValueOnce({ state: 'active' });

  await expect(resolveBillingStatus()).resolves.toEqual({ state: 'active' });
  expect(apiFetch.mock.calls).toEqual([
    ['/api/billing/status'],
    ['/api/billing/claim', { method: 'POST' }],
    ['/api/billing/status'],
  ]);
});

test('la fecha efectiva prioriza el corte real de acceso y la gracia', () => {
  expect(billingAccessEndsAt({
    state: 'grace',
    accessEndsAt: '2027-01-03T00:00:00Z',
    graceEndsAt: '2027-01-03T00:00:00Z',
    currentPeriodEnd: '2027-02-01T00:00:00Z',
  })).toBe('2027-01-03T00:00:00Z');
  expect(billingAccessEndsAt({ state: 'active', currentPeriodEnd: '2027-02-01T00:00:00Z' }))
    .toBe('2027-02-01T00:00:00Z');
  for (const state of ['past_due', 'unpaid', 'refunded', 'disputed', 'manual_review']) {
    expect(billingAccessEndsAt({ state, currentPeriodEnd: '2027-02-01T00:00:00Z' })).toBeNull();
  }
});

test('la cancelación distingue periodo pagado de deuda y notifica al gate móvil', () => {
  expect(cancellationEndsImmediately({ state: 'active', subscriptionStatus: 'active' })).toBe(false);
  expect(cancellationEndsImmediately({ state: 'grace', subscriptionStatus: 'past_due' })).toBe(true);
  expect(cancellationEndsImmediately({ state: 'unpaid' })).toBe(true);

  const dispatchEvent = vi.fn();
  class TestCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }
  vi.stubGlobal('window', { dispatchEvent });
  vi.stubGlobal('CustomEvent', TestCustomEvent);
  const status = { state: 'canceled', subscriptionStatus: 'canceled' };

  notifyBillingChanged(status);

  expect(dispatchEvent).toHaveBeenCalledOnce();
  expect(dispatchEvent.mock.calls[0][0]).toMatchObject({
    type: BILLING_CHANGED_EVENT,
    detail: status,
  });
});
