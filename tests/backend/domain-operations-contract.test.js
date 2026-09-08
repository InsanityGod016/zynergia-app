import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('record_sale is authenticated, tenant-bound, and idempotent under retries', async () => {
  const migration = await source(
    'supabase/migrations/202609010002_domain_atomic_operations.sql'
  );
  const recordSale = migration
    .split('create or replace function public.record_sale')[1]
    .split('create or replace function public.anonymize_contact')[0];

  expect(migration).toMatch(/add column if not exists operation_id uuid/);
  expect(migration).toMatch(/on public\.sales \(user_id, operation_id\)/);
  expect(recordSale).toMatch(/security definer/);
  expect(recordSale).toMatch(/set search_path = ''/);
  expect(recordSale).toMatch(/v_user_id uuid := auth\.uid\(\)/);
  expect(recordSale).toMatch(/has_app_entitlement\(v_user_id\)/);
  expect(recordSale).toMatch(/from public\.contacts[\s\S]+user_id = v_user_id/);
  expect(recordSale).toMatch(/for key share/);
  expect(recordSale).toMatch(/on conflict \(user_id, operation_id\)[\s\S]+do nothing/);
  expect(recordSale).toMatch(/operation_id_reused_with_different_sale/);
  expect(recordSale).not.toMatch(/insert into public\.tasks|update public\.partners/);
  expect(migration).toMatch(
    /grant execute on function public\.record_sale\(uuid, uuid, text, date, text\)[\s\S]+to authenticated/
  );
});

test('anonymize_contact preserves anonymous sales and removes owned personal work', async () => {
  const migration = await source(
    'supabase/migrations/202609010002_domain_atomic_operations.sql'
  );
  const anonymize = migration.split(
    'create or replace function public.anonymize_contact'
  )[1];

  expect(anonymize).toMatch(/v_user_id uuid := auth\.uid\(\)/);
  expect(anonymize).toMatch(/has_app_entitlement\(v_user_id\)/);
  expect(anonymize).toMatch(/from public\.contacts[\s\S]+for update/);
  expect(anonymize).toMatch(/v_owner_id <> v_user_id[\s\S]+contact_not_owned/);
  expect(anonymize).toMatch(
    /update public\.sales[\s\S]+set contact_id = null[\s\S]+user_id = v_user_id/
  );
  expect(anonymize).toMatch(
    /delete from public\.tasks[\s\S]+user_id = v_user_id[\s\S]+not coalesce\(completed, false\)/
  );
  expect(anonymize).toMatch(/Seguimiento de contacto eliminado/);
  expect(anonymize).toMatch(/hashtextextended\('zynergia_partner_graph', 0\)/);
  expect(anonymize).toMatch(/to_regclass\('public\.message_templates'\)/);
  expect(anonymize).toMatch(/set contact_id = null, archived_at = coalesce/);
  expect(anonymize).toMatch(
    /update public\.settings child[\s\S]+set parent_id = null[\s\S]+relationship\.partner_user_id = child\.user_id/
  );
  expect(anonymize).toMatch(
    /delete from public\.partners[\s\S]+user_id = v_user_id[\s\S]+contact_id = p_contact_id/
  );
  expect(anonymize).toMatch(
    /delete from public\.contacts[\s\S]+id = p_contact_id[\s\S]+user_id = v_user_id/
  );
  expect(anonymize).toMatch(/status', 'already_removed'/);
  expect(migration).toMatch(
    /grant execute on function public\.anonymize_contact\(uuid\)[\s\S]+to authenticated/
  );
});

test('the sale confirmation delegates the complete order to one atomic RPC', async () => {
  const page = await source('src/pages/NewSale4.jsx');

  expect(page).toMatch(/\.rpc\('record_sale_order'/);
  for (const parameter of [
    'p_operation_id',
    'p_contact_id',
    'p_items',
    'p_purchase_date',
    'p_sale_type',
  ]) {
    expect(page).toContain(parameter);
  }
  expect(page).not.toMatch(/db\.Sale\.create\(/);
  expect(page).not.toMatch(/createSaleTasks\(/);
  expect(page).not.toMatch(/recalculateAllPartners\(/);
  expect(page).toMatch(/isValidSaleDate\(purchaseDate, today\)/);
});

test('sale cart and manual task choices survive navigation or relaunch', async () => {
  const cart = await source('src/pages/NewSale2.jsx');
  const task = await source('src/pages/NewTask.jsx');

  expect(cart).toMatch(/cartChanged[\s\S]+purchaseDate: null, saleType: null/);
  expect(cart).toMatch(/useMemo\(\(\) => readSaleDraft\(\), \[\]\)/);
  expect(task).toMatch(/saveDraft\(\{ reason: item\.value, templateId: '', productId: nextProductId \}\)/);
  expect(task).toMatch(/saveDraft\(\{ productId: event\.target\.value \}\)/);
  expect(task).toMatch(/saveDraft\(\{ templateId: event\.target\.value \}\)/);
});
