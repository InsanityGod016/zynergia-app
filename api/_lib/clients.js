import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { bearerToken, HttpError } from './http.js';

let stripeClient;
let supabaseAdmin;

function requiredEnv(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) throw new HttpError(500, 'SERVER_NOT_CONFIGURED', `Falta configurar ${name}.`);
  return value;
}

export function getStripe() {
  if (!stripeClient) stripeClient = new Stripe(requiredEnv('STRIPE_SECRET_KEY'));
  return stripeClient;
}

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      requiredEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return supabaseAdmin;
}

export async function authenticatedUser(req, { confirmedEmail = false } = {}) {
  const token = bearerToken(req);
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;

  if (error || !user?.id) {
    throw new HttpError(401, 'INVALID_SESSION', 'Tu sesión ya no es válida.');
  }
  if (confirmedEmail && (!user.email || !(user.email_confirmed_at || user.confirmed_at))) {
    throw new HttpError(403, 'EMAIL_NOT_CONFIRMED', 'Confirma tu correo antes de continuar.');
  }

  return { admin, token, user };
}

export function requireFreshToken(token) {
  let payload;
  try {
    payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    throw new HttpError(401, 'INVALID_SESSION', 'Tu sesión ya no es válida.');
  }

  const configuredMaxAge = Number(process.env.DELETE_REAUTH_MAX_AGE_SECONDS || 600);
  const maxAge = Number.isFinite(configuredMaxAge) && configuredMaxAge >= 60 && configuredMaxAge <= 3600
    ? configuredMaxAge
    : 600;
  const passwordTimestamps = Array.isArray(payload.amr)
    ? payload.amr
      .filter((entry) => entry && typeof entry === 'object' && entry.method === 'password')
      .map((entry) => Number(entry.timestamp))
      .filter(Number.isFinite)
    : [];
  const reauthenticatedAt = passwordTimestamps.length ? Math.max(...passwordTimestamps) : NaN;
  const age = Math.floor(Date.now() / 1000) - reauthenticatedAt;
  if (!Number.isFinite(age) || age < -60 || age > maxAge) {
    throw new HttpError(401, 'REAUTH_REQUIRED', 'Vuelve a iniciar sesión antes de eliminar tu cuenta.');
  }
}

export function appUrl(path = '') {
  let base;
  try {
    base = new URL(requiredEnv('APP_URL'));
  } catch {
    throw new HttpError(500, 'SERVER_NOT_CONFIGURED', 'APP_URL no es una URL válida.');
  }

  if (base.protocol !== 'https:' && base.hostname !== 'localhost') {
    throw new HttpError(500, 'SERVER_NOT_CONFIGURED', 'APP_URL debe usar HTTPS.');
  }
  return new URL(path, `${base.origin}/`).toString();
}

export function priceForPlan(plan = 'monthly') {
  if (plan !== 'monthly') {
    throw new HttpError(400, 'INVALID_PLAN', 'El plan solicitado no existe.');
  }

  const priceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  if (!priceId) throw new HttpError(500, 'SERVER_NOT_CONFIGURED', 'Falta configurar STRIPE_MONTHLY_PRICE_ID.');
  return priceId;
}

export function assertMonthlyPrice(price, expectedId) {
  const recurring = price?.recurring;
  if (price?.id !== expectedId ||
      price?.active !== true ||
      price?.currency !== 'usd' ||
      price?.unit_amount !== 1700 ||
      price?.type !== 'recurring' ||
      recurring?.interval !== 'month' ||
      recurring?.interval_count !== 1) {
    throw new HttpError(
      500,
      'INVALID_MONTHLY_PRICE_CONFIGURATION',
      'El precio mensual de Stripe no coincide con 17 USD al mes.'
    );
  }
  return expectedId;
}

export async function validatedPriceForPlan(plan = 'monthly') {
  const priceId = priceForPlan(plan);
  return assertMonthlyPrice(await getStripe().prices.retrieve(priceId), priceId);
}

export function allowedPriceIds() {
  return new Set([
    process.env.STRIPE_MONTHLY_PRICE_ID,
    process.env.STRIPE_ANNUAL_PRICE_ID,
    ...(process.env.STRIPE_LEGACY_PRICE_IDS || '').split(',').map((value) => value.trim()),
  ].filter(Boolean));
}

export function graceDays() {
  const value = Number(process.env.BILLING_GRACE_DAYS || 3);
  return Number.isFinite(value) && value >= 0 && value <= 30 ? value : 3;
}

export function newSignupsEnabled() {
  return process.env.NEW_SIGNUPS_ENABLED === 'true';
}
