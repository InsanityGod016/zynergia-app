import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const REQUIRED_INDEX_TOKENS = {
  settings_user_id_key: ['unique index', 'public.settings', '(user_id)'],
  product_links_user_id_product_id_key: [
    'unique index', 'public.product_links', '(user_id, product_id)',
  ],
  user_templates_user_id_template_id_key: [
    'unique index', 'public.user_templates', '(user_id, template_id)',
  ],
  sales_user_operation_id_idx: [
    'unique index', 'public.sales', '(user_id, operation_id)', 'where', 'operation_id is not null',
  ],
  settings_partner_code_ci_idx: [
    'unique index', 'public.settings', 'upper(partner_code)', 'where', 'partner_code is not null',
  ],
  partners_linked_user_unique_idx: [
    'unique index', 'public.partners', '(partner_user_id)', 'where', 'partner_user_id is not null',
  ],
  user_products_active_idx: ['public.user_products', '(user_id, created_at desc)', 'where', 'archived_at is null'],
  message_templates_active_idx: [
    'public.message_templates', '(user_id, situation, created_at desc)', 'where', 'archived_at is null',
  ],
  message_templates_default_general_idx: [
    'unique index', 'public.message_templates', '(user_id, situation)', 'where',
    'is_default', 'contact_id is null', 'archived_at is null',
  ],
  message_templates_default_contact_idx: [
    'unique index', 'public.message_templates', '(user_id, situation, contact_id)', 'where',
    'is_default', 'contact_id is not null', 'archived_at is null',
  ],
  stripe_connect_anomalies_open_idx: [
    'public.stripe_connect_anomalies', '(status)', 'where', "status = 'open'",
  ],
  contacts_user_phone_e164_idx: [
    'public.contacts', '(user_id, phone_e164)', 'where', 'phone_e164 is not null',
  ],
  sales_order_product_idx: [
    'unique index', 'public.sales', '(user_id, order_id, product_id)', 'where', 'order_id is not null',
  ],
  sales_fast_start_v2_idx: [
    'public.sales', '(user_id, purchase_date, product_id)', 'where', "sale_type = 'nueva'",
  ],
  template_categories_active_name_idx: [
    'unique index', 'public.template_categories', '(user_id, lower(btrim(name)), situation)',
    'where', 'archived_at is null',
  ],
  message_templates_category_idx: [
    'public.message_templates', '(user_id, category_id, created_at desc)',
    'where', 'archived_at is null',
  ],
  template_share_bundles_owner_idx: [
    'public.template_share_bundles', '(owner_id, created_at desc)',
  ],
  notifications_user_dedupe_idx: [
    'unique index', 'public.notifications', '(user_id, dedupe_key)', 'where', 'dedupe_key is not null',
  ],
  notifications_pending_delivery_idx: [
    'public.notifications', '(scheduled_for, created_at)', 'where', "channel = 'push'",
    "delivery_status = 'pending'",
  ],
  notifications_push_retry_idx: [
    'public.notifications', '(delivery_next_attempt_at, delivery_lease_until, created_at)',
    'where', "channel = 'push'", "delivery_status = any",
  ],
};

const EXPECTED_TABLES = [
  'contacts', 'notifications', 'partners', 'product_links', 'sales', 'settings', 'tags',
  'tasks', 'user_templates', 'billing_accounts', 'access_grants', 'stripe_webhook_events',
  'account_deletion_requests', 'stripe_connect_charges', 'stripe_connect_disputes',
  'stripe_connect_transfers', 'stripe_connect_adjustments', 'stripe_connect_anomalies',
  'user_products', 'message_templates', 'contact_batch_operations', 'sale_orders',
  'template_categories', 'template_share_bundles', 'template_share_imports',
];

