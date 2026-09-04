import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const schemaPath = process.argv[2];
const failures = [];
const artifactOnly = process.env.RELEASE_GATE_MODE === 'artifact';

if (!artifactOnly && process.env.DELETION_CRON_CONFIGURED !== 'true') {
  failures.push('DELETION_CRON_NOT_ATTESTED');
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.VITE_SUPPORT_EMAIL || '')) {
  failures.push('SUPPORT_EMAIL_NOT_CONFIGURED');
}

try {
  const supabaseUrl = new URL(process.env.VITE_SUPABASE_URL || '');
  if (supabaseUrl.protocol !== 'https:') failures.push('SUPABASE_URL_INVALID');
} catch {
  failures.push('SUPABASE_URL_NOT_CONFIGURED');
}

if (!(process.env.VITE_SUPABASE_ANON_KEY || '').trim()) {
  failures.push('SUPABASE_ANON_KEY_NOT_CONFIGURED');
}

try {
  const appStoreUrl = new URL(process.env.VITE_APP_STORE_URL || '');
  if (appStoreUrl.protocol !== 'https:' || appStoreUrl.hostname !== 'apps.apple.com') {
    failures.push('APP_STORE_URL_INVALID');
  }
} catch {
  failures.push('APP_STORE_URL_NOT_CONFIGURED');
}

let schema = '';
let snapshot = null;
if (!schemaPath) {
  failures.push('SCHEMA_EXPORT_REQUIRED');
} else {
  try {
    schema = await readFile(path.resolve(schemaPath), 'utf8');
  } catch {
    failures.push('SCHEMA_EXPORT_UNREADABLE');
  }

  if (schema && path.extname(schemaPath).toLowerCase() === '.json') {
    try {
      const document = JSON.parse(schema);
      if (Array.isArray(document) && document.length !== 1) {
        throw new Error('ambiguous schema snapshot');
      }
      const rawSnapshot = Array.isArray(document)
        ? document[0]?.schema_snapshot
        : document.schema_snapshot ?? document;
      snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;

      const requiredCollections = [
        'tables',
        'columns',
        'indexes',
        'policies',
        'triggers',
        'functions',
        'constraints',
      ];
      if (
        !snapshot
        || typeof snapshot.project_ref !== 'string'
        || typeof snapshot.generated_at !== 'string'
        || requiredCollections.some((key) => !Array.isArray(snapshot[key]))
      ) {
        throw new Error('invalid schema snapshot');
      }
      if ('rows' in snapshot || 'data' in snapshot) {
        failures.push('SCHEMA_EXPORT_CONTAINS_ROW_DATA');
      }
    } catch {
      snapshot = null;
      schema = '';
      failures.push('SCHEMA_EXPORT_INVALID_JSON');
    }
  }
}

const requiredColumns = {
  contacts: [
    'id', 'user_id', 'full_name', 'phone', 'country_code', 'contact_type', 'notes', 'tag_ids',
    'created_at',
  ],
  notifications: [
    'id', 'user_id', 'title', 'body', 'type', 'related_entity_type', 'is_read', 'created_date',
    'created_at',
  ],
  partners: [
    'id', 'user_id', 'contact_id', 'start_date', 'fast_start_deadline', 'fast_start_status',
    'fase_actual', 'qteam_completed', 'fs_level1_completed', 'fs_level2_completed',
    'xteam_completed', 'created_at', 'partner_user_id',
  ],
  product_links: ['id', 'user_id', 'product_id', 'link_url', 'created_at'],
  sales: [
    'id', 'user_id', 'contact_id', 'product_id', 'purchase_date', 'sale_type', 'status',
    'created_at', 'operation_id',
  ],
  settings: [
    'id', 'user_id', 'user_name', 'user_phone', 'default_currency', 'notifications_enabled',
    'user_photo', 'created_at', 'partner_code', 'parent_id', 'last_active',
    'subscription_status', 'stripe_paid', 'stripe_session_id', 'onboarding_completed_at',
    'fast_start_started_at',
  ],
  tags: ['id', 'user_id', 'name', 'category', 'created_at'],
  tasks: [
    'id', 'user_id', 'contact_id', 'product_id', 'category', 'subcategory',
    'template_subcategory', 'task_name', 'task_area', 'due_date', 'completed', 'created_at',
  ],
  user_templates: ['id', 'user_id', 'template_id', 'content', 'created_at'],
  billing_accounts: [
    'id', 'user_id', 'stripe_customer_id', 'stripe_subscription_id', 'claim_email', 'price_id',
    'entitlement_eligible', 'subscription_status', 'current_period_end', 'grace_until',
    'scheduled_cancel_at', 'cancel_at_period_end', 'access_blocked_reason',
    'last_stripe_event_id', 'created_at', 'updated_at',
  ],
  access_grants: [
    'id', 'user_id', 'source', 'source_key', 'status', 'access_until', 'revoked_at',
    'created_at', 'updated_at',
  ],
  stripe_webhook_events: [
    'event_id', 'event_type', 'event_created_at', 'payload_sha256', 'status', 'attempt_count',
    'processed_at', 'last_error', 'created_at', 'updated_at',
  ],
  account_deletion_requests: [
    'id', 'operation_id', 'user_id', 'status', 'execute_at', 'stripe_customer_id',
    'stripe_subscription_id', 'attempt_count', 'failure_code', 'requested_at', 'completed_at',
    'updated_at',
  ],
  stripe_access_incidents: [
    'id', 'stripe_customer_id', 'stripe_subscription_id', 'incident_key', 'incident_kind',
    'status', 'blocked_reason', 'last_event_id', 'last_event_created_at', 'resolved_at',
  ],
  stripe_connect_charges: [
    'stripe_charge_id', 'stripe_invoice_id', 'stripe_customer_id', 'stripe_subscription_id',
    'stripe_original_transfer_id', 'stripe_destination_account_id', 'charge_amount',
    'original_transfer_amount', 'reconciliation_status', 'last_event_id',
  ],
  stripe_connect_disputes: [
    'stripe_dispute_id', 'stripe_charge_id', 'amount', 'currency', 'status',
    'financially_blocking', 'last_event_id',
  ],
  stripe_connect_transfers: [
    'stripe_transfer_id', 'stripe_charge_id', 'kind', 'amount', 'amount_reversed',
    'stripe_destination_account_id', 'stripe_created_at',
  ],
  stripe_connect_adjustments: [
    'id', 'operation_key', 'stripe_charge_id', 'kind', 'stripe_object_id', 'amount', 'event_id',
  ],
  stripe_connect_anomalies: [
    'stripe_charge_id', 'anomaly_kind', 'status', 'last_event_id', 'last_event_created_at',
    'last_error', 'resolved_at',
  ],
  user_products: [
    'id', 'user_id', 'product_id', 'name', 'category', 'link_url', 'cycle_days',
    'repurchase_enabled', 'origin', 'archived_at',
  ],
  message_templates: [
    'id', 'user_id', 'template_id', 'name', 'content', 'situation', 'contact_id', 'origin',
    'is_default', 'archived_at',
  ],
};

