-- Server-side authorization for every exposed CRM table. Apply only after the
-- Stripe inventory has populated access_grants for all legacy entitled users.

create or replace function public.has_app_entitlement(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is not null
    and p_user_id = auth.uid()
    and exists (select 1 from auth.users where id = p_user_id)
    and exists (
      select 1
        from public.access_grants grant_row
       where grant_row.user_id = p_user_id
         and grant_row.status in ('active', 'grace')
         and grant_row.revoked_at is null
         and (grant_row.access_until is null or grant_row.access_until > now())
    );
$$;

revoke all on function public.has_app_entitlement(uuid) from public, anon, authenticated;
grant execute on function public.has_app_entitlement(uuid) to authenticated;

create or replace function public.complete_onboarding()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_completed_at timestamptz := now();
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception 'app_entitlement_required';
  end if;

  update public.settings
     set onboarding_completed_at = coalesce(onboarding_completed_at, v_completed_at)
   where user_id = v_user_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'settings_row_missing';
  end if;

  select onboarding_completed_at
    into v_completed_at
    from public.settings
   where user_id = v_user_id;
  return v_completed_at;
end;
$$;

revoke all on function public.complete_onboarding() from public, anon, authenticated;
grant execute on function public.complete_onboarding() to authenticated;

do $policy$
declare
  v_table text;
  v_policy text;
begin
  foreach v_table in array array[
    'contacts', 'notifications', 'product_links', 'sales', 'tags', 'tasks',
    'user_templates'
  ] loop
    v_policy := 'users_own_' || v_table;
    execute format('drop policy if exists %I on public.%I', v_policy, v_table);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      || 'using (auth.uid() = user_id and public.has_app_entitlement(auth.uid())) '
      || 'with check (auth.uid() = user_id and public.has_app_entitlement(auth.uid()))',
      v_policy,
      v_table
    );
  end loop;
end
$policy$;

-- Team edges and invitation codes are server-owned. RLS keeps every read and
-- ordinary profile/progress write tenant-bound; column grants below make the
-- graph columns impossible to write through PostgREST.
drop policy if exists users_own_settings on public.settings;
drop policy if exists settings_select_own on public.settings;
drop policy if exists settings_insert_own on public.settings;
drop policy if exists settings_update_own on public.settings;

create policy settings_select_own
  on public.settings for select to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()));

create policy settings_insert_own
  on public.settings for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.has_app_entitlement(auth.uid())
    and partner_code is null
    and parent_id is null
  );

create policy settings_update_own
  on public.settings for update to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()))
  with check (auth.uid() = user_id and public.has_app_entitlement(auth.uid()));

drop policy if exists users_own_partners on public.partners;
drop policy if exists partners_select_own on public.partners;
drop policy if exists partners_insert_own on public.partners;
drop policy if exists partners_update_own on public.partners;

create policy partners_select_own
  on public.partners for select to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()));

create policy partners_insert_own
  on public.partners for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.has_app_entitlement(auth.uid())
    and partner_user_id is null
    and (
      contact_id is null
      or exists (
        select 1 from public.contacts c
         where c.id = partners.contact_id and c.user_id = auth.uid()
      )
    )
  );

create policy partners_update_own
  on public.partners for update to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()))
  with check (
    auth.uid() = user_id
    and public.has_app_entitlement(auth.uid())
    and (
      contact_id is null
      or exists (
        select 1 from public.contacts c
         where c.id = partners.contact_id and c.user_id = auth.uid()
      )
    )
  );

revoke all on table public.settings from public, anon, authenticated;
grant select on table public.settings to authenticated;
grant insert (
  user_id, user_name, user_phone, default_currency, notifications_enabled,
  user_photo, last_active
) on public.settings to authenticated;
grant update (
  user_name, user_phone, default_currency, notifications_enabled, user_photo,
  last_active
) on public.settings to authenticated;

revoke all on table public.partners from public, anon, authenticated;
grant select on table public.partners to authenticated;
grant insert (
  user_id, contact_id, start_date, fast_start_deadline, fast_start_status,
  fase_actual, qteam_completed, fs_level1_completed, fs_level2_completed,
  xteam_completed
) on public.partners to authenticated;
grant update (
  contact_id, start_date, fast_start_deadline, fast_start_status, fase_actual,
  qteam_completed, fs_level1_completed, fs_level2_completed, xteam_completed
) on public.partners to authenticated;
