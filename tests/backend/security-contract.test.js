import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('legacy identity and client-verified payment endpoints are retired', async () => {
  const endpoint = await source('api/retired.js');
  const deployment = JSON.parse(await source('vercel.json'));
  const retiredPaths = [
    '/api/connect-create',
    '/api/create-checkout',
    '/api/delete-account',
    '/api/finalize-account',
    '/api/verify-payment',
  ];

  expect(endpoint).toMatch(/status\(410\)/);
  expect(endpoint).toMatch(/ENDPOINT_RETIRED/);
  expect(endpoint).not.toMatch(/accounts\.create|subscriptions\.retrieve|auth\.admin\.createUser/);
  for (const path of retiredPaths) {
    expect(deployment.rewrites).toContainEqual({ source: path, destination: '/api/retired' });
  }
});

test('checkout uses the server-controlled Connect transfer and server-selected price', async () => {
  const contents = await source('api/billing/checkout.js');
  expect(contents).toMatch(/partnerTransferData\(\)/);
  expect(contents).toMatch(/connectCohortMetadata\(\)/);
  expect(contents).toMatch(/transfer_data: transferData/);
  expect(contents).not.toMatch(/application_fee/);
  expect(contents).toMatch(/validatedPriceForPlan\(plan\)/);
  expect(contents).toMatch(/idempotencyKey/);
  expect(contents).toMatch(/NEW_SIGNUPS_DISABLED/);
  expect(contents).not.toMatch(/CHECKOUT_SESSION_ID/);
});

test('Connect onboarding is admin-only and never puts a secret in a URL', async () => {
  const endpoint = await source('api/connect/onboarding-link.js');
  const helper = await source('api/_lib/connect.js');

  expect(endpoint).toMatch(/methods: \['POST'\]/);
  expect(endpoint).toMatch(/requireConnectAdmin\(req\)/);
  expect(endpoint).toMatch(/accountLinks\.create/);
  expect(endpoint).toMatch(/fields:\s*'eventually_due'/);
  expect(endpoint).toMatch(/future_requirements:\s*'include'/);
  expect(endpoint).not.toMatch(/req\.query|secret=/);
  expect(helper).toMatch(/timingSafeEqual/);
  expect(helper).toMatch(/CONNECT_ADMIN_SECRET/);
});