const snapshotTables = new Map((snapshot?.tables || []).map((table) => [table.name, table]));
const snapshotColumns = new Set(
  (snapshot?.columns || []).map((column) => `${column.table}.${column.name}`)
);
const snapshotFunctions = new Map(
  (snapshot?.functions || []).map((fn) => [fn.name, fn.definition])
);

function sqlTableBlock(table) {
  const tablePattern = new RegExp(
    `create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+(?:public\\.)?"?${table}"?\\s*\\(([\\s\\S]*?)\\n\\);`,
    'i'
  );
  return schema.match(tablePattern)?.[1] || '';
}

function hasFunction(name) {
  if (snapshot) {
    return new RegExp(
      `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?"?${name}"?\\s*\\(`,
      'i'
    ).test(snapshotFunctions.get(name) || '');
  }
  return new RegExp(
    `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?"?${name}"?\\s*\\(`,
    'i'
  ).test(schema);
}

for (const [table, columns] of Object.entries(requiredColumns)) {
  const block = snapshot ? '' : sqlTableBlock(table);
  if (snapshot ? !snapshotTables.has(table) : !block) {
    failures.push(`SCHEMA_TABLE_MISSING:${table}`);
    continue;
  }
  for (const column of columns) {
    const exists = snapshot
      ? snapshotColumns.has(`${table}.${column}`)
      : new RegExp(`(?:^|\\n)\\s*"?${column}"?\\s+`, 'i').test(block);
    if (!exists) {
      failures.push(`SCHEMA_COLUMN_MISSING:${table}.${column}`);
    }
  }

  const rlsEnabled = snapshot
    ? snapshotTables.get(table)?.rls_enabled === true
    : new RegExp(
      `alter\\s+table(?:\\s+only)?\\s+(?:public\\.)?"?${table}"?\\s+enable\\s+row\\s+level\\s+security`,
      'i'
    ).test(schema);
  if (!rlsEnabled) failures.push(`RLS_NOT_ENABLED:${table}`);
}

const legacyRpcs = [
  'lookup_partner_code',
  'register_as_partner',
  'get_partner_sales_data',
  'get_partner_partners_count',
  'set_parent_id',
  'get_partners_activity',
  'get_partners_fs_metrics',
  'import_partner_clients',
];

for (const rpc of legacyRpcs) {
  if (!hasFunction(rpc)) {
    failures.push(`LEGACY_RPC_MISSING:${rpc}`);
  }
}

const requiredReleaseRpcs = [
  'has_app_entitlement',
  'complete_onboarding',
  'record_sale',
  'anonymize_contact',
  'get_access_snapshot',
  'claim_billing_account',
  'reserve_checkout_operation',
  'sync_stripe_billing_account',
  'claim_stripe_webhook_event',
  'complete_stripe_webhook_event',
  'fail_stripe_webhook_event',
  'record_stripe_invoice_paid',
  'record_stripe_access_incident',
  'reconcile_stripe_access_incident_canonical',
  'begin_account_deletion',
  'schedule_account_deletion',
  'claim_due_account_deletions',
  'delete_user_data',
  'fail_account_deletion',
  'complete_account_deletion',
  'ensure_partner_code',
  'join_upline_by_code',
  'link_partner_by_code',
  'link_existing_partner_by_code',
  'set_fast_start_date',
  'sync_stripe_connect_charge_snapshot',
  'sync_stripe_connect_transfer_snapshot',
  'record_stripe_connect_reversal',
  'record_stripe_connect_restoration',
  'complete_stripe_connect_reconciliation',
  'fail_stripe_connect_reconciliation',
  'record_stripe_connect_anomaly',
  'resolve_stripe_connect_anomaly',
  'assert_stripe_connect_checkout_ready',
];

for (const rpc of requiredReleaseRpcs) {
  if (!hasFunction(rpc)) {
    failures.push(`RELEASE_RPC_NOT_APPLIED:${rpc}`);
  }
}

try {
  const saleClient = await readFile(new URL('../../src/pages/NewSale4.jsx', import.meta.url), 'utf8');
  if (!/\.rpc\(\s*['"]record_sale['"]/.test(saleClient)) {
    failures.push('SALE_CLIENT_NOT_ATOMIC');
  }
} catch {
  failures.push('SALE_CLIENT_UNREADABLE');
}

if (failures.length) {
  process.stderr.write(`${JSON.stringify({ ready: false, failures }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ ready: true }, null, 2)}\n`);
}