const EXPECTED_COLUMNS = [
  'contacts.id', 'contacts.user_id', 'contacts.full_name', 'contacts.phone',
  'contacts.country_code', 'contacts.contact_type', 'contacts.notes', 'contacts.tag_ids',
  'contacts.created_at', 'partners.id', 'partners.user_id',
  'partners.contact_id', 'partners.partner_user_id', 'product_links.user_id',
  'product_links.product_id', 'product_links.link_url', 'sales.id', 'sales.user_id',
  'sales.contact_id', 'sales.product_id', 'sales.purchase_date', 'sales.sale_type',
  'sales.status', 'sales.operation_id', 'sales.created_at', 'settings.user_id', 'settings.partner_code',
  'settings.parent_id', 'settings.onboarding_completed_at', 'settings.fast_start_started_at',
  'settings.notifications_enabled', 'tasks.id', 'tasks.user_id', 'tasks.contact_id',
  'tasks.completed', 'tasks.task_name', 'tasks.product_id', 'tasks.category',
  'tasks.subcategory', 'tasks.template_subcategory', 'tasks.task_area', 'tasks.due_date',
  'user_templates.user_id', 'user_templates.template_id', 'user_templates.content',
  'billing_accounts.user_id', 'billing_accounts.entitlement_eligible',
  'billing_accounts.subscription_status', 'billing_accounts.current_period_end',
  'access_grants.user_id', 'access_grants.status', 'access_grants.access_until',
  'access_grants.revoked_at', 'stripe_connect_charges.reconciliation_status',
  'stripe_connect_anomalies.status', 'user_products.id', 'user_products.user_id',
  'user_products.product_id', 'user_products.name', 'user_products.category',
  'user_products.subcategory', 'user_products.image_url', 'user_products.link_url',
  'user_products.cycle_days', 'user_products.frequency_months',
  'user_products.repurchase_enabled', 'user_products.origin', 'user_products.archived_at',
  'user_products.created_at', 'message_templates.id', 'message_templates.user_id',
  'message_templates.template_id', 'message_templates.name', 'message_templates.content',
  'message_templates.situation', 'message_templates.category', 'message_templates.subcategory',
  'message_templates.tone', 'message_templates.contact_id', 'message_templates.origin',
  'message_templates.is_default', 'message_templates.archived_at',
  'message_templates.created_at', 'contacts.phone_e164', 'contacts.phone_country_iso',
  'contacts.phone_raw', 'contacts.import_source', 'tasks.origin', 'tasks.source_sale_id',
  'user_products.image_path', 'contact_batch_operations.user_id',
  'contact_batch_operations.operation_id', 'contact_batch_operations.request_hash',
  'contact_batch_operations.result', 'sales.order_id', 'sales.quantity',
  'sales.follow_up_stopped_at', 'sale_orders.user_id', 'sale_orders.operation_id',
  'sale_orders.contact_id', 'sale_orders.purchase_date', 'sale_orders.sale_type',
  'sale_orders.status', 'sale_orders.content_hash', 'message_templates.category_id',
  'template_categories.user_id', 'template_categories.name', 'template_categories.situation',
  'template_categories.archived_at', 'template_share_bundles.owner_id',
  'template_share_bundles.operation_id', 'template_share_bundles.token_hash',
  'template_share_bundles.snapshot', 'template_share_bundles.expires_at',
  'template_share_bundles.revoked_at', 'template_share_imports.bundle_id',
  'template_share_imports.user_id', 'template_share_imports.operation_id',
  'template_share_imports.imported_template_ids', 'settings.task_notifications_enabled',
  'settings.daily_summary_enabled', 'settings.daily_summary_time',
  'settings.fast_start_notifications_enabled', 'settings.push_consent_given',
  'settings.timezone', 'notifications.channel', 'notifications.related_entity_id',
  'notifications.route', 'notifications.dedupe_key', 'notifications.scheduled_for',
  'notifications.delivery_status', 'notifications.provider_message_id',
  'notifications.delivery_attempted_at', 'notifications.delivery_attempt_count',
  'notifications.delivery_next_attempt_at', 'notifications.delivery_lease_until',
  'notifications.delivered_at', 'notifications.delivery_error_code', 'tasks.due_time',
];

