import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('legacy team RPCs enforce authenticated direct-team access', async () => {
  const migration = await source(
    'supabase/migrations/202609010001_secure_legacy_team_rpcs.sql'
  );

  expect(migration).toMatch(/auth\.uid\(\) is null/);
  expect(migration).toMatch(/has_app_entitlement\(auth\.uid\(\)\)/);
  expect(migration).toMatch(/relationship\.user_id = auth\.uid\(\)/);
  expect(migration).toMatch(/relationship\.partner_user_id = p_user_id/);
  expect(migration).toMatch(/revoke all on function public\.get_partners_fs_metrics[\s\S]+from public, anon, authenticated/);
  expect(migration).toMatch(/revoke all on function public\.import_partner_clients[\s\S]+service_role/);
  expect(migration).not.toMatch(/tasks where user_id = p_user_id and status = 'completed'/);
});

test('all exposed CRM tables require a live entitlement in RLS', async () => {
  const migration = await source(
    'supabase/migrations/202609010000_domain_entitlement_policies.sql'
  );

  expect(migration).toMatch(/create or replace function public\.has_app_entitlement/);
  expect(migration).toMatch(/p_user_id = auth\.uid\(\)/);
  expect(migration).toMatch(/exists \(select 1 from auth\.users where id = p_user_id\)/);
  expect(migration).toMatch(/grant_row\.status in \('active', 'grace'\)/);
  for (const table of [
    'contacts', 'notifications', 'product_links', 'sales', 'tags', 'tasks',
    'user_templates',
  ]) {
    expect(migration).toContain(`'${table}'`);
  }
  expect(migration).toMatch(/create policy settings_select_own[\s\S]+public\.has_app_entitlement/);
  expect(migration).toMatch(/create policy partners_select_own[\s\S]+public\.has_app_entitlement/);
  expect(migration).toMatch(/with check \(auth\.uid\(\) = user_id and public\.has_app_entitlement/);
});

test('team graph columns cannot be written directly by authenticated clients', async () => {
  const migration = await source(
    'supabase/migrations/202609010000_domain_entitlement_policies.sql'
  );

  expect(migration).toMatch(/revoke all on table public\.settings from public, anon, authenticated/);
  expect(migration).toMatch(/revoke all on table public\.partners from public, anon, authenticated/);
  expect(migration).toMatch(/create policy settings_(select|insert|update)_own/);
  expect(migration).toMatch(/create policy partners_(select|insert|update)_own/);
  expect(migration).toMatch(/and partner_code is null[\s\S]+and parent_id is null/);
  expect(migration).toMatch(/partner_user_id is null/);
  expect(migration).toMatch(/c\.id = partners\.contact_id and c\.user_id = auth\.uid\(\)/);

  const settingsInsertGrant = migration.match(/grant insert \([\s\S]*?\) on public\.settings to authenticated;/)?.[0] || '';
  const settingsUpdateGrant = migration.match(/grant update \([\s\S]*?\) on public\.settings to authenticated;/)?.[0] || '';
  const partnerInsertGrant = migration.match(/grant insert \([\s\S]*?\) on public\.partners to authenticated;/)?.[0] || '';
  const partnerUpdateGrant = migration.match(/grant update \([\s\S]*?\) on public\.partners to authenticated;/)?.[0] || '';

  expect(settingsInsertGrant).not.toMatch(/partner_code|parent_id/);
  expect(settingsUpdateGrant).not.toMatch(/partner_code|parent_id/);
  expect(partnerInsertGrant).not.toMatch(/partner_user_id/);
  expect(partnerUpdateGrant).not.toMatch(/partner_user_id/);
});

test('partner linking is server-atomic and code-bound', async () => {
  const migration = await source(
    'supabase/migrations/202609010001_secure_legacy_team_rpcs.sql'
  );
  const list = await source('src/pages/Partners.jsx');
  const detail = await source('src/components/partners/PartnerDetailSheet.jsx');

  expect(migration).toMatch(/create or replace function public\.link_partner_by_code/);
  expect(migration).toMatch(/create or replace function public\.link_existing_partner_by_code/);
  expect(migration).toMatch(/self_link_not_allowed/);
  expect(migration).toMatch(/partner_cycle_detected/);
  expect(migration).toMatch(/partner_already_linked/);
  expect(list).toMatch(/rpc\('link_partner_by_code'/);
  expect(detail).toMatch(/rpc\('link_existing_partner_by_code'/);
  expect(list).not.toMatch(/rpc\('set_parent_id'/);
  expect(detail).not.toMatch(/rpc\('set_parent_id'/);
});

test('partner codes and relationships are unique and mutated under one graph lock', async () => {
  const migration = await source(
    'supabase/migrations/202609010001_secure_legacy_team_rpcs.sql'
  );

  expect(migration).toMatch(/duplicate_partner_codes_case_insensitive/);
  expect(migration).toMatch(/duplicate_partner_relationships/);
  expect(migration).toMatch(/settings_partner_code_ci_idx[\s\S]+upper\(partner_code\)/);
  expect(migration).toMatch(/partners_linked_user_unique_idx[\s\S]+partner_user_id/);
  expect(migration).toMatch(/create or replace function public\.ensure_partner_code\(\)/);
  expect(migration).toMatch(/create or replace function public\.join_upline_by_code\(p_code text\)/);
  expect(migration.match(/hashtextextended\('zynergia_partner_graph', 0\)/g)?.length).toBeGreaterThanOrEqual(5);
});

test('legacy graph/raw-sales RPCs stay revoked while onboarding uses code-bound RPCs', async () => {
  const migration = await source(
    'supabase/migrations/202609010001_secure_legacy_team_rpcs.sql'
  );
  const onboarding = await source('src/pages/Onboarding.jsx');
  const settings = await source('src/pages/Settings.jsx');
  const more = await source('src/pages/More.jsx');
  const partners = await source('src/pages/Partners.jsx');

  for (const signature of [
    'get_partner_sales_data\\(uuid\\)',
    'register_as_partner\\(uuid, text, uuid\\)',
    'set_parent_id\\(uuid, uuid\\)',
    'import_partner_clients\\(uuid\\)',
  ]) {
    expect(migration).toMatch(new RegExp(`revoke all on function public\\.${signature}[\\s\\S]*?authenticated`));
    expect(migration).not.toMatch(new RegExp(`grant execute on function public\\.${signature}`));
  }

  expect(onboarding).toMatch(/rpc\('ensure_partner_code'/);
  expect(onboarding).toMatch(/rpc\('join_upline_by_code'/);
  expect(onboarding).not.toMatch(/register_as_partner|parent_id\s*:|partner_code\s*:/);
  expect(settings).toMatch(/rpc\('ensure_partner_code'/);
  expect(settings).not.toMatch(/Settings\.update\([^)]*partner_code/);
  expect(more).toMatch(/rpc\('ensure_partner_code'/);
  expect(partners).not.toMatch(/partner_user_id:\s*partnerUserId/);
});

test('Fast Start ignores the caller product filter and uses the canonical Premier IDs', async () => {
  const migration = await source(
    'supabase/migrations/202609010001_secure_legacy_team_rpcs.sql'
  );
  const metrics = migration
    .split('create or replace function public.get_partners_fs_metrics')[1]
    .split('create or replace function public.register_as_partner')[0];

  expect(metrics).toContain("'prod_kit_balanceoil'");
  expect(metrics).toContain("'prod_kit_serum'");
  expect(metrics).not.toMatch(/coalesce\(premier_product_ids/);
  expect(metrics).not.toMatch(/any\(premier_product_ids/);
});

test('team activity never exposes another account billing status', async () => {
  const migration = await source(
    'supabase/migrations/202609010001_secure_legacy_team_rpcs.sql'
  );
  const activity = migration
    .split('create function public.get_partners_activity')[1]
    .split('create or replace function public.get_partners_fs_metrics')[0];

  expect(activity).toMatch(/returns table\(user_id uuid, last_active timestamptz\)/);
  expect(activity).not.toContain('subscription_status');
});
