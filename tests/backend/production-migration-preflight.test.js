import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

import {
  PREFLIGHT_EXPECTATIONS,
  evaluateProductionPreflight,
  parseProductionPreflight,
} from '../../supabase/scripts/check-production-migration-preflight.mjs';

const TARGET_TABLES = new Set(['stripe_connect_anomalies', 'user_products', 'message_templates']);
const TARGET_COLUMNS = new Set([
  'settings.fast_start_started_at', 'stripe_connect_anomalies.status',
  'user_products.product_id', 'message_templates.template_id',
]);
const TARGET_INDEXES = new Set([
  'settings_partner_code_ci_idx', 'partners_linked_user_unique_idx',
  'user_products_active_idx', 'message_templates_active_idx',
  'message_templates_default_general_idx', 'message_templates_default_contact_idx',
  'stripe_connect_anomalies_open_idx',
]);

const INDEX_DEFINITIONS = {
  settings_user_id_key: 'CREATE UNIQUE INDEX settings_user_id_key ON public.settings USING btree (user_id)',
  product_links_user_id_product_id_key: 'CREATE UNIQUE INDEX product_links_user_id_product_id_key ON public.product_links USING btree (user_id, product_id)',
  user_templates_user_id_template_id_key: 'CREATE UNIQUE INDEX user_templates_user_id_template_id_key ON public.user_templates USING btree (user_id, template_id)',
  sales_user_operation_id_idx: 'CREATE UNIQUE INDEX sales_user_operation_id_idx ON public.sales USING btree (user_id, operation_id) WHERE (operation_id IS NOT NULL)',
  settings_partner_code_ci_idx: 'CREATE UNIQUE INDEX settings_partner_code_ci_idx ON public.settings USING btree (upper(partner_code)) WHERE (partner_code IS NOT NULL)',
  partners_linked_user_unique_idx: 'CREATE UNIQUE INDEX partners_linked_user_unique_idx ON public.partners USING btree (partner_user_id) WHERE (partner_user_id IS NOT NULL)',
  user_products_active_idx: 'CREATE INDEX user_products_active_idx ON public.user_products USING btree (user_id, created_at DESC) WHERE (archived_at IS NULL)',
  message_templates_active_idx: 'CREATE INDEX message_templates_active_idx ON public.message_templates USING btree (user_id, situation, created_at DESC) WHERE (archived_at IS NULL)',
  message_templates_default_general_idx: 'CREATE UNIQUE INDEX message_templates_default_general_idx ON public.message_templates USING btree (user_id, situation) WHERE (is_default AND (contact_id IS NULL) AND (archived_at IS NULL))',
  message_templates_default_contact_idx: 'CREATE UNIQUE INDEX message_templates_default_contact_idx ON public.message_templates USING btree (user_id, situation, contact_id) WHERE (is_default AND (contact_id IS NOT NULL) AND (archived_at IS NULL))',
  stripe_connect_anomalies_open_idx: "CREATE INDEX stripe_connect_anomalies_open_idx ON public.stripe_connect_anomalies USING btree (status) WHERE (status = 'open'::text)",
};

function readyReport() {
  const counts = Object.fromEntries([
    'auth_users', 'settings_users', 'auth_users_without_settings', 'users_without_current_grant',
    'domain_users_without_current_grant',
    'partner_codes_needing_normalization', ...PREFLIGHT_EXPECTATIONS.blockingCounts,
  ].map((name) => [name, 0]));
  counts.auth_users = 5;
  counts.settings_users = 5;

  return {
    format_version: 1,
    generated_at: '2026-09-02T12:00:00.000Z',
    tables: PREFLIGHT_EXPECTATIONS.tables.map((table_name) => ({
      table_name,
      phase: TARGET_TABLES.has(table_name) ? 'target' : 'prerequisite',
      required_before: !TARGET_TABLES.has(table_name),
      is_present: table_name === 'stripe_connect_anomalies' || !TARGET_TABLES.has(table_name),
      rls_enabled: true,
    })),
    columns: PREFLIGHT_EXPECTATIONS.columns.map((key) => {
      const [table_name, column_name] = key.split('.');
      const target = TARGET_COLUMNS.has(key);
      return {
        table_name,
        column_name,
        phase: target ? 'target' : 'prerequisite',
        required_before: !target,
        is_present: key === 'stripe_connect_anomalies.status' || !target,
      };
    }),
    functions: PREFLIGHT_EXPECTATIONS.functions.map((function_name) => ({
      function_name,
      phase: function_name === 'zynergia_set_updated_at' ? 'prerequisite' : 'target',
      required_before: function_name === 'zynergia_set_updated_at',
      is_present: function_name === 'zynergia_set_updated_at',
      all_security_definer: false,
      all_search_paths_empty: function_name === 'zynergia_set_updated_at',
      anon_can_execute: false,
      authenticated_can_execute: false,
      service_role_can_execute: false,
    })),
    indexes: PREFLIGHT_EXPECTATIONS.indexes.map((index_name) => {
      const target = TARGET_INDEXES.has(index_name);
      const present = index_name === 'stripe_connect_anomalies_open_idx' || !target;
      return {
        index_name,
        table_name: 'fixture',
        phase: target ? 'target' : 'prerequisite',
        required_before: !target,
        must_be_unique: INDEX_DEFINITIONS[index_name].includes('UNIQUE INDEX'),
        is_present: present,
        is_unique: INDEX_DEFINITIONS[index_name].includes('UNIQUE INDEX'),
        definition: present ? INDEX_DEFINITIONS[index_name] : null,
      };
    }),
    domain_policies: [],
    counts,
    orphans: PREFLIGHT_EXPECTATIONS.orphans.map((relation_name) => ({
      relation_name,
      issue_count: 0,
    })),
    connect_gate: {
      is_present: true,
      checks_unbalanced_charges: true,
      checks_open_anomalies: true,
      anon_can_execute: false,
      authenticated_can_execute: false,
      service_role_can_execute: true,
    },
  };
}

