import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('notification preference grants keep released settings upserts compatible', async () => {
  const migration = await source('supabase/migrations/202609070004_notification_preferences_and_delivery.sql');
  const database = await source('src/api/db.js');

  expect(database).toMatch(/from\('settings'\)[\s\S]+\.upsert\(\{ \.\.\.ownedPayload\(payload\), user_id: uid \}/);
  expect(migration).toMatch(/grant insert \([\s\S]+user_id[\s\S]+\) on public\.settings to authenticated/);
  expect(migration).toMatch(/grant update \([\s\S]+user_id, user_name[\s\S]+\) on public\.settings to authenticated/);
  expect(migration).toMatch(/revoke all on table public\.notifications from public, anon, authenticated/);
  expect(migration).toMatch(/grant select on table public\.notifications to authenticated/);
  expect(migration).toMatch(/grant insert \(user_id, title, body, type, related_entity_type, is_read, created_date\)/);
  expect(migration).toMatch(/grant update \(is_read\) on public\.notifications to authenticated/);
  expect(migration).toMatch(/function public\.validate_settings_timezone_write\(\)[\s\S]+pg_catalog\.pg_timezone_names/);
  expect(migration).toMatch(/before insert or update of timezone on public\.settings/);
  expect(migration).toMatch(/invalid_settings_timezone/);
});

test('push outbox leases work, fences stale workers and retries transient failures', async () => {
  const migration = await source('supabase/migrations/202609070004_notification_preferences_and_delivery.sql');
  const processor = await source('api/notifications/process.js');
  const claim = migration
    .split('create or replace function public.claim_push_notifications')[1]
    .split('drop function if exists public.finish_push_notification')[0];
  const finish = migration
    .split('create or replace function public.finish_push_notification')[1]
    .split('create or replace function public.delete_user_data')[0];

  expect(migration).toMatch(/delivery_attempt_count integer not null default 0/);
  expect(migration).toMatch(/delivery_next_attempt_at timestamptz/);
  expect(migration).toMatch(/delivery_lease_until timestamptz/);
  expect(claim).toMatch(/delivery_status = 'sending'/);
  expect(claim).toMatch(/delivery_lease_until = now\(\) \+ interval '2 minutes'/);
  expect(claim).toMatch(/delivery_attempt_count = n\.delivery_attempt_count \+ 1/);
  expect(finish).toMatch(/delivery_attempt_count = p_attempt_count/);
  expect(finish).toMatch(/p_error_code like 'retryable:%'/);
  expect(finish).toMatch(/delivery_attempt_count < 5 then 'pending'/);
  expect(migration).toMatch(/provider[\s\S]{0,20}acceptance, not delivery to a device/);
  expect(migration).toMatch(/`delivered`\/`delivered_at` are reserved/);
  expect(finish).toMatch(/when p_sent then 'sent'/);
  expect(finish).not.toMatch(/delivered_at\s*=/);
  expect(processor).toMatch(/p_limit: 20/);
  expect(processor).toMatch(/runWorkers\(pending \|\| \[\], 5/);
  expect(processor).toMatch(/p_attempt_count: notification\.attempt_count/);
  expect(processor).toMatch(/retryable \? `retryable:\$\{errorCode\}` : errorCode/);
});

test('push worker uses Supabase Cron because Vercel Hobby cannot run hourly jobs', async () => {
  const deployment = JSON.parse(await source('vercel.json'));
  const scheduler = await source('supabase/scripts/configure-notification-cron.sql');
  const gate = await source('supabase/scripts/predeploy-gate.mjs');

  expect(deployment.crons).not.toContainEqual(expect.objectContaining({
    path: '/api/notifications/process',
  }));
  expect(scheduler).toMatch(/'zynergia-push-worker'/);
  expect(scheduler).toMatch(/'\*\/10 \* \* \* \*'/);
  expect(scheduler).toMatch(/vault\.decrypted_secrets/);
  expect(scheduler).toMatch(/Authorization/);
  expect(scheduler).not.toMatch(/Bearer [A-Za-z0-9_-]{24}/);
  expect(gate).toMatch(/PUSH_CRON_NOT_ATTESTED/);
});

test('enqueue and claim revalidate entitlement and current notification preferences', async () => {
  const migration = await source('supabase/migrations/202609070004_notification_preferences_and_delivery.sql');
  const daily = migration
    .split('create or replace function public.enqueue_due_daily_summaries')[1]
    .split('create or replace function public.claim_push_notifications')[0];
  const claim = migration
    .split('create or replace function public.claim_push_notifications')[1]
    .split('drop function if exists public.finish_push_notification')[0];

  for (const fragment of [daily, claim]) {
    expect(fragment).toMatch(/access_grant\.status in \('active', 'grace'\)/);
    expect(fragment).toMatch(/access_grant\.revoked_at is null/);
  }
  expect(daily).toMatch(/s\.daily_summary_enabled/);
  expect(daily).toMatch(/s\.notifications_enabled is true/);
  expect(daily).toMatch(/s\.push_consent_given/);
  expect(claim).toMatch(/s\.notifications_enabled is true/);
  expect(claim).toMatch(/s\.push_consent_given/);
  expect(claim).not.toMatch(/coalesce\(s\.notifications_enabled, true\)/);
  expect(claim).toMatch(/n\.dedupe_key like 'daily:%' then s\.daily_summary_enabled/);
  expect(claim).toMatch(/n\.dedupe_key like 'fast-start:%' then s\.fast_start_notifications_enabled/);
  expect(claim).toMatch(/else s\.task_notifications_enabled/);
  expect(claim).toMatch(/delivery_error_code = 'push_not_allowed'/);
});

test('1.2 account deletion covers additive tables after storage cleanup', async () => {
  const migration = await source('supabase/migrations/202609070004_notification_preferences_and_delivery.sql');
  const helper = await source('api/_lib/account-deletion.js');
  const deletion = migration.split('create or replace function public.delete_user_data')[1];

  for (const table of [
    'contact_batch_operations',
    'sale_orders',
    'template_categories',
    'template_share_imports',
    'template_share_bundles',
  ]) expect(deletion).toContain(table);
  expect(helper).toMatch(/deleteUserProductImages\(admin, request\.user_id\)[\s\S]+delete_user_data/);
  expect(helper).toMatch(/storage\.from\('product-images'\)/);
});

test('automatic auth transitions disconnect the previous OneSignal identity first', async () => {
  const auth = await source('src/lib/AuthContext.jsx');
  const push = await source('src/lib/pushNotifications.js');
  const transition = auth
    .split('const applySession = nextSession =>')[1]
    .split('// Read existing session')[0];
  const disconnect = push
    .split('export async function disconnectPushIdentity')[1]
    .split('export async function requestPushPermission')[0];

  expect(transition).toMatch(/const previousUserId = activeUserId\.current/);
  expect(transition).toMatch(/if \(previousUserId\) await disconnectPushIdentity\(\)/);
  expect(transition).not.toMatch(/setPushIdentity\(nextUserId\)/);
  expect(auth).toMatch(/const pushIdentityQueue = useRef\(Promise\.resolve\(\)\)/);
  expect(disconnect).toMatch(/await OneSignal\.logout\(\)/);
  expect(disconnect).not.toMatch(/optOut/);
});

test('the Capacitor client never passes a Supabase user id directly to OneSignal', async () => {
  const push = await source('src/lib/pushNotifications.js');
  const identityEndpoint = await source('api/notifications/identity.js');

  expect(push).toMatch(/apiFetch\('\/api\/notifications\/identity'\)/);
  expect(push).toMatch(/OneSignal\.login\(externalId\)/);
  expect(push).not.toMatch(/OneSignal\.login\((?:String\()?userId/);
  expect(identityEndpoint).toMatch(/authenticatedUser\(req\)/);
  expect(identityEndpoint).toMatch(/Cache-Control', 'no-store'/);
});
