-- Read-only production schema export. It intentionally returns definitions only:
-- no table rows, auth data, tokens, credentials or billing records.
with
table_state as (
  select relation.relname as name,
         relation.relkind::text as kind,
         relation.relrowsecurity as rls_enabled,
         relation.relforcerowsecurity as rls_forced
    from pg_catalog.pg_class relation
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
   where namespace.nspname = 'public'
     and relation.relkind in ('r', 'p')
),
column_state as (
  select column_info.table_name as "table",
         column_info.column_name as name,
         column_info.ordinal_position as position,
         column_info.is_nullable as nullable,
         column_info.data_type as type,
         column_info.udt_name as udt,
         column_info.column_default as "default"
    from information_schema.columns column_info
   where column_info.table_schema = 'public'
),
index_state as (
  select relation.relname as "table",
         index_relation.relname as name,
         pg_catalog.pg_get_indexdef(index_meta.indexrelid) as definition
    from pg_catalog.pg_index index_meta
    join pg_catalog.pg_class relation on relation.oid = index_meta.indrelid
    join pg_catalog.pg_class index_relation on index_relation.oid = index_meta.indexrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
   where namespace.nspname = 'public'
),
policy_state as (
  select policy.tablename as "table",
         policy.policyname as name,
         policy.permissive,
         policy.roles,
         policy.cmd as command,
         policy.qual as "using",
         policy.with_check as "check"
    from pg_catalog.pg_policies policy
   where policy.schemaname = 'public'
),
trigger_state as (
  select relation.relname as "table",
         trigger_row.tgname as name,
         pg_catalog.pg_get_triggerdef(trigger_row.oid) as definition
    from pg_catalog.pg_trigger trigger_row
    join pg_catalog.pg_class relation on relation.oid = trigger_row.tgrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
   where namespace.nspname = 'public'
     and not trigger_row.tgisinternal
),
function_state as (
  select function_row.proname as name,
         pg_catalog.pg_get_function_identity_arguments(function_row.oid) as identity_arguments,
         pg_catalog.pg_get_function_result(function_row.oid) as result,
         function_row.prosecdef as security_definer,
         pg_catalog.pg_get_functiondef(function_row.oid) as definition
    from pg_catalog.pg_proc function_row
    join pg_catalog.pg_namespace namespace on namespace.oid = function_row.pronamespace
   where namespace.nspname = 'public'
),
constraint_state as (
  select relation.relname as "table",
         constraint_row.conname as name,
         constraint_row.contype::text as type,
         pg_catalog.pg_get_constraintdef(constraint_row.oid) as definition
    from pg_catalog.pg_constraint constraint_row
    join pg_catalog.pg_class relation on relation.oid = constraint_row.conrelid
    join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
   where namespace.nspname = 'public'
)
select jsonb_build_object(
  'project_ref', 'sbezuysumqlwqnvrhckg',
  'generated_at', now(),
  'tables', coalesce((select jsonb_agg(to_jsonb(value) order by value.name) from table_state value), '[]'::jsonb),
  'columns', coalesce((select jsonb_agg(to_jsonb(value) order by value."table", value.position) from column_state value), '[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(to_jsonb(value) order by value."table", value.name) from index_state value), '[]'::jsonb),
  'policies', coalesce((select jsonb_agg(to_jsonb(value) order by value."table", value.name) from policy_state value), '[]'::jsonb),
  'triggers', coalesce((select jsonb_agg(to_jsonb(value) order by value."table", value.name) from trigger_state value), '[]'::jsonb),
  'functions', coalesce((select jsonb_agg(to_jsonb(value) order by value.name, value.identity_arguments) from function_state value), '[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(to_jsonb(value) order by value."table", value.name) from constraint_state value), '[]'::jsonb)
) as schema_snapshot;