const EXPECTED_FUNCTIONS = [
  'zynergia_set_updated_at', 'has_app_entitlement', 'complete_onboarding',
  'ensure_partner_code', 'lookup_partner_code', 'join_upline_by_code',
  'get_partner_sales_data', 'get_partner_partners_count', 'get_partner_stats',
  'get_partners_activity', 'get_partners_fs_metrics', 'register_as_partner',
  'link_partner_by_code', 'link_existing_partner_by_code', 'set_parent_id',
  'import_partner_clients', 'record_sale', 'anonymize_contact',
  'zynergia_clear_previous_template_default', 'record_stripe_connect_anomaly',
  'resolve_stripe_connect_anomaly', 'assert_stripe_connect_checkout_ready',
  'set_fast_start_date', 'delete_user_data', 'classify_legacy_task_origin',
  'import_contacts', 'bulk_update_contact_type', 'bulk_anonymize_contacts',
  'enforce_sale_client_update', 'record_sale_order', 'stop_sale_follow_up',
  'stop_product_follow_up', 'get_fast_start_snapshots_v2',
  'get_my_fast_start_snapshot_v2', 'get_team_snapshot_v2', 'update_message_template',
  'archive_message_template', 'set_template_default', 'update_template_category',
  'archive_template_category', 'validate_message_template_write', 'create_template_share',
  'preview_template_share', 'import_template_share',
  'revoke_template_share', 'queue_fast_start_refresh',
  'validate_settings_timezone_write',
  'refresh_fast_start_after_settings_change', 'refresh_fast_start_after_partner_change',
  'enqueue_due_daily_summaries', 'claim_push_notifications', 'finish_push_notification',
];

const EXPECTED_ORPHANS = [
  'contacts.user_id->auth.users', 'notifications.user_id->auth.users',
  'partners.user_id->auth.users', 'product_links.user_id->auth.users',
  'sales.user_id->auth.users', 'settings.user_id->auth.users',
  'tags.user_id->auth.users', 'tasks.user_id->auth.users',
  'user_templates.user_id->auth.users', 'partners.contact_id->contacts',
  'sales.contact_id->contacts', 'tasks.contact_id->contacts',
  'settings.parent_id->settings', 'partners.partner_user_id->settings',
];

const BLOCKING_COUNTS = {
  users_without_access_classification: 'ACCESS_CLASSIFICATION_REQUIRED',
  active_billing_users_without_current_grant: 'ACTIVE_BILLING_GRANT_MISSING',
  duplicate_partner_code_groups: 'DUPLICATE_PARTNER_CODES',
  invalid_nonblank_partner_codes: 'INVALID_PARTNER_CODES',
  duplicate_linked_partner_groups: 'DUPLICATE_LINKED_PARTNERS',
  settings_self_parent_links: 'SETTINGS_SELF_PARENT_LINKS',
  partner_self_links: 'PARTNER_SELF_LINKS',
  partner_cycle_users: 'PARTNER_GRAPH_CYCLES',
  partner_edges_with_parent_mismatch: 'PARTNER_PARENT_MISMATCH',
  settings_parent_edges_without_partner: 'PARENT_EDGE_WITHOUT_PARTNER',
  duplicate_legacy_product_link_groups: 'DUPLICATE_LEGACY_PRODUCT_LINKS',
  duplicate_legacy_template_groups: 'DUPLICATE_LEGACY_TEMPLATES',
  duplicate_sales_operation_groups: 'DUPLICATE_SALE_OPERATIONS',
  invalid_legacy_product_urls: 'INVALID_LEGACY_PRODUCT_URLS',
  invalid_legacy_sale_types: 'INVALID_LEGACY_SALE_TYPES',
  invalid_legacy_sale_statuses: 'INVALID_LEGACY_SALE_STATUSES',
  connect_unbalanced_charges: 'CONNECT_UNBALANCED_CHARGES',
  connect_open_anomalies: 'CONNECT_OPEN_ANOMALIES',
};

export const PREFLIGHT_EXPECTATIONS = Object.freeze({
  tables: EXPECTED_TABLES,
  columns: EXPECTED_COLUMNS,
  functions: EXPECTED_FUNCTIONS,
  indexes: Object.keys(REQUIRED_INDEX_TOKENS),
  orphans: EXPECTED_ORPHANS,
  blockingCounts: Object.keys(BLOCKING_COUNTS),
});

