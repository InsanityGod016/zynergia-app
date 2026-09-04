const NON_TERMINAL_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'paused',
  'incomplete',
]);

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function stripeCustomerId(subscription) {
  return typeof subscription?.customer === 'string'
    ? subscription.customer
    : subscription?.customer?.id || null;
}

export function stripePriceId(subscription) {
  const item = subscription?.items?.data?.[0];
  return item?.price?.id || item?.pricing?.price_details?.price || null;
}

export function subscriptionPeriodEnd(subscription) {
  const candidates = [
    subscription?.current_period_end,
    ...(subscription?.items?.data || []).map((item) => item.current_period_end),
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);

  return candidates.length ? Math.max(...candidates) : null;
}

export function invoiceSubscriptionId(invoice) {
  const candidate = invoice?.subscription ?? invoice?.parent?.subscription_details?.subscription;
  return typeof candidate === 'string' ? candidate : candidate?.id || null;
}

export function isFullRefund(charge) {
  const amount = Number(charge?.amount);
  const refunded = Number(charge?.amount_refunded);
  return Number.isFinite(amount) && amount > 0 &&
    Number.isFinite(refunded) && refunded >= amount;
}

export function fullRefundBlocksCurrentSubscription(charge, subscription, invoiceId) {
  if (!isFullRefund(charge)) return false;
  const latest = typeof subscription?.latest_invoice === 'string'
    ? subscription.latest_invoice
    : subscription?.latest_invoice?.id;
  return !latest || latest === invoiceId;
}

export function disputeAccessBlockReason(status) {
  if (status === 'lost') return 'dispute_lost';
  if (status === 'needs_response' || status === 'under_review') return 'dispute_open';
  if ([
    'won',
    'prevented',
    'warning_needs_response',
    'warning_under_review',
    'warning_closed',
  ].includes(status)) return null;
  return 'dispute_open';
}

export function stripeMetadataOwnership(resources, userId) {
  const owners = resources.flatMap((resource) => [
    resource?.metadata?.supabase_user_id,
    resource?.metadata?.user_id,
  ]).filter(Boolean);

  if (owners.length === 0) return 'unbound';
  return owners.every((owner) => owner === userId) ? 'owned' : 'conflict';
}

export function chooseLegacySubscription(subscriptions) {
  const current = subscriptions.filter((subscription) => NON_TERMINAL_STATUSES.has(subscription.status));
  if (current.length > 1) return { conflict: 'multiple_current_subscriptions', subscription: null };
  if (current.length === 1) return { conflict: null, subscription: current[0] };

  const terminal = [...subscriptions].sort((a, b) => Number(b.created || 0) - Number(a.created || 0));
  return { conflict: null, subscription: terminal[0] || null };
}

export function effectiveAccess(grants, now = new Date()) {
  const nowMs = now.getTime();
  const usable = grants
    .filter((grant) => ['active', 'grace'].includes(grant.status) && !grant.revoked_at)
    .filter((grant) => !grant.access_until || new Date(grant.access_until).getTime() > nowMs)
    .sort((a, b) => new Date(b.access_until || 8640000000000000).getTime() - new Date(a.access_until || 8640000000000000).getTime());

  const grant = usable[0] || null;
  return {
    entitled: Boolean(grant),
    state: grant?.status || 'inactive',
    accessUntil: grant?.access_until || null,
  };
}

export function isNonTerminalSubscription(status) {
  return NON_TERMINAL_STATUSES.has(status);
}
