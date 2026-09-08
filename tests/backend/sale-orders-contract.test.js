import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('multi-item orders are additive, tenant-bound, atomic, and retry-safe', async () => {
  const migration = await source('supabase/migrations/202609070002_sale_orders_and_fast_start_v2.sql');
  const recordOrder = migration
    .split('create or replace function public.record_sale_order')[1]
    .split('-- Compatibility wrapper')[0];

  expect(migration).toMatch(/create table if not exists public\.sale_orders/);
  expect(migration).toMatch(/add column if not exists order_id uuid/);
  expect(migration).toMatch(/add column if not exists quantity integer not null default 1/);
  expect(migration).toMatch(/add column if not exists follow_up_stopped_at timestamptz/);
  expect(migration).toMatch(/old\.status = 'active' and new\.status = 'cancelled'[\s\S]+new\.follow_up_stopped_at := coalesce/);
  expect(migration).toMatch(/function public\.enforce_sale_client_update\(\)[\s\S]+security definer[\s\S]+set search_path = ''/);
  expect(migration).toMatch(/old\.status = 'active' and new\.status = 'cancelled'[\s\S]+delete from public\.tasks[\s\S]+origin = 'sale_automation'[\s\S]+due_date >= current_date[\s\S]+category in \('recompra', 'reactivacion'\)/);
  expect(migration).not.toMatch(/old\.status = 'active' and new\.status = 'cancelled'[\s\S]{0,900}origin = 'manual'/);
  expect(migration).toMatch(/alter column contact_id drop not null/);
  expect(migration).toMatch(/update public\.sale_orders historical_order[\s\S]+set contact_id = null[\s\S]+contact\.user_id = historical_order\.user_id/);
  expect(migration).toMatch(/foreign key \(contact_id\) references public\.contacts\(id\) on delete set null/);
  expect(recordOrder).toMatch(/p_operation_id is null or p_contact_id is null or p_purchase_date is null/);
  expect(recordOrder).toMatch(/coalesce\(p_sale_type, ''\) not in \('nueva', 'recompra'\)/);
  expect(recordOrder).toMatch(/security definer[\s\S]+set search_path = ''/);
  expect(recordOrder).toMatch(/has_app_entitlement\(v_user_id\)/);
  expect(recordOrder).toMatch(/from public\.contacts[\s\S]+user_id = v_user_id[\s\S]+for key share/);
  expect(recordOrder).toMatch(/pg_advisory_xact_lock/);
  expect(recordOrder.indexOf('from public.sale_orders')).toBeLessThan(recordOrder.indexOf('from public.contacts'));
  expect(recordOrder).toMatch(/where user_id = v_user_id[\s\S]+operation_id = p_operation_id[\s\S]+if found then[\s\S]+v_order\.content_hash is distinct from v_content_hash/);
  expect(recordOrder).toMatch(/group by btrim\(item->>'product_id'\)/);
  expect(recordOrder).toMatch(/insert into public\.sales[\s\S]+order_id, quantity/);
  expect(recordOrder).toMatch(/One follow-up sequence per distinct product/);
  expect(recordOrder).toMatch(/delete from public\.tasks[\s\S]+origin = 'sale_automation'[\s\S]+not coalesce\(completed, false\)/);
  expect(recordOrder).not.toMatch(/origin = 'sale_automation'[\s\S]{0,120}due_date >= current_date/);
  expect(recordOrder).toMatch(/insert into public\.tasks/);
  expect(recordOrder).toMatch(/to_regprocedure\('public\.queue_fast_start_refresh\(uuid\)'\)/);
  expect(recordOrder).toMatch(
    /join public\.partners relationship[\s\S]+relationship\.user_id = settings\.parent_id[\s\S]+relationship\.partner_user_id = settings\.user_id/,
  );
  const legacyWrapper = migration
    .split('create or replace function public.record_sale(')[1]
    .split('create or replace function public.stop_sale_follow_up')[0];
  expect(legacyWrapper).toMatch(/public\.record_sale_order\(/);
  expect(legacyWrapper).toMatch(/delete from public\.tasks[\s\S]+source_sale_id = v_sale\.id[\s\S]+origin = 'sale_automation'/);
  expect(migration).toMatch(/coalesce\(sale\.created_at, now\(\)\)/);
  expect(migration).toMatch(/coalesce\(old\.status, ''\) = 'active'[\s\S]+coalesce\(new\.status, ''\) = 'cancelled'/);
});

test('stopping follow-up preserves sales and removes only future product reminders', async () => {
  const migration = await source('supabase/migrations/202609070002_sale_orders_and_fast_start_v2.sql');
  const detailPage = await source('src/pages/ContactDetail.jsx');
  const stop = migration
    .split('create or replace function public.stop_sale_follow_up')[1]
    .split('-- Compatibility wrapper')[0];

  expect(stop).toMatch(/set follow_up_stopped_at = coalesce/);
  expect(stop).toMatch(/delete from public\.tasks/);
  expect(stop).toMatch(/category in \('recompra', 'reactivacion'\)/);
  expect(stop).toMatch(/origin = 'sale_automation'/);
  expect(stop).not.toMatch(/set status = 'cancelled'|delete from public\.sales/);
  expect(detailPage).toMatch(/rpc\('stop_sale_follow_up'/);
  expect(detailPage).not.toMatch(/db\.Sale\.update\([^)]*status: 'cancelled'/);
});

test('Fast Start v2 sums quantities for only the 11 official kits in date windows', async () => {
  const migration = await source('supabase/migrations/202609070002_sale_orders_and_fast_start_v2.sql');
  const teamPage = await source('src/pages/Partners.jsx');
  const snapshot = migration.split('create or replace function public.get_fast_start_snapshots_v2')[1];

  expect(snapshot).toMatch(/qteam_kits integer,[\s\S]+xteam_kits integer/);
  expect(snapshot).toMatch(/sum\(sale\.quantity\)/);
  expect(snapshot).toMatch(/sale\.sale_type = 'nueva'/);
  expect(snapshot).toMatch(/coalesce\(sale\.status, 'active'\) <> 'cancelled'/);
  expect(snapshot).toMatch(/sale\.follow_up_stopped_at is not null/);
  expect(snapshot).toMatch(/fast_start_started_at \+ 30/);
  expect(snapshot).toMatch(/fast_start_started_at \+ 120/);
  expect(snapshot).toMatch(/linked_branches[\s\S]+relationship\.start_date <= current_date/);
  expect(snapshot).toContain("'prod_kit_belage'");
  expect(snapshot).toContain("'prod_kit_serum'");
  expect(snapshot).not.toContain("'prod_belage'");
  expect(snapshot).not.toMatch(/jsonb_build_object\([^)]*(user_id|contact_id)/);
  expect(teamPage).toMatch(/rpc\('get_team_snapshot_v2'/);
  expect(teamPage).not.toContain('p_user_ids');
});

test('a linked branch without its own Fast Start date remains unknown', async () => {
  const migration = await source('supabase/migrations/202609070002_sale_orders_and_fast_start_v2.sql');

  expect(migration).toMatch(
    /when branch\.branch_started_at is null then null[\s\S]+end as qteam_kits/,
  );
  expect(migration).toMatch(/order by branch\.qteam_kits desc nulls last/);
});
