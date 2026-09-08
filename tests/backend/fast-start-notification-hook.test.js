import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

async function hookSource() {
  const migration = await source(
    'supabase/migrations/202609070004_notification_preferences_and_delivery.sql',
  );
  const hook = migration
    .split('create or replace function public.queue_fast_start_refresh')[1]
    .split('create or replace function public.enqueue_due_daily_summaries')[0];
  return { migration, hook };
}

test('Fast Start refresh is owner-bound and only callable inside the server transaction', async () => {
  const { migration, hook } = await hookSource();
  const salesMigration = await source(
    'supabase/migrations/202609070002_sale_orders_and_fast_start_v2.sql',
  );

  expect(hook).toMatch(/security definer[\s\S]+set search_path = ''/);
  expect(hook).toMatch(/v_caller_id uuid := auth\.uid\(\)/);
  expect(hook).toMatch(/p_user_id <> v_caller_id/);
  expect(hook).toMatch(/public\.has_app_entitlement\(v_caller_id\)/);
  expect(hook).not.toMatch(/set_config|get_fast_start_snapshots_v2|request\.jwt/);
  expect(migration).toMatch(
    /revoke all on function public\.queue_fast_start_refresh\(uuid\) from public, anon, authenticated/,
  );
  expect(migration).not.toMatch(
    /grant execute on function public\.queue_fast_start_refresh\(uuid\) to authenticated/,
  );
  expect(salesMigration).toMatch(
    /to_regprocedure\('public\.queue_fast_start_refresh\(uuid\)'\)[\s\S]+execute 'select public\.queue_fast_start_refresh\(\$1\)' using v_user_id/,
  );
});

test('Fast Start progress uses only official kit quantities and retry-safe milestone keys', async () => {
  const { hook } = await hookSource();

  expect(hook).toMatch(/sum\(sale\.quantity\)/);
  expect(hook).toMatch(/sale\.purchase_date between v_started_at and v_started_at \+ 30/);
  expect(hook).toMatch(/sale\.purchase_date between v_started_at and v_started_at \+ 120/);
  expect(hook).toMatch(/sale\.sale_type = 'nueva'/);
  expect(hook).toMatch(/sale\.purchase_date <= current_date/);
  expect(hook).toMatch(/coalesce\(sale\.status, 'active'\) <> 'cancelled'/);
  expect(hook).toMatch(/sale\.follow_up_stopped_at is not null/);
  expect(hook).toMatch(/pg_advisory_xact_lock\([\s\S]+fast_start_refresh:/);
  expect(hook).toContain("'prod_kit_belage'");
  expect(hook).toContain("'prod_kit_serum'");
  expect(hook).not.toContain("'prod_belage'");
  expect(hook).toMatch(/v_remaining := 4 - v_qteam_kits/);
  expect(hook).toMatch(/v_remaining := 10 - v_xteam_kits/);
  expect(hook).toContain("'fast-start:self:bonus:q-team:' || v_window_key");
  expect(hook).toContain("'fast-start:self:bonus:level-1:' || v_window_key");
  expect(hook).toContain("'fast-start:self:bonus:level-2:' || v_window_key");
  expect(hook).toContain("'fast-start:self:bonus:x-team:' || v_window_key");
  expect(hook).toContain("'fast-start:self:next:q-team:' || v_window_key");
  expect(hook).toContain("'fast-start:self:next:x-team:' || v_window_key");
  expect(hook).toMatch(/superseded_fast_start_window/);
  expect(hook).toMatch(/superseded_fast_start_action/);
  expect(hook).toMatch(/notification\.dedupe_key is distinct from v_dedupe_key/);
  expect(hook).toMatch(/v_partners_count < 2[\s\S]+Te falta 1 partner para Nivel 1/);
  expect(hook).toMatch(/v_completed_branches < 2[\s\S]+Te falta 1 rama para Nivel 2/);
  expect(hook.match(/v_qteam_kits >= 4 and v_partners_count >= 2 and v_completed_branches >= 2/g)).toHaveLength(2);
  expect(hook.match(/v_qteam_kits >= 4 and v_partners_count >= 2[\s\S]{0,80}v_completed_branches < 2/g)).toHaveLength(2);
  expect(hook).toContain('Revisa el estado de tu bono Q-Team.');
  expect(hook).toContain('Revisa el estado de tu bono X-Team.');
  expect(hook).toMatch(/current_date <= v_started_at \+ 30/);
  expect(hook).toMatch(/current_date <= v_started_at \+ 120/);
  expect(hook).not.toMatch(/v_dedupe_key is null and v_xteam_kits >= 10/);
  expect(hook.match(/on conflict \(user_id, dedupe_key\)[\s\S]*?do nothing/g)).toHaveLength(10);
});

test('self and linked-leader pushes honor preferences without exposing CRM records', async () => {
  const { hook } = await hookSource();

  expect(hook).toMatch(
    /settings\.notifications_enabled is true[\s\S]+settings\.push_consent_given[\s\S]+settings\.fast_start_notifications_enabled/,
  );
  expect(hook).toMatch(
    /select child\.parent_id, relationship\.id::text[\s\S]+relationship\.user_id = child\.parent_id[\s\S]+relationship\.partner_user_id = p_user_id/,
  );
  expect(hook).toMatch(
    /leader_settings\.user_id = v_leader_id[\s\S]+leader_settings\.push_consent_given[\s\S]+leader_settings\.fast_start_notifications_enabled/,
  );
  expect(hook).toMatch(/access_grant\.status in \('active', 'grace'\)/);
  expect(hook).toMatch(/'info', 'partner', v_partner_id/);
  expect(hook).toMatch(/'\/Partners\?partnerId=' \|\| v_partner_id/);
  expect(hook).toContain('Un partner vinculado alcanzó 4 kits Premier. Revisa el estado de su bono.');
  expect(hook).toContain('Su avance real está a 1 kit Premier de su siguiente meta.');
  expect(hook).toContain("'fast-start:partner:' || p_user_id::text || ':bonus:q-team:' || v_window_key");
  expect(hook).toContain("'fast-start:partner:' || p_user_id::text || ':bonus:level-1:' || v_window_key");
  expect(hook).toContain("'fast-start:partner:' || p_user_id::text || ':bonus:level-2:' || v_window_key");
  expect(hook).toContain("'fast-start:partner:' || p_user_id::text || ':next:x-team:' || v_window_key");
  expect(hook).not.toMatch(/contact_id|order_id|full_name|user_phone|phone_e164/);
});

test('Fast Start refresh follows date, direct-team and branch-sale changes', async () => {
  const { migration } = await hookSource();
  const salesMigration = await source(
    'supabase/migrations/202609070002_sale_orders_and_fast_start_v2.sql',
  );

  expect(migration).toMatch(/create trigger settings_refresh_fast_start[\s\S]+update of fast_start_started_at, parent_id/);
  expect(migration).toMatch(/create trigger partners_refresh_fast_start[\s\S]+update of start_date, partner_user_id/);
  expect(migration).toMatch(
    /new\.parent_id is distinct from old\.parent_id[\s\S]+queue_fast_start_refresh\(new\.user_id\)[\s\S]+queue_fast_start_refresh\(new\.parent_id\)/,
  );
  expect(migration).toMatch(/perform public\.queue_fast_start_refresh\(new\.parent_id\)/);
  expect(salesMigration).toMatch(/select settings\.parent_id[\s\S]+queue_fast_start_refresh\(\$1\)' using v_parent_id/);
});
