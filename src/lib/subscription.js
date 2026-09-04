import { apiFetch } from '@/lib/api';

export const ACCESSIBLE_BILLING_STATES = new Set([
  'active',
  'grace',
  'complimentary',
  'pending_deletion',
]);

export const BILLING_CHANGED_EVENT = 'zynergia:billing-changed';

const IMMEDIATE_CANCELLATION_STATES = new Set(['grace', 'past_due', 'unpaid', 'paused']);

export function billingAccessEndsAt(status) {
  const explicitAccessEnd = status?.accessEndsAt || status?.access_until;
  if (explicitAccessEnd) return explicitAccessEnd;
  if (status?.state === 'grace') return status?.graceEndsAt || status?.grace_until || null;
  if (['active', 'pending_deletion'].includes(status?.state)) {
    return status?.currentPeriodEnd || status?.current_period_end || null;
  }
  return null;
}

export function cancellationEndsImmediately(status) {
  return IMMEDIATE_CANCELLATION_STATES.has(status?.subscriptionStatus || status?.state);
}

export function notifyBillingChanged(status) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BILLING_CHANGED_EVENT, { detail: status }));
}

export async function claimLegacyBillingAccount() {
  return apiFetch('/api/billing/claim', { method: 'POST' });
}

export async function getBillingStatus() {
  return apiFetch('/api/billing/status');
}

export async function resolveBillingStatus() {
  const current = await getBillingStatus();
  if (hasAppAccess(current)) return current;

  try {
    await claimLegacyBillingAccount();
  } catch (error) {
    if (![404, 409].includes(error?.status)) throw error;
  }

  return getBillingStatus();
}

export async function cancelSubscription() {
  return apiFetch('/api/billing/cancel', { method: 'POST' });
}

export function hasAppAccess(status) {
  return ACCESSIBLE_BILLING_STATES.has(status?.state);
}
