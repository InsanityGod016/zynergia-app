import { timingSafeEqual } from 'node:crypto';

import { getStripe, getSupabaseAdmin } from './clients.js';
import { HttpError } from './http.js';

export const PARTNER_TRANSFER_PERCENT = 20;
export const CONNECT_COHORT = 'zynergia_80_20_2026_09_01';

function connectEffectiveAt() {
  const value = String(process.env.STRIPE_CONNECT_EFFECTIVE_AT || '').trim();
  const timestamp = Date.parse(value);
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(timestamp)) {
    throw new HttpError(
      500,
      'CONNECT_EFFECTIVE_AT_NOT_CONFIGURED',
      'Falta configurar STRIPE_CONNECT_EFFECTIVE_AT con fecha y zona horaria.'
    );
  }
  return new Date(timestamp);
}

export function connectCohortMetadata(now = new Date()) {
  const effectiveAt = connectEffectiveAt();
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(nowTime)) {
    throw new HttpError(500, 'INVALID_SERVER_TIME', 'El servidor devolvió una fecha inválida.');
  }
  if (nowTime < effectiveAt.getTime()) {
    throw new HttpError(
      503,
      'CONNECT_COHORT_NOT_ACTIVE',
      'Las nuevas altas todavía no están habilitadas para el split 80/20.'
    );
  }

  return {
    zynergia_connect_cohort: CONNECT_COHORT,
    zynergia_connect_effective_at: effectiveAt.toISOString(),
    zynergia_partner_share_percent: String(PARTNER_TRANSFER_PERCENT),
  };
}

export function subscriptionUsesConnectCohort(subscription, expectedDestination = null) {
  const metadata = subscription?.metadata || {};
  const cohort = metadata.zynergia_connect_cohort;
  if (!cohort) return false;
  if (cohort !== CONNECT_COHORT) throw new Error('La suscripción usa una cohorte Connect desconocida');

  const effectiveAt = connectEffectiveAt();
  const created = Number(subscription?.created);
  if (!Number.isSafeInteger(created) || created * 1000 < effectiveAt.getTime()) {
    throw new Error('La suscripción Connect es anterior al corte permitido');
  }
  const destination = typeof subscription?.transfer_data?.destination === 'string'
    ? subscription.transfer_data.destination
    : subscription?.transfer_data?.destination?.id;
  if (metadata.zynergia_connect_effective_at !== effectiveAt.toISOString() ||
      metadata.zynergia_partner_share_percent !== String(PARTNER_TRANSFER_PERCENT) ||
      Number(subscription?.transfer_data?.amount_percent) !== PARTNER_TRANSFER_PERCENT ||
      destination !== (expectedDestination || partnerAccountId())) {
    throw new Error('La suscripción Connect no coincide con la cohorte 80/20');
  }
  return true;
}

function expectedCountry(name) {
  const country = String(process.env[name] || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new HttpError(500, 'CONNECT_COUNTRY_NOT_CONFIGURED', `Falta configurar ${name}.`);
  }
  return country;
}

export function partnerAccountId() {
  const accountId = String(process.env.STRIPE_PARTNER_ACCOUNT_ID || '').trim();
  if (!/^acct_[A-Za-z0-9]+$/.test(accountId)) {
    throw new HttpError(
      500,
      'CONNECT_NOT_CONFIGURED',
      'La cuenta de pagos del socio no está configurada.'
    );
  }
  return accountId;
}

function partnerEmail() {
  const email = String(process.env.STRIPE_PARTNER_EMAIL || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new HttpError(500, 'CONNECT_PARTNER_EMAIL_NOT_CONFIGURED', 'Falta configurar STRIPE_PARTNER_EMAIL.');
  }
  return email;
}

export function requireConnectAdmin(req) {
  const expected = String(process.env.CONNECT_ADMIN_SECRET || '');
  const provided = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (expected.length < 32) {
    throw new HttpError(500, 'CONNECT_ADMIN_NOT_CONFIGURED', 'Falta configurar el acceso administrativo de Connect.');
  }

  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
    throw new HttpError(401, 'INVALID_CONNECT_ADMIN_SECRET', 'No autorizado.');
  }
}

export function requireConnectReversalControls() {
  if (process.env.STRIPE_CONNECT_REVERSALS_READY !== 'true') {
    throw new HttpError(
      503,
      'CONNECT_REVERSALS_NOT_READY',
      'Los cobros están pausados mientras terminamos los controles financieros de Connect.'
    );
  }
}

export async function retrievePartnerAccount() {
  const accountId = partnerAccountId();
  let account;
  try {
    account = await getStripe().accounts.retrieve(accountId);
  } catch (error) {
    console.error('[stripe-connect-account]', error);
    throw new HttpError(503, 'CONNECT_ACCOUNT_UNAVAILABLE', 'No pudimos verificar la cuenta de pagos del socio.');
  }

  if (!account || account.deleted || account.id !== accountId) {
    throw new HttpError(503, 'CONNECT_ACCOUNT_UNAVAILABLE', 'La cuenta de pagos del socio no está disponible.');
  }
  if (String(account.email || '').trim().toLowerCase() !== partnerEmail() ||
      account.metadata?.role !== 'zynergia_partner') {
    throw new HttpError(
      503,
      'CONNECT_ACCOUNT_IDENTITY_MISMATCH',
      'La cuenta de pagos no coincide con el socio aprobado.'
    );
  }
  return account;
}

export async function partnerTransferData() {
  requireConnectReversalControls();
  const { error: ledgerError } = await getSupabaseAdmin().rpc('assert_stripe_connect_checkout_ready');
  if (ledgerError) {
    console.error('[stripe-connect-ledger-gate]', ledgerError);
    throw new HttpError(
      503,
      'CONNECT_LEDGER_UNHEALTHY',
      'Los cobros están pausados mientras conciliamos los pagos del socio.'
    );
  }
  const account = await retrievePartnerAccount();
  const platform = await getStripe().accounts.retrieveCurrent();
  if (platform.country !== expectedCountry('STRIPE_PLATFORM_COUNTRY') ||
      account.country !== expectedCountry('STRIPE_PARTNER_COUNTRY')) {
    throw new HttpError(
      503,
      'CONNECT_COUNTRY_MISMATCH',
      'La ruta internacional de pagos no coincide con la configuración revisada.'
    );
  }
  const requirements = account.requirements || {};
  const currentlyDue = Array.isArray(requirements.currently_due) ? requirements.currently_due : [];
  const eventuallyDue = Array.isArray(requirements.eventually_due) ? requirements.eventually_due : [];
  const pastDue = Array.isArray(requirements.past_due) ? requirements.past_due : [];
  const pendingVerification = Array.isArray(requirements.pending_verification)
    ? requirements.pending_verification
    : [];
  const ready = account.details_submitted === true &&
    account.payouts_enabled === true &&
    account.capabilities?.transfers === 'active' &&
    !requirements.disabled_reason &&
    currentlyDue.length === 0 &&
    eventuallyDue.length === 0 &&
    pastDue.length === 0 &&
    pendingVerification.length === 0;

  if (!ready) {
    throw new HttpError(
      503,
      'CONNECT_ACCOUNT_NOT_READY',
      'La cuenta de pagos del socio todavía requiere atención.'
    );
  }

  return {
    destination: account.id,
    amount_percent: PARTNER_TRANSFER_PERCENT,
  };
}
