import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const migrationUrl = new URL('../../supabase/migrations/202609070003_template_categories_and_sharing.sql', import.meta.url);
const migration = () => readFile(migrationUrl, 'utf8');
const source = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('template sharing database contract', () => {
  it('keeps categories private and tied to one canonical situation', async () => {
    const sql = await migration();
    expect(sql).toMatch(/create table if not exists public\.template_categories/);
    expect(sql).toMatch(/situation in \([\s\S]+'repurchase'[\s\S]+'manual'/);
    expect(sql).toMatch(/template_categories_entitled_own[\s\S]+auth\.uid\(\) = user_id/);
    expect(sql).toMatch(/message_templates_category_owner_fk/);
    expect(sql).toMatch(/foreign key \(category_id\)/);
    expect(sql).toMatch(/tc\.user_id = auth\.uid\(\)[\s\S]+tc\.situation = message_templates\.situation/);
    expect(sql).toMatch(/revoke update, delete on table public\.template_categories from authenticated/);
  });

  it('builds immutable snapshots from owned template ids and stores only a token hash', async () => {
    const sql = await migration();
    const createShare = sql
      .split('create or replace function public.create_template_share_bundle')[1]
      .split('create or replace function public.preview_template_share_bundle')[0];
    expect(sql).toMatch(/token_hash text not null unique/);
    expect(sql).toMatch(/unique \(owner_id, operation_id\)/);
    expect(createShare).toMatch(/p_operation_id uuid[\s\S]+p_template_ids text\[\]/);
    expect(createShare).toMatch(/join public\.message_templates template[\s\S]+template\.user_id = v_user_id/);
    expect(createShare).toMatch(/template_not_owned_missing_or_invalid/);
    expect(createShare).not.toMatch(/p_snapshot/);
    expect(sql).toMatch(/extensions\.digest\(v_token, 'sha256'\)/);
    expect(sql).not.toMatch(/insert into public\.template_share_bundles[\s\S]{0,250}'contact_id'/);
    expect(sql).not.toMatch(/insert into public\.template_share_bundles[\s\S]{0,250}'is_default'/);
    expect(sql).toMatch(/now\(\) \+ interval '30 days'/);
    expect(createShare).toMatch(/operation_id_reused_with_different_templates/);
  });

  it('imports once per account and operation without contact assignments or defaults', async () => {
    const sql = await migration();
    const importShare = sql
      .split('create or replace function public.import_template_share_bundle')[1]
      .split('create or replace function public.revoke_template_share_bundle')[0];
    expect(sql).toMatch(/primary key \(bundle_id, user_id\)/);
    expect(sql).toMatch(/unique \(user_id, operation_id\)/);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(importShare).toMatch(/from public\.template_share_bundles[\s\S]+token_hash = v_request_hash[\s\S]+for update/);
    expect(sql).toMatch(/contact_id, origin, is_default[\s\S]+null,[\s\S]+'user',[\s\S]+false/);
    expect(importShare).toMatch(/operation_id_reused_with_different_share/);
    expect(importShare).toMatch(/\|\| ' \(importada\)'/);
    expect(sql).toMatch(/revoke_template_share_bundle/);
    const previewShare = sql
      .split('create or replace function public.preview_template_share_bundle')[1]
      .split('create or replace function public.import_template_share_bundle')[0];
    expect(previewShare).toMatch(/auth\.uid\(\) is null[\s\S]+authentication_required/);
    expect(previewShare).toMatch(/public\.has_app_entitlement\(auth\.uid\(\)\)[\s\S]+app_entitlement_required/);
    expect(sql).toMatch(/grant execute on function public\.preview_template_share_bundle\(text\) to authenticated/);
    expect(sql).not.toMatch(/grant execute on function public\.preview_template_share_bundle\(text\) to anon/);
    expect(sql).toMatch(/create or replace function public\.create_template_share\(/);
    expect(sql).toMatch(/create or replace function public\.preview_template_share\(/);
    expect(sql).toMatch(/create or replace function public\.import_template_share\(/);
    expect(sql).toMatch(/create or replace function public\.revoke_template_share\(/);
    expect(sql).toMatch(/grant execute on function public\.preview_template_share\(text\) to authenticated/);
    expect(sql).not.toMatch(/grant execute on function public\.preview_template_share\(text\) to anon/);
    expect(sql).toMatch(/create table if not exists public\.template_share_imports/);
    expect(sql).not.toMatch(/create table if not exists public\.template_bundle_imports/);
  });

  it('routes template updates, defaults and archives through owned RPCs', async () => {
    const sql = await migration();
    const database = await source('src/api/db.js');
    expect(sql).toMatch(/revoke delete on table public\.message_templates from authenticated/);
    expect(sql).toMatch(/grant select, insert, update on table public\.message_templates to authenticated/);
    expect(sql).toMatch(/create or replace function public\.update_message_template/);
    expect(sql).toMatch(/create or replace function public\.archive_message_template/);
    expect(sql).toMatch(/create or replace function public\.set_template_default/);
    expect(sql).toMatch(/set archived_at = now\(\), is_default = false/);
    expect(sql).toMatch(/set is_default = false[\s\S]+contact_id is not distinct from v_template\.contact_id/);
    const createTemplate = database.split('const Template = {')[1].split('async update(id, payload) {')[0];
    expect(createTemplate).toMatch(/if \(shouldBeDefault\)[\s\S]+set_template_default/);
  });

  it('validates direct 1.1.1 writes without breaking sparse legacy overrides', async () => {
    const sql = await migration();
    const validator = sql
      .split('create or replace function public.validate_message_template_write')[1]
      .split('create or replace function public.update_message_template')[0];
    expect(validator).toMatch(/char_length\(btrim\(coalesce\(new\.template_id, ''\)\)\) not between 1 and 200/);
    expect(validator).toMatch(/char_length\(coalesce\(new\.content, ''\)\) not between 1 and 5000/);
    expect(validator).toMatch(/contact\\\.full_name\|product\\\.name\|product\\\.link_url/);
    expect(validator).toMatch(/new\.origin = 'user'[\s\S]+new\.name is null[\s\S]+new\.situation is null/);
    expect(validator).toMatch(/new\.name is not null and char_length/);
    expect(sql).toMatch(/before insert or update of[\s\S]+content[\s\S]+category_id[\s\S]+on public\.message_templates/);
    expect(sql).not.toMatch(/before insert or update of[\s\S]{0,250}is_default/);
    expect(sql).toMatch(/revoke all on function public\.validate_message_template_write\(\) from public, anon, authenticated/);
  });

  it('passes stable operation ids and template ids from both client flows', async () => {
    const [db, templates, importer] = await Promise.all([
      source('src/api/db.js'),
      source('src/pages/Templates.jsx'),
      source('src/pages/ImportTemplates.jsx'),
    ]);
    expect(db).toMatch(/rpc\('create_template_share',[\s\S]+p_operation_id: operationId[\s\S]+p_template_ids:/);
    expect(db).toMatch(/rpc\('import_template_share',[\s\S]+p_operation_id: operationId[\s\S]+p_token: token/);
    expect(db).toMatch(/rpc\('revoke_template_share',[\s\S]+p_share_id: id/);
    expect(db).not.toMatch(/from\('message_templates'\)[\s\S]{0,180}\.update\(/);
    expect(db).not.toMatch(/from\('message_templates'\)[\s\S]{0,180}\.delete\(/);
    expect(templates).toMatch(/shareOperationRef[\s\S]+TemplateShare\.create\(shareOperationRef\.current\.id, selected\)/);
    expect(importer).toMatch(/importOperationId[\s\S]+TemplateShare\.import\(importOperationId, normalizedToken\)/);
  });
});
