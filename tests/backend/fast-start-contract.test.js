import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('Fast Start date is server-owned, entitled, and editable from Team', async () => {
  const migration = await source(
    'supabase/migrations/202609010006_fast_start_dates_and_branch_metrics.sql',
  );
  const team = await source('src/pages/Partners.jsx');
  const dashboard = await source('src/components/partners/FastStartDashboard.jsx');

  expect(migration).toMatch(/add column if not exists fast_start_started_at date/);
  expect(migration).toMatch(/create or replace function public\.set_fast_start_date\(p_started_at date\)/);
  expect(migration).toMatch(/has_app_entitlement\(v_user_id\)/);
  expect(migration).toMatch(/set fast_start_started_at = p_started_at[\s\S]+where user_id = v_user_id/);
  expect(migration).toMatch(/revoke all on function public\.set_fast_start_date\(date\) from public, anon, authenticated/);
  expect(migration).toMatch(/grant execute on function public\.set_fast_start_date\(date\) to authenticated/);

  expect(team).toMatch(/rpc\('set_fast_start_date', \{ p_started_at: date \}\)/);
  expect(team).toMatch(/type="date"[\s\S]+max=\{today\(\)\}/);
  expect(team).toContain('Sí, cambiar fecha');
  expect(dashboard).toContain('Configurar fecha de inicio');
  expect(dashboard).toContain('Cambiar');
  expect(dashboard).toContain('No mostraremos cifras sin verificar');
  expect(dashboard).toMatch(/metricsLoading \|\| metricsUnavailable \? '—'/);
  expect(team).toContain('onRetryMetrics={refetchFastStartSnapshots}');
});

test('Fast Start metrics expose only aggregate linked-branch counts', async () => {
  const migration = await source(
    'supabase/migrations/202609010006_fast_start_dates_and_branch_metrics.sql',
  );
  const metrics = migration.split('create function public.get_partners_fs_metrics')[1];

  expect(metrics).toMatch(/fast_start_started_at date,[\s\S]+direct_branches jsonb/);
  expect(metrics).toMatch(/p\.partner_user_id as branch_user_id[\s\S]+p\.partner_user_id is not null/);
  expect(metrics).toMatch(/left join public\.sales s on s\.user_id = branch\.branch_user_id/);
  expect(metrics).toMatch(/jsonb_build_object\('premier_clients', branch\.premier_clients\)/);
  expect(metrics).not.toMatch(/jsonb_build_object\([^)]*user_id/);
  expect(metrics).not.toMatch(/jsonb_build_object\([^)]*contact_id/);
  expect(metrics).toContain("'prod_kit_balanceoil'");
  expect(metrics).toContain("'prod_kit_serum'");
  expect(metrics).not.toMatch(/any\(premier_product_ids\)/);
});