function unwrapReport(document) {
  let value = document;
  if (value && !Array.isArray(value) && Array.isArray(value.data)) value = value.data;
  if (Array.isArray(value)) {
    if (value.length !== 1) throw new Error('expected one SQL result row');
    value = value[0];
  }
  if (value && typeof value === 'object' && 'production_migration_preflight' in value) {
    value = value.production_migration_preflight;
  }
  if (typeof value === 'string') value = JSON.parse(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('expected a preflight object');
  }
  return value;
}

function records(value, name) {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value;
}

function nonnegativeCount(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a count`);
  return value;
}

function normalizedDefinition(value) {
  return String(value || '')
    .toLowerCase()
    .replaceAll('"', '')
    .replace(/\s+/g, ' ')
    .replace(/\(([^()]+ is not null)\)/g, '$1')
    .trim();
}

function assertComplete(recordsValue, label, keyFor, expectedKeys) {
  const found = recordsValue.map(keyFor);
  if (found.some((key) => typeof key !== 'string') || new Set(found).size !== found.length) {
    throw new Error(`${label} contains invalid or duplicate keys`);
  }
  const foundSet = new Set(found);
  if (expectedKeys.some((key) => !foundSet.has(key))) throw new Error(`${label} is incomplete`);
}

export function parseProductionPreflight(text) {
  return unwrapReport(JSON.parse(text));
}

export function evaluateProductionPreflight(report, options = {}) {
  if (report.format_version !== 1) throw new Error('unsupported format version');

  const generatedAt = new Date(report.generated_at);
  if (Number.isNaN(generatedAt.getTime())) throw new Error('generated_at must be an ISO timestamp');

  const maxAgeHours = options.maxAgeHours ?? 24;
  const now = options.now ? new Date(options.now) : new Date();
  const ageHours = (now.getTime() - generatedAt.getTime()) / 3_600_000;
  const failures = [];
  const observations = [];

  if (ageHours < -0.25 || ageHours > maxAgeHours) {
    failures.push('PREFLIGHT_REPORT_STALE');
  }

  const tables = records(report.tables, 'tables');
  assertComplete(tables, 'tables', (entry) => entry.table_name, EXPECTED_TABLES);
  const presentTables = new Set(tables.filter((entry) => entry.is_present).map((entry) => entry.table_name));
  const tableStateByName = new Map(tables.map((entry) => [entry.table_name, entry]));
  for (const table of tables) {
    if (typeof table.table_name !== 'string' || typeof table.required_before !== 'boolean') {
      throw new Error('invalid table state');
    }
    if (table.required_before && !table.is_present) {
      failures.push(`PREREQUISITE_TABLE_MISSING:${table.table_name}`);
    } else if (!table.required_before && !table.is_present) {
      observations.push(`TARGET_TABLE_NOT_APPLIED:${table.table_name}`);
    }
    if (table.is_present && !table.rls_enabled) failures.push(`RLS_NOT_ENABLED:${table.table_name}`);
  }

  const columns = records(report.columns, 'columns');
  assertComplete(
    columns,
    'columns',
    (entry) => `${entry.table_name}.${entry.column_name}`,
    EXPECTED_COLUMNS,
  );
  for (const column of columns) {
    if (typeof column.table_name !== 'string' || typeof column.column_name !== 'string') {
      throw new Error('invalid column state');
    }
    if (column.required_before && !column.is_present) {
      failures.push(`PREREQUISITE_COLUMN_MISSING:${column.table_name}.${column.column_name}`);
    } else if (!column.required_before && !column.is_present) {
      if (
        presentTables.has(column.table_name)
        && tableStateByName.get(column.table_name)?.required_before === false
      ) {
        failures.push(`PARTIAL_TARGET_TABLE:${column.table_name}.${column.column_name}`);
      } else {
        observations.push(`TARGET_COLUMN_NOT_APPLIED:${column.table_name}.${column.column_name}`);
      }
    }
  }

  const functions = records(report.functions, 'functions');
  assertComplete(functions, 'functions', (entry) => entry.function_name, EXPECTED_FUNCTIONS);
  for (const functionState of functions) {
    if (typeof functionState.function_name !== 'string') throw new Error('invalid function state');
    if (functionState.required_before && !functionState.is_present) {
      failures.push(`PREREQUISITE_RPC_MISSING:${functionState.function_name}`);
    } else if (!functionState.required_before && !functionState.is_present) {
      observations.push(`TARGET_RPC_NOT_APPLIED:${functionState.function_name}`);
    }
    if (functionState.required_before && functionState.is_present) {
      if (!functionState.all_search_paths_empty) {
        failures.push(`PREREQUISITE_RPC_SEARCH_PATH_UNSAFE:${functionState.function_name}`);
      }
      if (functionState.anon_can_execute || functionState.authenticated_can_execute) {
        failures.push(`PREREQUISITE_RPC_EXPOSED:${functionState.function_name}`);
      }
    }
  }

  const indexes = records(report.indexes, 'indexes');
  assertComplete(indexes, 'indexes', (entry) => entry.index_name, Object.keys(REQUIRED_INDEX_TOKENS));
  for (const index of indexes) {
    if (typeof index.index_name !== 'string') throw new Error('invalid index state');
    if (index.required_before && !index.is_present) {
      failures.push(`PREREQUISITE_INDEX_MISSING:${index.index_name}`);
      continue;
    }
    if (!index.required_before && !index.is_present) {
      observations.push(`TARGET_INDEX_NOT_APPLIED:${index.index_name}`);
      continue;
    }
    if (index.must_be_unique && !index.is_unique) {
      failures.push(`INDEX_NOT_UNIQUE:${index.index_name}`);
    }
    const definition = normalizedDefinition(index.definition);
    if (!(REQUIRED_INDEX_TOKENS[index.index_name] || []).every((token) => definition.includes(token))) {
      failures.push(`INDEX_DEFINITION_UNEXPECTED:${index.index_name}`);
    }
  }

  for (const policy of records(report.domain_policies, 'domain_policies')) {
    if (typeof policy.table_name !== 'string' || typeof policy.policy_name !== 'string') {
      throw new Error('invalid policy state');
    }
    if (!policy.replaced_by_planned_migration) {
      failures.push(`UNEXPECTED_DOMAIN_POLICY:${policy.table_name}.${policy.policy_name}`);
    } else if (!policy.mentions_entitlement) {
      observations.push(`POLICY_AWAITING_ENTITLEMENT_MIGRATION:${policy.table_name}.${policy.policy_name}`);
    }
  }

  if (!report.counts || typeof report.counts !== 'object' || Array.isArray(report.counts)) {
    throw new Error('counts must be an object');
  }
  for (const name of [
    'auth_users', 'settings_users', 'auth_users_without_settings', 'users_without_current_grant',
    'domain_users_without_current_grant',
    'partner_codes_needing_normalization', 'legacy_sales_missing_created_at',
    ...Object.keys(BLOCKING_COUNTS),
  ]) {
    nonnegativeCount(report.counts[name], `counts.${name}`);
  }
  for (const [name, code] of Object.entries(BLOCKING_COUNTS)) {
    const count = nonnegativeCount(report.counts[name], `counts.${name}`);
    if (count > 0) failures.push(`${code}:${count}`);
  }
  const domainUsersWithoutGrant = nonnegativeCount(
    report.counts.domain_users_without_current_grant,
    'counts.domain_users_without_current_grant',
  );
  if (domainUsersWithoutGrant > 0) {
    observations.push(`DOMAIN_USERS_WITHOUT_CURRENT_GRANT:${domainUsersWithoutGrant}`);
  }
  const usersWithoutGrant = nonnegativeCount(
    report.counts.users_without_current_grant,
    'counts.users_without_current_grant',
  );
  if (usersWithoutGrant > 0) {
    observations.push(`USERS_WITHOUT_CURRENT_GRANT:${usersWithoutGrant}`);
  }
  const usersWithoutSettings = nonnegativeCount(
    report.counts.auth_users_without_settings,
    'counts.auth_users_without_settings',
  );
  if (usersWithoutSettings > 0) {
    observations.push(`AUTH_USERS_WITHOUT_SETTINGS:${usersWithoutSettings}`);
  }
  const normalizedCodes = nonnegativeCount(
    report.counts.partner_codes_needing_normalization,
    'counts.partner_codes_needing_normalization',
  );
  if (normalizedCodes > 0) observations.push(`PARTNER_CODES_TO_NORMALIZE:${normalizedCodes}`);
  const missingSaleCreatedAt = nonnegativeCount(
    report.counts.legacy_sales_missing_created_at,
    'counts.legacy_sales_missing_created_at',
  );
  if (missingSaleCreatedAt > 0) {
    observations.push(`LEGACY_SALES_CREATED_AT_TO_BACKFILL:${missingSaleCreatedAt}`);
  }

  const orphans = records(report.orphans, 'orphans');
  assertComplete(orphans, 'orphans', (entry) => entry.relation_name, EXPECTED_ORPHANS);
  for (const orphan of orphans) {
    if (typeof orphan.relation_name !== 'string') throw new Error('invalid orphan state');
    const count = nonnegativeCount(orphan.issue_count, `orphans.${orphan.relation_name}`);
    if (count > 0) failures.push(`ORPHAN_ROWS:${orphan.relation_name}:${count}`);
  }

  const connectGate = report.connect_gate;
  if (!connectGate || typeof connectGate !== 'object' || Array.isArray(connectGate)) {
    throw new Error('connect_gate must be an object');
  }
  if (!connectGate.is_present) {
    observations.push('TARGET_CONNECT_GATE_NOT_APPLIED');
  } else {
    if (!connectGate.checks_unbalanced_charges || !connectGate.checks_open_anomalies) {
      failures.push('CONNECT_GATE_INCOMPLETE');
    }
    if (
      !connectGate.service_role_can_execute
      || connectGate.anon_can_execute
      || connectGate.authenticated_can_execute
    ) {
      failures.push('CONNECT_GATE_PRIVILEGES_UNSAFE');
    }
  }

  const extensions = report.extensions;
  if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions)) {
    throw new Error('extensions must be an object');
  }
  if (!extensions.pgcrypto_installed) {
    observations.push('TARGET_PGCRYPTO_NOT_INSTALLED');
  } else if (extensions.pgcrypto_schema !== 'extensions') {
    observations.push(`TARGET_PGCRYPTO_TO_RELOCATE:${String(extensions.pgcrypto_schema || 'unknown')}`);
  }

  const storage = report.storage;
  if (!storage || typeof storage !== 'object' || Array.isArray(storage)) {
    throw new Error('storage must be an object');
  }
  if (!storage.schema_present) failures.push('STORAGE_SCHEMA_MISSING');
  if (!storage.buckets_table_present) failures.push('STORAGE_BUCKETS_TABLE_MISSING');
  if (!storage.objects_table_present) failures.push('STORAGE_OBJECTS_TABLE_MISSING');
  if (!storage.objects_rls_enabled) failures.push('STORAGE_OBJECTS_RLS_NOT_ENABLED');
  if (!storage.product_images_bucket_present) {
    observations.push('TARGET_STORAGE_BUCKET_NOT_APPLIED:product-images');
  } else {
    const expectedPolicies = new Set([
      'product_images_delete_own', 'product_images_insert_own', 'product_images_select_own',
    ]);
    const policies = records(storage.product_images_policies, 'storage.product_images_policies');
    if (
      storage.product_images_bucket_public !== false
      || storage.product_images_file_size_limit !== 3_145_728
      || !storage.product_images_mime_types_complete
      || policies.some((policy) => typeof policy !== 'string')
      || [...expectedPolicies].some((policy) => !policies.includes(policy))
    ) {
      observations.push('TARGET_STORAGE_CONFIGURATION_TO_REPLACE:product-images');
    }
  }

  return {
    ready_to_apply: failures.length === 0,
    generated_at: generatedAt.toISOString(),
    failures: [...new Set(failures)].sort(),
    observations: [...new Set(observations)].sort(),
  };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error('usage: node check-production-migration-preflight.mjs <report.json>');
  const report = parseProductionPreflight(await readFile(path.resolve(inputPath), 'utf8'));
  const result = evaluateProductionPreflight(report, {
    maxAgeHours: Number(process.env.PREFLIGHT_MAX_AGE_HOURS || 24),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ready_to_apply) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => {
    process.stderr.write(`${JSON.stringify({
      ready_to_apply: false,
      failures: ['PREFLIGHT_REPORT_INVALID'],
      observations: [],
    }, null, 2)}\n`);
    process.exitCode = 2;
  });
}
