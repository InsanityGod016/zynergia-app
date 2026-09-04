-- Preserve the legacy mobile RPC names while enforcing the actual team boundary.
-- A leader may read only aggregate data for users linked in their own partners rows.

-- Stop instead of guessing if production already contains ambiguous codes or
-- more than one leader for the same linked account.
do $precheck$
begin
  if exists (
    select 1
      from public.settings
     where nullif(btrim(partner_code), '') is not null
     group by upper(btrim(partner_code))
    having count(*) > 1
  ) then
    raise exception 'duplicate_partner_codes_case_insensitive';
  end if;

  if exists (
    select 1
      from public.partners
     where partner_user_id is not null
     group by partner_user_id
    having count(*) > 1
  ) then
    raise exception 'duplicate_partner_relationships';
  end if;
end
$precheck$;

update public.settings
   set partner_code = nullif(upper(btrim(partner_code)), '')
 where partner_code is not null;

create unique index if not exists settings_partner_code_ci_idx
  on public.settings (upper(partner_code))
  where partner_code is not null;

create unique index if not exists partners_linked_user_unique_idx
  on public.partners (partner_user_id)
  where partner_user_id is not null;

create or replace function public.ensure_partner_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_attempt integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;

  select partner_code
    into v_code
    from public.settings
   where user_id = auth.uid()
   for update;
  if not found then
    raise exception 'settings_row_missing';
  end if;
  if v_code is not null then
    return v_code;
  end if;

  for v_attempt in 1..8 loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      update public.settings
         set partner_code = v_code
       where user_id = auth.uid()
         and partner_code is null;
      return v_code;
    exception when unique_violation then
      -- A collision is harmless; generate another opaque code.
    end;
  end loop;

  raise exception 'partner_code_generation_failed';
end;
$$;

