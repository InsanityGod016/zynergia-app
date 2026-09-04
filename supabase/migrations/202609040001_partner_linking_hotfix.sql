-- Production hotfix: the published client already calls these RPCs during
-- onboarding, but the legacy production project did not contain them.
-- Keep this narrowly scoped: it adds no global RLS policy and does not alter
-- existing rows. The relationship write itself is one database transaction.

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
      -- A collision is harmless; retry with another opaque code.
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
  if nullif(btrim(code), '') is null or btrim(code) !~ '^[A-Za-z0-9]{4,8}$' then
    return;
  end if;

  return query
  select s.user_id, s.user_name
    from public.settings s
   where upper(s.partner_code) = upper(btrim(code))
     and s.user_id <> auth.uid()
   limit 1;
end;
$$;

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

revoke all on function public.ensure_partner_code() from public, anon, authenticated;
revoke all on function public.lookup_partner_code(text) from public, anon, authenticated;
revoke all on function public.join_upline_by_code(text) from public, anon, authenticated;
grant execute on function public.ensure_partner_code() to authenticated;
grant execute on function public.lookup_partner_code(text) to authenticated;
grant execute on function public.join_upline_by_code(text) to authenticated;