describe('production migration preflight', () => {
  test('accepts clean aggregate-only evidence and reports unapplied targets', () => {
    const result = evaluateProductionPreflight(readyReport(), {
      now: '2026-09-02T13:00:00.000Z',
    });

    expect(result.ready_to_apply, JSON.stringify(result)).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.observations).toContain('TARGET_TABLE_NOT_APPLIED:user_products');
    expect(result.observations).toContain('TARGET_RPC_NOT_APPLIED:record_sale');
  });

  test('reports inactive or incomplete accounts but fails closed on unclassified or billed entitlements, RLS, graph, orphans, URLs and Connect anomalies', () => {
    const report = readyReport();
    report.counts.users_without_current_grant = 6;
    report.counts.users_without_access_classification = 5;
    report.counts.auth_users_without_settings = 1;
    report.counts.partner_cycle_users = 2;
    report.counts.invalid_legacy_product_urls = 1;
    report.counts.connect_open_anomalies = 3;
    report.tables.find((table) => table.table_name === 'contacts').rls_enabled = false;
    report.orphans.find((orphan) => orphan.relation_name === 'sales.contact_id->contacts').issue_count = 4;
    report.domain_policies.push({
      table_name: 'sales',
      policy_name: 'allow_everything',
      mentions_entitlement: false,
      replaced_by_planned_migration: false,
    });

    const result = evaluateProductionPreflight(report, {
      now: '2026-09-02T13:00:00.000Z',
    });

    expect(result.ready_to_apply).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      'ACCESS_CLASSIFICATION_REQUIRED:5',
      'RLS_NOT_ENABLED:contacts',
      'PARTNER_GRAPH_CYCLES:2',
      'INVALID_LEGACY_PRODUCT_URLS:1',
      'CONNECT_OPEN_ANOMALIES:3',
      'ORPHAN_ROWS:sales.contact_id->contacts:4',
      'UNEXPECTED_DOMAIN_POLICY:sales.allow_everything',
    ]));
    expect(result.observations).toContain('USERS_WITHOUT_CURRENT_GRANT:6');
    expect(result.observations).toContain('AUTH_USERS_WITHOUT_SETTINGS:1');
  });

  test('parses the SQL Editor wrapper and rejects stale or incomplete evidence', () => {
    const wrapped = JSON.stringify([{
      production_migration_preflight: JSON.stringify(readyReport()),
    }]);
    const parsed = parseProductionPreflight(wrapped);
    const stale = evaluateProductionPreflight(parsed, {
      now: '2026-09-04T13:00:00.000Z',
    });
    expect(stale.failures).toContain('PREFLIGHT_REPORT_STALE');

    parsed.tables = [];
    expect(() => evaluateProductionPreflight(parsed, {
      now: '2026-09-02T13:00:00.000Z',
    })).toThrow(/tables is incomplete/);
  });

  test('the production inventory is a single read-only query with every required signal', async () => {
    const sql = await readFile(
      new URL('../../supabase/scripts/production-migration-preflight.sql', import.meta.url),
      'utf8',
    );
    const executable = sql
      .replace(/--.*$/gm, '')
      .replace(/'(?:''|[^'])*'/g, "''");

    expect(executable).not.toMatch(/\b(insert|update|delete|alter|create|drop|truncate|grant|revoke|call)\b/i);
    expect(executable.trimStart()).toMatch(/^with recursive\b/i);
    expect(executable.trimEnd()).toMatch(/cross join connect_gate_state;$/i);
    for (const marker of [
      'relrowsecurity', 'pg_policies', 'pg_get_functiondef', 'pg_get_indexdef',
      'duplicate_partner_codes', 'partner_walk', 'row_orphans',
      'invalid_legacy_product_urls', 'users_without_current_grant',
      'connect_open_anomalies', 'assert_stripe_connect_checkout_ready',
    ]) {
      expect(sql).toContain(marker);
    }
    expect(sql).not.toMatch(/auth\.users[^;]+\bemail\b/i);
  });
});
