import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const migrationUrl = new URL(
  '../../supabase/migrations/202609010003_custom_products_and_templates.sql',
  import.meta.url,
);

async function migration() {
  return readFile(migrationUrl, 'utf8');
}

test('custom products keep stable public IDs and require entitled ownership', async () => {
  const sql = await migration();

  expect(sql).toMatch(/create table if not exists public\.user_products/);
  expect(sql).toMatch(/unique \(user_id, product_id\)/);
  expect(sql).toMatch(/alter table public\.user_products enable row level security/);
  expect(sql).toMatch(/auth\.uid\(\) = user_id[\s\S]+has_app_entitlement\(auth\.uid\(\)\)/);
  expect(sql).toMatch(/from public\.product_links[\s\S]+on conflict \(user_id, product_id\) do nothing/);
});

test('message defaults cannot cross users or contacts', async () => {
  const sql = await migration();

  expect(sql).toMatch(/create table if not exists public\.message_templates/);
  expect(sql).toMatch(/unique \(user_id, template_id\)/);
  expect(sql).toMatch(/message_templates_default_general_idx/);
  expect(sql).toMatch(/message_templates_default_contact_idx/);
  expect(sql).toMatch(/message_templates_clear_previous_default/);
  expect(sql).toMatch(/c\.id = message_templates\.contact_id[\s\S]+c\.user_id = auth\.uid\(\)/);
  expect(sql).toMatch(/from public\.user_templates[\s\S]+on conflict \(user_id, template_id\) do nothing/);
});