create or replace function public.lookup_partner_code(code text)
returns table(found_user_id uuid, found_user_name text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;
  if nullif(btrim(code), '') is null or btrim(code) !~ '^[A-Za-z0-9]{4,8}$' then
    return;
  end if;

  return query
  select s.user_id, s.user_name
    from public.settings s
   where upper(s.partner_code) = upper(btrim(code))
   limit 1;
end;
$$;

-- Used during onboarding: the signed-in child joins the owner of the supplied
-- code. The code, profile name and graph edge are all resolved on the server.
create or replace function public.join_upline_by_code(p_code text)
returns table(upline_user_id uuid, upline_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_child public.settings%rowtype;
  v_upline public.settings%rowtype;
  v_existing_owner uuid;
  v_existing_partner_id uuid;
  v_contact_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;
  if nullif(btrim(p_code), '') is null or btrim(p_code) !~ '^[A-Za-z0-9]{4,8}$' then
    raise exception 'invalid_partner_code';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('zynergia_partner_graph', 0)
  );

  select * into v_child
    from public.settings
   where user_id = auth.uid()
   for update;
  if not found then
    raise exception 'settings_row_missing';
  end if;

  select * into v_upline
    from public.settings
   where upper(partner_code) = upper(btrim(p_code))
   for update;
  if not found then
    raise exception 'partner_code_not_found';
  end if;
  if v_upline.user_id = auth.uid() then
    raise exception 'self_link_not_allowed';
  end if;
  if v_child.parent_id is not null and v_child.parent_id <> v_upline.user_id then
    raise exception 'partner_already_linked';
  end if;

  select p.user_id, p.id
    into v_existing_owner, v_existing_partner_id
    from public.partners p
   where p.partner_user_id = auth.uid()
   for update;
  if found and v_existing_owner <> v_upline.user_id then
    raise exception 'partner_already_linked';
  end if;

  if exists (
    with recursive ancestors(user_id, parent_id) as (
      select s.user_id, s.parent_id
        from public.settings s
       where s.user_id = v_upline.user_id
      union
      select parent.user_id, parent.parent_id
        from public.settings parent
        join ancestors child on parent.user_id = child.parent_id
       where child.parent_id is not null
    )
    select 1 from ancestors where user_id = auth.uid()
  ) then
    raise exception 'partner_cycle_detected';
  end if;

  if v_existing_partner_id is null then
    insert into public.contacts (
      user_id, full_name, contact_type, phone, country_code, notes
    ) values (
      v_upline.user_id,
      coalesce(nullif(btrim(v_child.user_name), ''), 'Partner'),
      'partner', '', '+52', 'Agregado por código de invitación'
    ) returning id into v_contact_id;

    insert into public.partners (
      user_id, contact_id, partner_user_id, start_date, fast_start_deadline,
      fast_start_status, fase_actual, qteam_completed, fs_level1_completed,
      fs_level2_completed, xteam_completed
    ) values (
      v_upline.user_id, v_contact_id, auth.uid(), current_date, current_date + 120,
      'activo', 1, false, false, false, false
    );
  end if;

  update public.settings
     set parent_id = v_upline.user_id
   where user_id = auth.uid()
     and (parent_id is null or parent_id = v_upline.user_id);
  if not found then
    raise exception 'partner_already_linked';
  end if;

  return query
  select v_upline.user_id,
         coalesce(nullif(btrim(v_upline.user_name), ''), 'Líder');
end;
$$;

create or replace function public.get_partner_sales_data(p_user_id uuid)
returns table(product_id text, contact_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not (
    p_user_id = auth.uid()
    or exists (
      select 1
        from public.partners relationship
       where relationship.user_id = auth.uid()
         and relationship.partner_user_id = p_user_id
    )
  ) then
    raise exception 'partner_access_denied';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;

  return query
  select s.product_id, s.contact_id, coalesce(s.status, 'active')
    from public.sales s
   where s.user_id = p_user_id;
end;
$$;

create or replace function public.get_partner_partners_count(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not (
    p_user_id = auth.uid()
    or exists (
      select 1
        from public.partners relationship
       where relationship.user_id = auth.uid()
         and relationship.partner_user_id = p_user_id
    )
  ) then
    raise exception 'partner_access_denied';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;

  select count(*)::integer
    into v_count
    from public.partners p
   where p.user_id = p_user_id;
  return v_count;
end;
$$;

create or replace function public.get_partner_stats(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result json;
begin
  if auth.uid() is null or not (
    p_user_id = auth.uid()
    or exists (
      select 1
        from public.partners relationship
       where relationship.user_id = auth.uid()
         and relationship.partner_user_id = p_user_id
    )
  ) then
    raise exception 'partner_access_denied';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;

  select json_build_object(
    'clients', (select count(*) from public.contacts where user_id = p_user_id and contact_type = 'cliente_producto'),
    'active_sales', (select count(*) from public.sales where user_id = p_user_id and coalesce(status, 'active') = 'active'),
    'partners', (select count(*) from public.partners where user_id = p_user_id),
    'active_partners', (select count(*) from public.partners where user_id = p_user_id and fast_start_status = 'activo'),
    'tasks_done', (select count(*) from public.tasks where user_id = p_user_id and completed is true)
  ) into v_result;
  return v_result;
end;
$$;

drop function if exists public.get_partners_activity(uuid[]);

create function public.get_partners_activity(user_ids uuid[])
returns table(user_id uuid, last_active timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;
  if exists (
    select 1
      from unnest(coalesce(user_ids, array[]::uuid[])) requested(user_id)
     where requested.user_id <> auth.uid()
       and not exists (
         select 1
           from public.partners relationship
          where relationship.user_id = auth.uid()
            and relationship.partner_user_id = requested.user_id
       )
  ) then
    raise exception 'partner_access_denied';
  end if;

  return query
  select s.user_id, s.last_active
    from public.settings s
   where s.user_id = any(coalesce(user_ids, array[]::uuid[]));
end;
$$;

create or replace function public.get_partners_fs_metrics(user_ids uuid[], premier_product_ids text[])
returns table(user_id uuid, premier_clients integer, partners_count integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;
  if exists (
    select 1
      from unnest(coalesce(user_ids, array[]::uuid[])) requested(user_id)
     where requested.user_id <> auth.uid()
       and not exists (
         select 1
           from public.partners relationship
          where relationship.user_id = auth.uid()
            and relationship.partner_user_id = requested.user_id
       )
  ) then
    raise exception 'partner_access_denied';
  end if;

  return query
  with requested_users as (
    select distinct requested.user_id
      from unnest(coalesce(user_ids, array[]::uuid[])) requested(user_id)
  ), premier as (
    select s.user_id, count(distinct s.contact_id)::integer as premier_clients
      from public.sales s
     where s.user_id = any(coalesce(user_ids, array[]::uuid[]))
       -- Keep the second argument for released clients, but never let a client
       -- decide which products qualify for Fast Start.
       and s.product_id = any(array[
         'prod_kit_belage',
         'prod_kit_kronuit_fire',
         'prod_kit_inner_7',
         'prod_kit_hasaki',
         'prod_kit_zeal',
         'prod_kit_zeal_10',
         'prod_kit_balanceoil',
         'prod_kit_balanceoil_with_test',
         'prod_kit_viv',
         'prod_kit_xtend',
         'prod_kit_serum'
       ]::text[])
       and coalesce(s.status, 'active') <> 'cancelled'
     group by s.user_id
  ), partner_counts as (
    select p.user_id, count(*)::integer as partners_count
      from public.partners p
     where p.user_id = any(coalesce(user_ids, array[]::uuid[]))
     group by p.user_id
  )
  select requested.user_id,
         coalesce(premier.premier_clients, 0),
         coalesce(partner_counts.partners_count, 0)
    from requested_users requested
    left join premier on premier.user_id = requested.user_id
    left join partner_counts on partner_counts.user_id = requested.user_id;
end;
$$;

create or replace function public.register_as_partner(
  p_upline_user_id uuid,
  p_new_user_name text,
  p_new_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact_id uuid;
  v_parent_id uuid;
begin
  if auth.uid() is null or p_new_user_id is distinct from auth.uid() then
    raise exception 'partner_registration_identity_mismatch';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;
  if p_upline_user_id is null or p_upline_user_id = auth.uid() then
    raise exception 'invalid_upline';
  end if;
  if nullif(btrim(p_new_user_name), '') is null then
    raise exception 'partner_name_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('zynergia_partner_graph', 0)
  );

  select s.parent_id
    into v_parent_id
    from public.settings s
   where s.user_id = auth.uid()
   for update;

  if not found or v_parent_id is distinct from p_upline_user_id then
    raise exception 'verified_upline_required';
  end if;
  if not exists (select 1 from public.settings where user_id = p_upline_user_id) then
    raise exception 'upline_not_found';
  end if;
  if exists (
    with recursive ancestors(user_id, parent_id) as (
      select s.user_id, s.parent_id
        from public.settings s
       where s.user_id = p_upline_user_id
      union
      select parent.user_id, parent.parent_id
        from public.settings parent
        join ancestors child on parent.user_id = child.parent_id
       where child.parent_id is not null
    )
    select 1 from ancestors where user_id = auth.uid()
  ) then
    raise exception 'partner_cycle_detected';
  end if;
  if exists (
    select 1 from public.partners
     where user_id = p_upline_user_id and partner_user_id = auth.uid()
  ) then
    return;
  end if;

  insert into public.contacts (
    user_id, full_name, contact_type, phone, country_code, notes
  ) values (
    p_upline_user_id, btrim(p_new_user_name), 'partner', '', '+52',
    'Agregado por código de invitación'
  ) returning id into v_contact_id;

  insert into public.partners (
    user_id, contact_id, partner_user_id, start_date, fast_start_deadline,
    fast_start_status, fase_actual, qteam_completed, fs_level1_completed,
    fs_level2_completed, xteam_completed
  ) values (
    p_upline_user_id, v_contact_id, auth.uid(), current_date, current_date + 120,
    'activo', 1, false, false, false, false
  );
end;
$$;

create or replace function public.link_partner_by_code(p_code text)
returns table(partner_id uuid, contact_id uuid, partner_user_id uuid, partner_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.settings%rowtype;
  v_contact_id uuid;
  v_partner_id uuid;
  v_existing_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;
  if nullif(btrim(p_code), '') is null or btrim(p_code) !~ '^[A-Za-z0-9]{4,8}$' then
    raise exception 'invalid_partner_code';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('zynergia_partner_graph', 0)
  );

  select * into v_target
    from public.settings
   where upper(partner_code) = upper(btrim(p_code))
   for update;
  if not found then
    raise exception 'partner_code_not_found';
  end if;
  if v_target.user_id = auth.uid() then
    raise exception 'self_link_not_allowed';
  end if;
  if v_target.parent_id is not null and v_target.parent_id <> auth.uid() then
    raise exception 'partner_already_linked';
  end if;
  select p.user_id
    into v_existing_owner
    from public.partners p
   where p.partner_user_id = v_target.user_id
   for update;
  if found and v_existing_owner <> auth.uid() then
    raise exception 'partner_already_linked';
  end if;
  if exists (
    with recursive ancestors(user_id, parent_id) as (
      select s.user_id, s.parent_id
        from public.settings s
       where s.user_id = auth.uid()
      union
      select parent.user_id, parent.parent_id
        from public.settings parent
        join ancestors child on parent.user_id = child.parent_id
       where child.parent_id is not null
    )
    select 1 from ancestors where user_id = v_target.user_id
  ) then
    raise exception 'partner_cycle_detected';
  end if;

  select p.id, p.contact_id
    into v_partner_id, v_contact_id
    from public.partners p
   where p.user_id = auth.uid() and p.partner_user_id = v_target.user_id
   order by p.created_at
   limit 1
   for update;

  if v_partner_id is null then
    insert into public.contacts (
      user_id, full_name, contact_type, phone, country_code, notes
    ) values (
      auth.uid(), coalesce(nullif(btrim(v_target.user_name), ''), 'Partner'),
      'partner', '', '+52', 'Agregado por código de partner'
    ) returning id into v_contact_id;

    insert into public.partners (
      user_id, contact_id, partner_user_id, start_date, fast_start_deadline,
      fast_start_status, fase_actual, qteam_completed, fs_level1_completed,
      fs_level2_completed, xteam_completed
    ) values (
      auth.uid(), v_contact_id, v_target.user_id, current_date, current_date + 120,
      'activo', 1, false, false, false, false
    ) returning id into v_partner_id;
  end if;

  update public.settings
     set parent_id = auth.uid()
   where user_id = v_target.user_id
     and (parent_id is null or parent_id = auth.uid());

  return query select v_partner_id, v_contact_id, v_target.user_id,
    coalesce(nullif(btrim(v_target.user_name), ''), 'Partner');
end;
$$;

create or replace function public.link_existing_partner_by_code(p_partner_id uuid, p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.settings%rowtype;
  v_current_partner_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('zynergia_partner_graph', 0)
  );

  select p.partner_user_id
    into v_current_partner_user_id
    from public.partners p
   where p.id = p_partner_id and p.user_id = auth.uid()
   for update;
  if not found then
    raise exception 'partner_not_found';
  end if;

  select * into v_target
    from public.settings
   where upper(partner_code) = upper(btrim(p_code))
   for update;
  if not found then
    raise exception 'partner_code_not_found';
  end if;
  if v_target.user_id = auth.uid() then
    raise exception 'self_link_not_allowed';
  end if;
  if v_current_partner_user_id is not null and v_current_partner_user_id <> v_target.user_id then
    raise exception 'partner_record_already_linked';
  end if;
  if v_target.parent_id is not null and v_target.parent_id <> auth.uid() then
    raise exception 'partner_already_linked';
  end if;
  if exists (
    with recursive ancestors(user_id, parent_id) as (
      select s.user_id, s.parent_id from public.settings s where s.user_id = auth.uid()
      union
      select parent.user_id, parent.parent_id
        from public.settings parent
        join ancestors child on parent.user_id = child.parent_id
       where child.parent_id is not null
    )
    select 1 from ancestors where user_id = v_target.user_id
  ) then
    raise exception 'partner_cycle_detected';
  end if;
  if exists (
    select 1 from public.partners p
     where p.partner_user_id = v_target.user_id
       and p.id <> p_partner_id
  ) then
    raise exception 'partner_duplicate_link';
  end if;

  update public.partners
     set partner_user_id = v_target.user_id
   where id = p_partner_id and user_id = auth.uid();
  update public.settings
     set parent_id = auth.uid()
   where user_id = v_target.user_id
     and (parent_id is null or parent_id = auth.uid());
  return v_target.user_id;
end;
$$;

-- Retain the legacy name for older builds, but only after the caller already owns
-- a partner row linked to that child.
create or replace function public.set_parent_id(p_child_user_id uuid, p_parent_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_parent_user_id is distinct from auth.uid() then
    raise exception 'parent_identity_mismatch';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;
  if p_child_user_id is null or p_child_user_id = auth.uid() then
    raise exception 'invalid_child';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('zynergia_partner_graph', 0)
  );
  if not exists (
    select 1 from public.partners p
     where p.user_id = auth.uid() and p.partner_user_id = p_child_user_id
  ) then
    raise exception 'verified_partner_link_required';
  end if;

  update public.settings
     set parent_id = auth.uid()
   where user_id = p_child_user_id
     and (parent_id is null or parent_id = auth.uid());
  if not found then
    raise exception 'child_already_has_parent';
  end if;
end;
$$;

revoke all on function public.lookup_partner_code(text) from public, anon, authenticated;
revoke all on function public.ensure_partner_code() from public, anon, authenticated;
revoke all on function public.join_upline_by_code(text) from public, anon, authenticated;
revoke all on function public.get_partner_sales_data(uuid) from public, anon, authenticated;
revoke all on function public.get_partner_partners_count(uuid) from public, anon, authenticated;
revoke all on function public.get_partner_stats(uuid) from public, anon, authenticated;
revoke all on function public.get_partners_activity(uuid[]) from public, anon, authenticated;
revoke all on function public.get_partners_fs_metrics(uuid[], text[]) from public, anon, authenticated;
revoke all on function public.register_as_partner(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.link_partner_by_code(text) from public, anon, authenticated;
revoke all on function public.link_existing_partner_by_code(uuid, text) from public, anon, authenticated;
revoke all on function public.set_parent_id(uuid, uuid) from public, anon, authenticated;
revoke all on function public.import_partner_clients(uuid) from public, anon, authenticated, service_role;
revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;

grant execute on function public.lookup_partner_code(text) to authenticated;
grant execute on function public.ensure_partner_code() to authenticated;
grant execute on function public.join_upline_by_code(text) to authenticated;
grant execute on function public.get_partner_partners_count(uuid) to authenticated;
grant execute on function public.get_partner_stats(uuid) to authenticated;
grant execute on function public.get_partners_activity(uuid[]) to authenticated;
grant execute on function public.get_partners_fs_metrics(uuid[], text[]) to authenticated;
grant execute on function public.link_partner_by_code(text) to authenticated;
grant execute on function public.link_existing_partner_by_code(uuid, text) to authenticated;
