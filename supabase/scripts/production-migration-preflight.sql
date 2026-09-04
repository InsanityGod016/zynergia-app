-- Read-only inventory for migrations 202609010000, 001, 002, 003, 004 and 006.
-- Run this single SELECT in the production Supabase SQL Editor, then save the
-- `production_migration_preflight` cell as JSON. It returns counts and schema
-- object names only: never emails, UUIDs, names, phone numbers or row contents.

with recursive
expected_tables(table_name, phase, required_before) as (
  values
    ('contacts', 'prerequisite', true),
    ('notifications', 'prerequisite', true),
    ('partners', 'prerequisite', true),
    ('product_links', 'prerequisite', true),
    ('sales', 'prerequisite', true),
    ('settings', 'prerequisite', true),
    ('tags', 'prerequisite', true),
    ('tasks', 'prerequisite', true),
    ('user_templates', 'prerequisite', true),
    ('billing_accounts', 'prerequisite', true),
    ('access_grants', 'prerequisite', true),
    ('stripe_webhook_events', 'prerequisite', true),
    ('account_deletion_requests', 'prerequisite', true),
    ('stripe_connect_charges', 'prerequisite', true),
    ('stripe_connect_disputes', 'prerequisite', true),
    ('stripe_connect_transfers', 'prerequisite', true),
    ('stripe_connect_adjustments', 'prerequisite', true),
    ('stripe_connect_anomalies', '202609010004', false),
    ('user_products', '202609010003', false),
    ('message_templates', '202609010003', false)
),
table_state as (
  select expected.table_name,
         expected.phase,
         expected.required_before,
         relation.oid is not null as is_present,
         coalesce(relation.relrowsecurity, false) as rls_enabled
    from expected_tables expected
    left join pg_catalog.pg_namespace namespace
      on namespace.nspname = 'public'
    left join pg_catalog.pg_class relation
      on relation.relnamespace = namespace.oid
     and relation.relname = expected.table_name
     and relation.relkind in ('r', 'p')
),
expected_columns(table_name, column_name, phase, required_before) as (
  values
    ('contacts', 'id', 'prerequisite', true),
    ('contacts', 'user_id', 'prerequisite', true),
    ('partners', 'id', 'prerequisite', true),
    ('partners', 'user_id', 'prerequisite', true),
    ('partners', 'contact_id', 'prerequisite', true),
    ('partners', 'partner_user_id', 'prerequisite', true),
    ('product_links', 'user_id', 'prerequisite', true),
    ('product_links', 'product_id', 'prerequisite', true),
    ('product_links', 'link_url', 'prerequisite', true),
    ('sales', 'id', 'prerequisite', true),
    ('sales', 'user_id', 'prerequisite', true),
    ('sales', 'contact_id', 'prerequisite', true),
    ('sales', 'product_id', 'prerequisite', true),
    ('sales', 'purchase_date', 'prerequisite', true),
    ('sales', 'sale_type', 'prerequisite', true),
    ('sales', 'status', 'prerequisite', true),
    ('sales', 'operation_id', 'prerequisite', true),
    ('settings', 'user_id', 'prerequisite', true),
    ('settings', 'partner_code', 'prerequisite', true),
    ('settings', 'parent_id', 'prerequisite', true),
    ('settings', 'onboarding_completed_at', 'prerequisite', true),
    ('settings', 'fast_start_started_at', '202609010006', false),
    ('tasks', 'user_id', 'prerequisite', true),
    ('tasks', 'contact_id', 'prerequisite', true),
    ('tasks', 'completed', 'prerequisite', true),
    ('tasks', 'task_name', 'prerequisite', true),
    ('user_templates', 'user_id', 'prerequisite', true),
    ('user_templates', 'template_id', 'prerequisite', true),
    ('user_templates', 'content', 'prerequisite', true),
    ('billing_accounts', 'user_id', 'prerequisite', true),
    ('billing_accounts', 'entitlement_eligible', 'prerequisite', true),
    ('billing_accounts', 'subscription_status', 'prerequisite', true),
    ('billing_accounts', 'current_period_end', 'prerequisite', true),
    ('access_grants', 'user_id', 'prerequisite', true),
    ('access_grants', 'status', 'prerequisite', true),
    ('access_grants', 'access_until', 'prerequisite', true),
    ('access_grants', 'revoked_at', 'prerequisite', true),
    ('stripe_connect_charges', 'reconciliation_status', 'prerequisite', true),
    ('stripe_connect_anomalies', 'status', '202609010004', false),
    ('user_products', 'product_id', '202609010003', false),
    ('message_templates', 'template_id', '202609010003', false)
),
column_state as (
  select expected.table_name,
         expected.column_name,
         expected.phase,
         expected.required_before,
         column_info.column_name is not null as is_present
    from expected_columns expected
    left join information_schema.columns column_info
      on column_info.table_schema = 'public'
     and column_info.table_name = expected.table_name
     and column_info.column_name = expected.column_name
),
expected_functions(function_name, phase, required_before) as (
  values
    ('zynergia_set_updated_at', 'prerequisite', true),
    ('has_app_entitlement', '202609010000', false),
    ('complete_onboarding', '202609010000', false),
    ('ensure_partner_code', '202609010001', false),
    ('lookup_partner_code', '202609010001', false),
    ('join_upline_by_code', '202609010001', false),
    ('get_partner_sales_data', '202609010001', false),
    ('get_partner_partners_count', '202609010001', false),
    ('get_partner_stats', '202609010001', false),
    ('get_partners_activity', '202609010001', false),
    ('get_partners_fs_metrics', '202609010001/006', false),
    ('register_as_partner', '202609010001', false),
    ('link_partner_by_code', '202609010001', false),
    ('link_existing_partner_by_code', '202609010001', false),
    ('set_parent_id', '202609010001', false),
    ('import_partner_clients', '202609010001', false),
    ('record_sale', '202609010002', false),
    ('anonymize_contact', '202609010002', false),
    ('zynergia_clear_previous_template_default', '202609010003', false),
    ('record_stripe_connect_anomaly', '202609010004', false),
    ('resolve_stripe_connect_anomaly', '202609010004', false),
    ('assert_stripe_connect_checkout_ready', '202609010004', false),
    ('set_fast_start_date', '202609010006', false)
),
function_state as (
  select expected.function_name,
         expected.phase,
         expected.required_before,
         coalesce(found.installed_count, 0) > 0 as is_present,
         coalesce(found.all_security_definer, false) as all_security_definer,
         coalesce(found.all_search_paths_empty, false) as all_search_paths_empty,
         coalesce(found.anon_can_execute, false) as anon_can_execute,
         coalesce(found.authenticated_can_execute, false) as authenticated_can_execute,
         coalesce(found.service_role_can_execute, false) as service_role_can_execute
    from expected_functions expected
    left join lateral (
      select count(*)::integer as installed_count,
             bool_and(function_row.prosecdef) as all_security_definer,
             bool_and(coalesce((
               select btrim(split_part(setting, '=', 2), '"') = ''
                 from unnest(coalesce(function_row.proconfig, array[]::text[])) setting
                where split_part(setting, '=', 1) = 'search_path'
                limit 1
             ), false)) as all_search_paths_empty,
             bool_or(pg_catalog.has_function_privilege('anon', function_row.oid, 'EXECUTE'))
               as anon_can_execute,
             bool_or(pg_catalog.has_function_privilege('authenticated', function_row.oid, 'EXECUTE'))
               as authenticated_can_execute,
             bool_or(pg_catalog.has_function_privilege('service_role', function_row.oid, 'EXECUTE'))
               as service_role_can_execute
        from pg_catalog.pg_proc function_row
        join pg_catalog.pg_namespace namespace on namespace.oid = function_row.pronamespace
       where namespace.nspname = 'public'
         and function_row.proname = expected.function_name
    ) found on true
),
expected_indexes(index_name, table_name, phase, required_before, must_be_unique) as (
  values
    ('settings_user_id_key', 'settings', 'prerequisite', true, true),
    ('product_links_user_id_product_id_key', 'product_links', 'prerequisite', true, true),
    ('user_templates_user_id_template_id_key', 'user_templates', 'prerequisite', true, true),
    ('sales_user_operation_id_idx', 'sales', 'prerequisite', true, true),
    ('settings_partner_code_ci_idx', 'settings', '202609010001', false, true),
    ('partners_linked_user_unique_idx', 'partners', '202609010001', false, true),
    ('user_products_active_idx', 'user_products', '202609010003', false, false),
    ('message_templates_active_idx', 'message_templates', '202609010003', false, false),
    ('message_templates_default_general_idx', 'message_templates', '202609010003', false, true),
    ('message_templates_default_contact_idx', 'message_templates', '202609010003', false, true),
    ('stripe_connect_anomalies_open_idx', 'stripe_connect_anomalies', '202609010004', false, false)
),
index_state as (
  select expected.index_name,
         expected.table_name,
         expected.phase,
         expected.required_before,
         expected.must_be_unique,
         index_relation.oid is not null as is_present,
         coalesce(index_meta.indisunique, false) as is_unique,
         case when index_relation.oid is null then null
              else pg_catalog.pg_get_indexdef(index_relation.oid)
          end as definition
    from expected_indexes expected
    left join pg_catalog.pg_namespace namespace on namespace.nspname = 'public'
    left join pg_catalog.pg_class index_relation
      on index_relation.relnamespace = namespace.oid
     and index_relation.relname = expected.index_name
     and index_relation.relkind = 'i'
    left join pg_catalog.pg_index index_meta on index_meta.indexrelid = index_relation.oid
),
allowed_domain_policies(table_name, policy_name) as (
  values
    ('contacts', 'users_own_contacts'),
    ('notifications', 'users_own_notifications'),
    ('product_links', 'users_own_product_links'),
    ('sales', 'users_own_sales'),
    ('tags', 'users_own_tags'),
    ('tasks', 'users_own_tasks'),
    ('user_templates', 'users_own_user_templates'),
    ('settings', 'users_own_settings'),
    ('settings', 'settings_select_own'),
    ('settings', 'settings_insert_own'),
    ('settings', 'settings_update_own'),
    ('partners', 'users_own_partners'),
    ('partners', 'partners_select_own'),
    ('partners', 'partners_insert_own'),
    ('partners', 'partners_update_own')
),
domain_policy_state as (
  select policy.tablename as table_name,
         policy.policyname as policy_name,
         coalesce(policy.qual, '') ilike '%has_app_entitlement%'
           or coalesce(policy.with_check, '') ilike '%has_app_entitlement%'
           as mentions_entitlement,
         allowed.policy_name is not null as replaced_by_planned_migration
    from pg_catalog.pg_policies policy
    left join allowed_domain_policies allowed
      on allowed.table_name = policy.tablename
     and allowed.policy_name = policy.policyname
   where policy.schemaname = 'public'
     and policy.tablename in (
       'contacts', 'notifications', 'partners', 'product_links', 'sales',
       'settings', 'tags', 'tasks', 'user_templates'
     )
),
current_grant_users as (
  select distinct grant_row.user_id
    from public.access_grants grant_row
   where grant_row.status in ('active', 'grace')
     and grant_row.revoked_at is null
     and (grant_row.access_until is null or grant_row.access_until > now())
),
domain_user_ids as (
  select user_id from public.contacts
  union select user_id from public.notifications
  union select user_id from public.partners
  union select user_id from public.product_links
  union select user_id from public.sales
  union select user_id from public.settings
  union select user_id from public.tags
  union select user_id from public.tasks
  union select user_id from public.user_templates
),
duplicate_partner_codes as (
  select upper(btrim(settings.partner_code)) as normalized_code
    from public.settings settings
   where nullif(btrim(settings.partner_code), '') is not null
   group by upper(btrim(settings.partner_code))
  having count(*) > 1
),
duplicate_linked_partners as (
  select partner.partner_user_id
    from public.partners partner
   where partner.partner_user_id is not null
   group by partner.partner_user_id
  having count(*) > 1
),
partner_walk(start_user_id, next_user_id, path, cycle_found) as (
  select settings.user_id,
         settings.parent_id,
         array[settings.user_id],
         false
    from public.settings settings
   where settings.parent_id is not null
  union all
  select walk.start_user_id,
         parent.parent_id,
         walk.path || parent.user_id,
         parent.user_id = any(walk.path)
    from partner_walk walk
    join public.settings parent on parent.user_id = walk.next_user_id
   where walk.next_user_id is not null
     and not walk.cycle_found
),
row_orphans(relation_name, issue_count) as (
  select 'contacts.user_id->auth.users', count(*)::bigint
    from public.contacts row_value
   where not exists (select 1 from auth.users owner where owner.id = row_value.user_id)
  union all
  select 'notifications.user_id->auth.users', count(*)::bigint
    from public.notifications row_value
   where not exists (select 1 from auth.users owner where owner.id = row_value.user_id)
  union all
  select 'partners.user_id->auth.users', count(*)::bigint
    from public.partners row_value
   where not exists (select 1 from auth.users owner where owner.id = row_value.user_id)
  union all
  select 'product_links.user_id->auth.users', count(*)::bigint
    from public.product_links row_value
   where not exists (select 1 from auth.users owner where owner.id = row_value.user_id)
  union all
  select 'sales.user_id->auth.users', count(*)::bigint
    from public.sales row_value
   where not exists (select 1 from auth.users owner where owner.id = row_value.user_id)
  union all
  select 'settings.user_id->auth.users', count(*)::bigint
    from public.settings row_value
   where not exists (select 1 from auth.users owner where owner.id = row_value.user_id)
  union all
  select 'tags.user_id->auth.users', count(*)::bigint
    from public.tags row_value
   where not exists (select 1 from auth.users owner where owner.id = row_value.user_id)
  union all
  select 'tasks.user_id->auth.users', count(*)::bigint
    from public.tasks row_value
   where not exists (select 1 from auth.users owner where owner.id = row_value.user_id)
  union all
  select 'user_templates.user_id->auth.users', count(*)::bigint
    from public.user_templates row_value
   where not exists (select 1 from auth.users owner where owner.id = row_value.user_id)
  union all
  select 'partners.contact_id->contacts', count(*)::bigint
    from public.partners relationship
   where relationship.contact_id is not null
     and not exists (
       select 1 from public.contacts contact
        where contact.id = relationship.contact_id
          and contact.user_id = relationship.user_id
     )
  union all
  select 'sales.contact_id->contacts', count(*)::bigint
    from public.sales sale
   where sale.contact_id is not null
     and not exists (
       select 1 from public.contacts contact
        where contact.id = sale.contact_id
          and contact.user_id = sale.user_id
     )
  union all
  select 'tasks.contact_id->contacts', count(*)::bigint
    from public.tasks task
   where task.contact_id is not null
     and not exists (
       select 1 from public.contacts contact
        where contact.id = task.contact_id
          and contact.user_id = task.user_id
     )
  union all
  select 'settings.parent_id->settings', count(*)::bigint
    from public.settings child
   where child.parent_id is not null
     and not exists (select 1 from public.settings parent where parent.user_id = child.parent_id)
  union all
  select 'partners.partner_user_id->settings', count(*)::bigint
    from public.partners relationship
   where relationship.partner_user_id is not null
     and not exists (
       select 1 from public.settings child where child.user_id = relationship.partner_user_id
     )
),
connect_gate_state as (
  select function_row.oid is not null as is_present,
         coalesce(pg_catalog.pg_get_functiondef(function_row.oid) ilike '%stripe_connect_charges%', false)
           as checks_unbalanced_charges,
         coalesce(pg_catalog.pg_get_functiondef(function_row.oid) ilike '%stripe_connect_anomalies%', false)
           as checks_open_anomalies,
         coalesce(pg_catalog.has_function_privilege('anon', function_row.oid, 'EXECUTE'), false)
           as anon_can_execute,
         coalesce(pg_catalog.has_function_privilege('authenticated', function_row.oid, 'EXECUTE'), false)
           as authenticated_can_execute,
         coalesce(pg_catalog.has_function_privilege('service_role', function_row.oid, 'EXECUTE'), false)
           as service_role_can_execute
    from (values (1)) seed(value)
    left join lateral (
      select function_candidate.oid
        from pg_catalog.pg_proc function_candidate
        join pg_catalog.pg_namespace namespace on namespace.oid = function_candidate.pronamespace
       where namespace.nspname = 'public'
         and function_candidate.proname = 'assert_stripe_connect_checkout_ready'
       order by function_candidate.oid
       limit 1
    ) function_row on true
),
counts as (
  select
    (select count(*) from auth.users)::bigint as auth_users,
    (select count(*) from public.settings)::bigint as settings_users,
    (select count(*) from auth.users user_row
      where not exists (
        select 1 from current_grant_users grant_user where grant_user.user_id = user_row.id
      ))::bigint as users_without_current_grant,
    (select count(*) from domain_user_ids domain_user
      where not exists (
        select 1 from current_grant_users grant_user where grant_user.user_id = domain_user.user_id
      ))::bigint as domain_users_without_current_grant,
    (select count(*) from public.billing_accounts billing
      where billing.user_id is not null
        and billing.entitlement_eligible
        and billing.subscription_status = 'active'
        and billing.current_period_end > now()
        and not exists (
          select 1 from current_grant_users grant_user where grant_user.user_id = billing.user_id
        ))::bigint as active_billing_users_without_current_grant,
    (select count(*) from auth.users user_row
      where not exists (select 1 from public.settings settings where settings.user_id = user_row.id)
    )::bigint as auth_users_without_settings,
    (select count(*) from duplicate_partner_codes)::bigint as duplicate_partner_code_groups,
    (select count(*) from public.settings settings
      where nullif(btrim(settings.partner_code), '') is not null
        and btrim(settings.partner_code) !~ '^[A-Za-z0-9]{4,8}$'
    )::bigint as invalid_nonblank_partner_codes,
    (select count(*) from public.settings settings
      where settings.partner_code is not null
        and settings.partner_code is distinct from nullif(upper(btrim(settings.partner_code)), '')
    )::bigint as partner_codes_needing_normalization,
    (select count(*) from duplicate_linked_partners)::bigint as duplicate_linked_partner_groups,
    (select count(*) from public.settings settings where settings.parent_id = settings.user_id)::bigint
      as settings_self_parent_links,
    (select count(*) from public.partners partner
      where partner.partner_user_id = partner.user_id)::bigint as partner_self_links,
    (select count(distinct walk.start_user_id) from partner_walk walk where walk.cycle_found)::bigint
      as partner_cycle_users,
    (select count(*) from public.partners relationship
      join public.settings child on child.user_id = relationship.partner_user_id
      where relationship.partner_user_id is not null
        and child.parent_id is distinct from relationship.user_id
    )::bigint as partner_edges_with_parent_mismatch,
    (select count(*) from public.settings child
      where child.parent_id is not null
        and not exists (
          select 1 from public.partners relationship
           where relationship.user_id = child.parent_id
             and relationship.partner_user_id = child.user_id
        )
    )::bigint as settings_parent_edges_without_partner,
    (select count(*) from (
      select link.user_id, link.product_id
        from public.product_links link
       group by link.user_id, link.product_id
      having count(*) > 1
    ) duplicate)::bigint as duplicate_legacy_product_link_groups,
    (select count(*) from (
      select template.user_id, template.template_id
        from public.user_templates template
       group by template.user_id, template.template_id
      having count(*) > 1
    ) duplicate)::bigint as duplicate_legacy_template_groups,
    (select count(*) from (
      select sale.user_id, sale.operation_id
        from public.sales sale
       where sale.operation_id is not null
       group by sale.user_id, sale.operation_id
      having count(*) > 1
    ) duplicate)::bigint as duplicate_sales_operation_groups,
    (select count(*) from public.product_links link
      where nullif(link.link_url, '') is not null
        and link.link_url !~ '^https?://'
    )::bigint as invalid_legacy_product_urls,
    (select count(*) from public.stripe_connect_charges charge
      where charge.reconciliation_status <> 'balanced'
    )::bigint as connect_unbalanced_charges,
    (select count(*) from public.stripe_connect_anomalies anomaly
      where anomaly.status = 'open'
    )::bigint as connect_open_anomalies
)
select jsonb_build_object(
  'format_version', 1,
  'generated_at', now(),
  'tables', coalesce((
    select jsonb_agg(to_jsonb(state) order by state.phase, state.table_name)
      from table_state state
  ), '[]'::jsonb),
  'columns', coalesce((
    select jsonb_agg(to_jsonb(state) order by state.phase, state.table_name, state.column_name)
      from column_state state
  ), '[]'::jsonb),
  'functions', coalesce((
    select jsonb_agg(to_jsonb(state) order by state.phase, state.function_name)
      from function_state state
  ), '[]'::jsonb),
  'indexes', coalesce((
    select jsonb_agg(to_jsonb(state) order by state.phase, state.index_name)
      from index_state state
  ), '[]'::jsonb),
  'domain_policies', coalesce((
    select jsonb_agg(to_jsonb(state) order by state.table_name, state.policy_name)
      from domain_policy_state state
  ), '[]'::jsonb),
  'counts', to_jsonb(counts),
  'orphans', coalesce((
    select jsonb_agg(to_jsonb(orphan) order by orphan.relation_name)
      from row_orphans orphan
  ), '[]'::jsonb),
  'connect_gate', to_jsonb(connect_gate_state)
) as production_migration_preflight
from counts
cross join connect_gate_state;