test('Connect ledger is private, proportional, idempotent, and webhook-driven', async () => {
  const migration = await source(
    'supabase/migrations/202608310001_stripe_connect_ledger.sql'
  );
  const anomalyGate = await source(
    'supabase/migrations/202609010004_connect_missing_transfer_gate.sql'
  );
  const reconciler = await source('api/_lib/connect-ledger.js');
  const webhook = await source('api/stripe/webhook.js');

  for (const table of [
    'stripe_connect_charges',
    'stripe_connect_disputes',
    'stripe_connect_transfers',
    'stripe_connect_adjustments',
  ]) {
    expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`));
    expect(migration).toMatch(new RegExp(`revoke all on table public\\.${table}`));
  }
  expect(migration).toMatch(/operation_key text not null unique/);
  expect(migration).toMatch(/stripe_object_id text not null unique/);
  expect(migration).toMatch(/least\(p_charge_amount, p_effective_refund_amount \+ p_financial_dispute_amount\)/);
  expect(migration).toMatch(/grant execute on function public\.sync_stripe_connect_charge_snapshot[\s\S]+to service_role/);
  expect(anomalyGate).toMatch(/create table if not exists public\.stripe_connect_anomalies/);
  expect(anomalyGate).toMatch(/where status = 'open'/);
  expect(anomalyGate).toMatch(/raise exception 'stripe_connect_ledger_unhealthy'/);
  expect(anomalyGate).toMatch(/revoke all on table public\.stripe_connect_anomalies/);
  expect(reconciler).toMatch(/Transfer\.amount_reversed|amount_reversed/);
  expect(reconciler).toMatch(/Math\.min\(charge, effectiveRefundAmount \+ financialDisputeAmount\)/);
  expect(reconciler).toMatch(/idempotencyKey: key/);
  expect(reconciler).toMatch(/connect_restoration/);
  expect(reconciler).toMatch(/subscriptionUsesConnectCohort/);
  expect(webhook).toMatch(/reconcileStripeConnectCharge/);
});

test('mobile cancellation uses the authenticated billing row and never client Stripe IDs', async () => {
  const endpoint = await source('api/billing/cancel.js');
  const service = await source('api/_lib/billing-service.js');
  const settings = await source('src/pages/Settings.jsx');

  expect(endpoint).toMatch(/authenticatedUser\(req, \{ confirmedEmail: true \}\)/);
  expect(endpoint).toMatch(/accessSnapshot\(user\.id\)/);
  expect(endpoint).not.toMatch(/req\.body|readJson/);
  expect(endpoint).toMatch(/snapshot\?\.billing\?\.stripe_customer_id/);
  expect(endpoint).toMatch(/snapshot\?\.billing\?\.stripe_subscription_id/);
  expect(service).toMatch(/\{ cancel_at_period_end: true \}/);
  expect(service).not.toMatch(/refunds\.create/);
  expect(settings).toMatch(/Cancelar mi suscripción/);
  expect(settings).toMatch(/No recibirás un reembolso/);
});

test('mobile shows grace and cancellation without linking to an external payment mechanism', async () => {
  const layout = await source('src/Layout.jsx');
  const settings = await source('src/pages/Settings.jsx');
  const app = await source('src/App.jsx');
  const subscription = await source('src/lib/subscription.js');

  expect(layout).toMatch(/billingStatus\?\.state === 'grace'/);
  expect(layout).toMatch(/Pago pendiente/);
  expect(layout).toMatch(/graceEndsAt/);
  expect(settings).toMatch(/BILLING_LABELS/);
  expect(settings).toMatch(/manual_review: 'Cuenta en revisión'/);
  expect(settings).toMatch(/past_due: 'Pago pendiente'/);
  expect(settings).toMatch(/refetchBilling/);
  expect(app).toMatch(/canCancelSubscription/);
  expect(settings).toMatch(/canCancelSubscription/);
  expect(app).not.toMatch(/api\/billing\/portal|Actualizar método de pago|Browser\.open/);
  expect(settings).not.toMatch(/api\/billing\/portal|Actualizar método de pago|Browser\.open/);
  expect(subscription).not.toMatch(/api\/billing\/portal|Browser\.open/);
  expect(app).toMatch(/appStateChange/);
});

test('web account separates card updates from guaranteed end-of-period cancellation', async () => {
  const account = await source('src/pages/Account.jsx');
  const portal = await source('api/billing/portal.js');

  expect(account).toMatch(/Actualizar tarjeta/);
  expect(account).toMatch(/canUpdatePaymentMethod/);
  expect(account).toMatch(/api\/billing\/cancel/);
  expect(account).toMatch(/No habrá reembolso/);
  expect(account).toMatch(/Cancelar mi suscripción/);
  expect(account).not.toMatch(/Actualizar tarjeta o cancelar/);
  expect(portal).toMatch(/type: 'payment_method_update'/);
  expect(portal).not.toMatch(/type: 'subscription_cancel'/);
});

test('new checkout accepts only the monthly server price', async () => {
  const clients = await source('api/_lib/clients.js');

  expect(clients).toMatch(/plan !== 'monthly'/);
  expect(clients).toMatch(/STRIPE_MONTHLY_PRICE_ID/);
  expect(clients).toMatch(/unit_amount !== 1700/);
  expect(clients).toMatch(/recurring\?\.interval !== 'month'/);
  expect(clients).not.toMatch(/plan === 'annual'/);
});

test('long-running webhook and deletion worker have bounded Vercel runtimes', async () => {
  const deployment = JSON.parse(await source('vercel.json'));

  expect(deployment.functions['api/stripe/webhook.js'].maxDuration).toBe(60);
  expect(deployment.functions['api/account/process-deletions.js'].maxDuration).toBe(60);
});

test('API CORS is allowlisted for the concrete Capacitor origins', async () => {
  const http = await source('api/_lib/http.js');

  expect(http).toMatch(/capacitor:\/\/localhost/);
  expect(http).toMatch(/https:\/\/localhost/);
  expect(http).not.toMatch(/Access-Control-Allow-Origin['"],\s*['"]\*/);
});

test('password reset UI requires a real recovery auth event', async () => {
  const page = await source('src/pages/SetPassword.jsx');
  const client = await source('src/lib/supabaseClient.js');
  const recovery = await source('src/lib/passwordRecovery.js');

  expect(client).toMatch(/event === 'PASSWORD_RECOVERY'/);
  expect(page).toMatch(/isRememberedPasswordRecovery\(session\)/);
  expect(recovery).toMatch(/recoveryToken === session\.access_token/);
  expect(page).toMatch(/BrandMark/);
  expect(page).toMatch(/href=\{APP_LANDING_URL\}/);
  expect(page).toMatch(/showConfirmation/);
  expect(page).not.toMatch(/event === 'SIGNED_IN'/);
  expect(page).not.toMatch(/event === 'INITIAL_SESSION'/);
  expect(page).not.toMatch(/href="\/iniciar-sesion"/);
});

test('auth changes clear user-scoped client caches', async () => {
  const auth = await source('src/lib/AuthContext.jsx');

  expect(auth).toMatch(/activeUserId\.current !== nextUserId/);
  expect(auth).toMatch(/queryClientInstance\.clear\(\)/);
  expect(auth).toMatch(/zynergia_checkout_idempotency/);
  expect(auth).toMatch(/clearLocalSupabaseSession/);
});

test('migration locks billing writes behind RLS and service RPCs', async () => {
  const contents = await source(
    'supabase/migrations/202608190001_secure_billing_and_account_lifecycle.sql'
  );

  for (const table of [
    'billing_accounts',
    'access_grants',
    'stripe_webhook_events',
    'account_deletion_requests',
  ]) {
    expect(contents).toMatch(new RegExp(`alter table public\\.${table} enable row level security`));
  }
  expect(contents).toMatch(/grant execute on function public\.sync_stripe_billing_account[\s\S]+to service_role/);
  expect(contents).toMatch(/payload_sha256/);
  expect(contents).toMatch(/anonymized_at/);
});

test('account deletion preserves a paid period and delegates due work to a protected worker', async () => {
  const request = await source('api/account/deletion-request.js');
  const helper = await source('api/_lib/account-deletion.js');
  const worker = await source('api/account/process-deletions.js');
  const migration = await source(
    'supabase/migrations/202608190001_secure_billing_and_account_lifecycle.sql'
  );

  expect(request).toMatch(/request\.should_schedule/);
  expect(request).toMatch(/status: 'scheduled', executeAt: request\.execute_at/);
  expect(helper).toMatch(/cancel_at_period_end: true/);
  expect(worker).toMatch(/CRON_SECRET/);
  expect(worker).toMatch(/claim_due_account_deletions/);
  expect(worker).toMatch(/result\.failed > 0 \? 500 : 200/);
  expect(migration).toMatch(/current_period_end > now\(\)/);
  expect(migration).toMatch(/create or replace function public\.schedule_account_deletion/);
});

test('account deletion never preserves an unpaid or blocked billing period', async () => {
  const baseMigration = await source(
    'supabase/migrations/202608190001_secure_billing_and_account_lifecycle.sql'
  );
  const incidentMigration = await source(
    'supabase/migrations/202608190003_stripe_refunds_and_disputes.sql'
  );
  const helper = await source('api/_lib/account-deletion.js');

  expect(baseMigration).toMatch(/v_account\.subscription_status = 'active'/);
  expect(baseMigration).not.toMatch(/v_account\.subscription_status in \('active', 'trialing', 'past_due'\)/);
  expect(incidentMigration).toMatch(/v_account\.subscription_status = 'active'/);
  expect(incidentMigration).toMatch(/v_account\.access_blocked_reason is null/);
  expect(helper).toMatch(/subscriptions\.cancel/);
});

test('a Stripe trial never creates an application access grant', async () => {
  const incidentMigration = await source(
    'supabase/migrations/202608190003_stripe_refunds_and_disputes.sql'
  );
  const refreshGrant = incidentMigration.match(
    /create or replace function public\.refresh_stripe_access_grant[\s\S]*?\n\$\$;/
  )?.[0] || '';

  expect(refreshGrant).toMatch(/subscription_status = 'active'/);
  expect(refreshGrant).not.toMatch(/subscription_status in \('active', 'trialing'\)/);
});

test('legacy billing claim checks Stripe metadata before email fallback', async () => {
  const service = await source('api/_lib/billing-service.js');

  expect(service).toMatch(
    /stripeMetadataOwnership\(\[customer, selected\.subscription\], user\.id\)[\s\S]+metadata_owner_mismatch[\s\S]+syncSubscription\(selected\.subscription/
  );
});

test('email-only billing rows require a canonical expected Customer before claim', async () => {
  const service = await source('api/_lib/billing-service.js');
  const migration = await source(
    'supabase/migrations/202608190004_harden_billing_claim.sql'
  );
  const beforeCustomerValidation = migration.split(
    'if p_expected_stripe_customer_id is null'
  )[0];

  expect(service).toMatch(
    /claimRow\(user\)[\s\S]+discoverLegacyBilling\(user\)[\s\S]+claimRow\(user, discovered\.customerId\)/
  );
  expect(service).toMatch(/return \{ status: 'imported', customerId: customer\.id \}/);
  expect(migration).toMatch(/drop function if exists public\.claim_billing_account\(uuid, text\)/);
  expect(migration).toMatch(/return jsonb_build_object\('status', 'validation_required'\)/);
  expect(migration).toMatch(
    /where stripe_customer_id = p_expected_stripe_customer_id[\s\S]+for update[\s\S]+claim_email is distinct from v_email/
  );
  expect(migration).toMatch(/pg_advisory_xact_lock/);
  expect(migration).not.toMatch(/array_agg\(id\)/);
  expect(beforeCustomerValidation).not.toMatch(/set user_id = p_user_id/);
});

test('domain RPC release gate remains fail-closed when required evidence is missing', async () => {
  const gate = await source('supabase/scripts/predeploy-gate.mjs');
  const blocked = await source('supabase/pending/202608190002_domain_invariants.BLOCKED.sql');

  expect(gate).toMatch(/RELEASE_RPC_NOT_APPLIED/);
  expect(gate).toMatch(/SCHEMA_EXPORT_REQUIRED/);
  expect(gate).toMatch(/RLS_NOT_ENABLED/);
  expect(gate).toMatch(/LEGACY_RPC_MISSING/);
  expect(gate).toMatch(/SALE_CLIENT_NOT_ATOMIC/);
  expect(gate).toMatch(/SUPPORT_EMAIL_NOT_CONFIGURED/);
  expect(gate).toMatch(/SUPABASE_URL_NOT_CONFIGURED/);
  expect(gate).toMatch(/SUPABASE_ANON_KEY_NOT_CONFIGURED/);
  expect(blocked).toMatch(/DEPLOYMENT_BLOCKED/);
});

test('domain gate rejects a production snapshot before release-critical migrations are exported', () => {
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL('supabase/scripts/predeploy-gate.mjs', root)),
    fileURLToPath(new URL('supabase/schema.production.json', root)),
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DELETION_CRON_CONFIGURED: 'true',
      VITE_SUPPORT_EMAIL: 'support@example.com',
      VITE_APP_STORE_URL: 'https://apps.apple.com/app/id1',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    },
  });
  const report = JSON.parse(result.stdout || result.stderr);

  expect(report.ready).toBe(false);
  expect(report.failures ?? []).toContain('SCHEMA_TABLE_MISSING:billing_accounts');
  expect(report.failures ?? []).toContain('RELEASE_RPC_NOT_APPLIED:has_app_entitlement');
});

test('sales retries have a per-user idempotency key when the table exists', async () => {
  const migration = await source(
    'supabase/migrations/202608190002_sales_operation_id.sql'
  );

  expect(migration).toMatch(/add column if not exists operation_id uuid/);
  expect(migration).toMatch(/on public\.sales \(user_id, operation_id\)/);
  expect(migration).toMatch(/where operation_id is not null/);
});
