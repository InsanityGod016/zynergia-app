-- Notification preferences and a server-owned delivery outbox. Existing local
-- notification behavior remains compatible with 1.1.x clients.

alter table public.settings
  add column if not exists task_notifications_enabled boolean not null default true,
  add column if not exists daily_summary_enabled boolean not null default true,
  add column if not exists daily_summary_time time without time zone not null default time '09:00',
  add column if not exists fast_start_notifications_enabled boolean not null default true,
  add column if not exists push_consent_given boolean not null default false,
  add column if not exists timezone text not null default 'America/Mexico_City';

update public.settings
   set task_notifications_enabled = coalesce(notifications_enabled, true),
       daily_summary_enabled = coalesce(notifications_enabled, true),
       fast_start_notifications_enabled = coalesce(notifications_enabled, true)
 where notifications_enabled is false;

create or replace function public.validate_settings_timezone_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.timezone is null or not exists (
    select 1
      from pg_catalog.pg_timezone_names timezone_row
     where timezone_row.name = new.timezone
  ) then
    raise exception using errcode = '22023', message = 'invalid_settings_timezone';
  end if;
  return new;
end;
$$;

drop trigger if exists settings_validate_timezone_write on public.settings;
create trigger settings_validate_timezone_write
before insert or update of timezone on public.settings
for each row execute function public.validate_settings_timezone_write();

revoke all on function public.validate_settings_timezone_write()
  from public, anon, authenticated;

revoke update on table public.settings from authenticated;
grant insert (
  user_id, user_name, user_phone, default_currency, notifications_enabled,
  user_photo, last_active, task_notifications_enabled, daily_summary_enabled,
  daily_summary_time, fast_start_notifications_enabled, push_consent_given, timezone
) on public.settings to authenticated;
grant update (
  user_id, user_name, user_phone, default_currency, notifications_enabled, user_photo,
  last_active, task_notifications_enabled, daily_summary_enabled,
  daily_summary_time, fast_start_notifications_enabled, push_consent_given, timezone
) on public.settings to authenticated;

alter table public.notifications
  add column if not exists channel text not null default 'in_app',
  add column if not exists related_entity_id text,
  add column if not exists route text,
  add column if not exists dedupe_key text,
  add column if not exists scheduled_for timestamptz,
  add column if not exists delivery_status text not null default 'not_applicable',
  add column if not exists provider_message_id text,
  add column if not exists delivery_attempted_at timestamptz,
  add column if not exists delivery_attempt_count integer not null default 0,
  add column if not exists delivery_next_attempt_at timestamptz,
  add column if not exists delivery_lease_until timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivery_error_code text;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.notifications'::regclass
       and conname = 'notifications_channel_check'
  ) then
    alter table public.notifications
      add constraint notifications_channel_check
      check (channel in ('in_app', 'local', 'push'));
  end if;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.notifications'::regclass
       and conname = 'notifications_delivery_status_check'
  ) then
    alter table public.notifications
      add constraint notifications_delivery_status_check
      check (delivery_status in ('not_applicable', 'pending', 'sending', 'sent', 'delivered', 'failed', 'skipped'));
  end if;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.notifications'::regclass
       and conname = 'notifications_route_check'
  ) then
    alter table public.notifications
      add constraint notifications_route_check
      check (route is null or route = '/' or route ~ '^/(Tasks|Partners)(\?(taskId|partnerId)=[A-Za-z0-9_-]{1,80})?$');
  end if;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.notifications'::regclass
       and conname = 'notifications_delivery_attempt_count_check'
  ) then
    alter table public.notifications
      add constraint notifications_delivery_attempt_count_check
      check (delivery_attempt_count between 0 and 20);
  end if;
end
$constraints$;

create unique index if not exists notifications_user_dedupe_idx
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists notifications_pending_delivery_idx
  on public.notifications (scheduled_for, created_at)
  where channel = 'push' and delivery_status = 'pending';

create index if not exists notifications_push_retry_idx
  on public.notifications (delivery_next_attempt_at, delivery_lease_until, created_at)
  where channel = 'push' and delivery_status in ('pending', 'sending');

-- Only the server can claim or update delivery metadata. The mobile client can
-- still read its own notifications through the existing RLS policy.
revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;
grant insert (user_id, title, body, type, related_entity_type, is_read, created_date)
  on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

-- Called only by trusted domain RPCs/triggers. The caller remains one endpoint
-- of the verified direct relationship; clients cannot execute this hook
-- directly. A window-scoped fingerprint makes retries and corrections silent.
create or replace function public.queue_fast_start_refresh(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_started_at date;
  v_self_enabled boolean := false;
  v_qteam_kits integer := 0;
  v_xteam_kits integer := 0;
  v_partners_count integer := 0;
  v_completed_branches integer := 0;
  v_leader_id uuid;
  v_partner_id text;
  v_window_key text;
  v_title text;
  v_body text;
  v_dedupe_key text;
  v_remaining integer;
  v_inserted integer := 0;
  v_rows integer := 0;
begin
  if v_caller_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if p_user_id is null then
    raise exception using errcode = '42501', message = 'fast_start_owner_mismatch';
  end if;
  if not public.has_app_entitlement(v_caller_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if p_user_id <> v_caller_id and not exists (
    select 1
      from public.partners relationship
      join public.settings child
        on child.user_id = relationship.partner_user_id
       and child.parent_id = relationship.user_id
     where (relationship.user_id = v_caller_id and relationship.partner_user_id = p_user_id)
        or (relationship.user_id = p_user_id and relationship.partner_user_id = v_caller_id)
  ) then
    raise exception using errcode = '42501', message = 'fast_start_owner_mismatch';
  end if;
  if not exists (
    select 1
      from public.access_grants access_grant
     where access_grant.user_id = p_user_id
       and access_grant.status in ('active', 'grace')
       and access_grant.revoked_at is null
       and (access_grant.access_until is null or access_grant.access_until > now())
  ) then
    return 0;
  end if;

  -- Serialize the aggregate and milestone decision per account. Concurrent
  -- orders with different operation IDs must not cross a threshold unseen.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('fast_start_refresh:' || p_user_id::text, 0)
  );

  select settings.fast_start_started_at,
         settings.notifications_enabled is true
           and settings.push_consent_given
           and settings.fast_start_notifications_enabled
    into v_started_at, v_self_enabled
    from public.settings settings
   where settings.user_id = p_user_id;

  -- A missing Fast Start date means there is no authoritative window yet.
  if not found or v_started_at is null then
    return 0;
  end if;
  v_window_key := pg_catalog.to_char(v_started_at, 'YYYYMMDD');

  -- A corrected Fast Start date invalidates queued advice from the prior
  -- window. Rows already accepted by the provider stay immutable, but pending
  -- or abandoned work must not tell the user about obsolete progress.
  update public.notifications notification
     set delivery_status = 'skipped',
         delivery_lease_until = null,
         delivery_next_attempt_at = null,
         delivery_error_code = 'superseded_fast_start_window'
   where notification.user_id = p_user_id
     and notification.channel = 'push'
     and (
       notification.delivery_status = 'pending'
       or (
         notification.delivery_status = 'sending'
         and coalesce(notification.delivery_lease_until, '-infinity'::timestamptz) <= now()
       )
     )
     and notification.dedupe_key like 'fast-start:self:%'
     and not (
       notification.dedupe_key like '%:' || v_window_key
       or notification.dedupe_key like '%:' || v_window_key || ':%'
     );

  select coalesce(sum(sale.quantity) filter (
           where sale.purchase_date between v_started_at and v_started_at + 30
         ), 0)::integer,
         coalesce(sum(sale.quantity) filter (
           where sale.purchase_date between v_started_at and v_started_at + 120
         ), 0)::integer
    into v_qteam_kits, v_xteam_kits
    from public.sales sale
   where sale.user_id = p_user_id
     and sale.product_id = any(array[
       'prod_kit_belage', 'prod_kit_kronuit_fire', 'prod_kit_inner_7',
       'prod_kit_hasaki', 'prod_kit_zeal', 'prod_kit_zeal_10',
       'prod_kit_balanceoil', 'prod_kit_balanceoil_with_test', 'prod_kit_viv',
       'prod_kit_xtend', 'prod_kit_serum'
     ]::text[])
     and sale.sale_type = 'nueva'
     and sale.purchase_date <= current_date
     and (
       coalesce(sale.status, 'active') <> 'cancelled'
       or sale.follow_up_stopped_at is not null
     );

  select count(*)::integer
    into v_partners_count
    from public.partners relationship
   where relationship.user_id = p_user_id
     and relationship.start_date between v_started_at and v_started_at + 60
     and relationship.start_date <= current_date;

  select count(*)::integer
    into v_completed_branches
    from (
      select relationship.id
        from public.partners relationship
        join public.settings child
          on child.user_id = relationship.partner_user_id
         and child.parent_id = p_user_id
        left join public.sales sale
          on sale.user_id = relationship.partner_user_id
       where relationship.user_id = p_user_id
         and relationship.partner_user_id is not null
         and relationship.start_date between v_started_at and v_started_at + 60
         and relationship.start_date <= current_date
         and child.fast_start_started_at is not null
       group by relationship.id, child.fast_start_started_at
      having coalesce(sum(sale.quantity) filter (
               where sale.product_id = any(array[
                 'prod_kit_belage', 'prod_kit_kronuit_fire', 'prod_kit_inner_7',
                 'prod_kit_hasaki', 'prod_kit_zeal', 'prod_kit_zeal_10',
                 'prod_kit_balanceoil', 'prod_kit_balanceoil_with_test', 'prod_kit_viv',
                 'prod_kit_xtend', 'prod_kit_serum'
               ]::text[])
                 and sale.sale_type = 'nueva'
                 and sale.purchase_date <= current_date
                 and sale.purchase_date between child.fast_start_started_at
                                            and child.fast_start_started_at + 30
                 and sale.purchase_date between v_started_at and v_started_at + 90
                 and (
                   coalesce(sale.status, 'active') <> 'cancelled'
                   or sale.follow_up_stopped_at is not null
                 )
             ), 0) >= 4
    ) completed;

  if v_self_enabled then
    -- Bonus crossings are independent. One order can cross several thresholds,
    -- so enqueue every newly reached bonus before selecting one next action.
    if v_qteam_kits >= 4 then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, is_read, created_date,
        channel, route, dedupe_key, scheduled_for, delivery_status
      ) values (
        p_user_id, '¡Meta Q-Team alcanzada!',
        'Alcanzaste 4 kits Premier. Revisa el estado de tu bono Q-Team.',
        'info', 'dashboard', false, now()::text,
        'push', '/Partners', 'fast-start:self:bonus:q-team:' || v_window_key,
        now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;

    if v_qteam_kits >= 4 and v_partners_count >= 2 then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, is_read, created_date,
        channel, route, dedupe_key, scheduled_for, delivery_status
      ) values (
        p_user_id, '¡Fast Start Nivel 1 alcanzado!',
        'Completaste Q-Team y agregaste 2 partners directos. Revisa el estado de tu bono.',
        'info', 'dashboard', false, now()::text,
        'push', '/Partners', 'fast-start:self:bonus:level-1:' || v_window_key,
        now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;

    if v_qteam_kits >= 4 and v_partners_count >= 2 and v_completed_branches >= 2 then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, is_read, created_date,
        channel, route, dedupe_key, scheduled_for, delivery_status
      ) values (
        p_user_id, '¡Fast Start Nivel 2 alcanzado!',
        'Dos ramas directas completaron Q-Team. Revisa el estado de tu bono.',
        'info', 'dashboard', false, now()::text,
        'push', '/Partners', 'fast-start:self:bonus:level-2:' || v_window_key,
        now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;

    if v_xteam_kits >= 10 then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, is_read, created_date,
        channel, route, dedupe_key, scheduled_for, delivery_status
      ) values (
        p_user_id, '¡Meta X-Team alcanzada!',
        'Alcanzaste 10 kits Premier. Revisa el estado de tu bono X-Team.',
        'info', 'dashboard', false, now()::text,
        'push', '/Partners', 'fast-start:self:bonus:x-team:' || v_window_key,
        now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;

    v_title := null;
    v_body := null;
    v_dedupe_key := null;

    if v_qteam_kits < 4 and current_date <= v_started_at + 30 then
      v_remaining := 4 - v_qteam_kits;
      v_title := case when v_remaining = 1
        then 'Te falta 1 kit para Q-Team'
        else 'Te faltan ' || v_remaining::text || ' kits para Q-Team' end;
      v_body := case when v_remaining = 1
        then 'Estás a 1 kit Premier de tu siguiente meta y su bono.'
        else 'Estás a ' || v_remaining::text || ' kits Premier de tu siguiente meta y su bono.' end;
      v_dedupe_key := 'fast-start:self:next:q-team:' || v_window_key || ':' || v_remaining::text;
    elsif v_qteam_kits >= 4 and v_partners_count < 2
          and current_date <= v_started_at + 60 then
      v_remaining := 2 - v_partners_count;
      v_title := case when v_remaining = 1
        then 'Te falta 1 partner para Nivel 1'
        else 'Te faltan 2 partners para Nivel 1' end;
      v_body := 'Agrega partners directos para avanzar a tu siguiente bono Fast Start.';
      v_dedupe_key := 'fast-start:self:next:level-1:' || v_window_key || ':' || v_remaining::text;
    elsif v_qteam_kits >= 4 and v_partners_count >= 2
          and v_completed_branches < 2
          and current_date <= v_started_at + 90 then
      v_remaining := 2 - v_completed_branches;
      v_title := case when v_remaining = 1
        then 'Te falta 1 rama para Nivel 2'
        else 'Te faltan 2 ramas para Nivel 2' end;
      v_body := 'Apoya a tus ramas directas para que completen 4 kits Premier en Q-Team.';
      v_dedupe_key := 'fast-start:self:next:level-2:' || v_window_key || ':' || v_remaining::text;
    end if;

    if v_dedupe_key is null and v_xteam_kits < 10
          and current_date <= v_started_at + 120 then
      v_remaining := 10 - v_xteam_kits;
      v_title := case when v_remaining = 1
        then 'Te falta 1 kit para X-Team'
        else 'Te faltan ' || v_remaining::text || ' kits para X-Team' end;
      v_body := case when v_remaining = 1
        then 'Estás a 1 kit Premier de tu siguiente meta y su bono.'
        else 'Estás a ' || v_remaining::text || ' kits Premier de tu siguiente meta y su bono.' end;
      v_dedupe_key := 'fast-start:self:next:x-team:' || v_window_key || ':' || v_remaining::text;
    end if;

    update public.notifications notification
       set delivery_status = 'skipped',
           delivery_lease_until = null,
           delivery_next_attempt_at = null,
           delivery_error_code = 'superseded_fast_start_action'
     where notification.user_id = p_user_id
       and notification.channel = 'push'
       and (
         notification.delivery_status = 'pending'
         or (
           notification.delivery_status = 'sending'
           and coalesce(notification.delivery_lease_until, '-infinity'::timestamptz) <= now()
         )
       )
       and notification.dedupe_key like 'fast-start:self:next:%'
       and notification.dedupe_key is distinct from v_dedupe_key;

    if v_dedupe_key is not null then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, is_read, created_date,
        channel, route, dedupe_key, scheduled_for, delivery_status
      ) values (
        p_user_id, v_title, v_body,
        'info', 'dashboard', false, now()::text,
        'push', '/Partners', v_dedupe_key, now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;
  end if;

  -- Both graph edges must agree before the upline receives anything. The
  -- payload is intentionally aggregate-only: no contact, order or sale data.
  select child.parent_id, relationship.id::text
    into v_leader_id, v_partner_id
    from public.settings child
    join public.partners relationship
      on relationship.user_id = child.parent_id
     and relationship.partner_user_id = p_user_id
   where child.user_id = p_user_id
     and child.parent_id is not null
   limit 1;

  if v_leader_id is not null then
    update public.notifications notification
       set delivery_status = 'skipped',
           delivery_lease_until = null,
           delivery_next_attempt_at = null,
           delivery_error_code = 'superseded_fast_start_window'
     where notification.user_id = v_leader_id
       and notification.channel = 'push'
       and (
         notification.delivery_status = 'pending'
         or (
           notification.delivery_status = 'sending'
           and coalesce(notification.delivery_lease_until, '-infinity'::timestamptz) <= now()
         )
       )
       and notification.dedupe_key like 'fast-start:partner:' || p_user_id::text || ':%'
       and not (
         notification.dedupe_key like '%:' || v_window_key
         or notification.dedupe_key like '%:' || v_window_key || ':%'
       );
  end if;

  if v_leader_id is not null
     and exists (
       select 1
         from public.settings leader_settings
        where leader_settings.user_id = v_leader_id
          and leader_settings.notifications_enabled is true
          and leader_settings.push_consent_given
          and leader_settings.fast_start_notifications_enabled
     )
     and exists (
       select 1
         from public.access_grants access_grant
        where access_grant.user_id = v_leader_id
          and access_grant.status in ('active', 'grace')
          and access_grant.revoked_at is null
          and (access_grant.access_until is null or access_grant.access_until > now())
     ) then
    -- The leader receives every independently crossed bonus as aggregate-only
    -- data. Conflict keys make repeated refreshes silent.
    if v_qteam_kits >= 4 then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, related_entity_id,
        is_read, created_date, channel, route, dedupe_key, scheduled_for,
        delivery_status
      ) values (
        v_leader_id, 'Un partner alcanzó Q-Team',
        'Un partner vinculado alcanzó 4 kits Premier. Revisa el estado de su bono.',
        'info', 'partner', v_partner_id, false, now()::text,
        'push', '/Partners?partnerId=' || v_partner_id,
        'fast-start:partner:' || p_user_id::text || ':bonus:q-team:' || v_window_key,
        now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;

    if v_qteam_kits >= 4 and v_partners_count >= 2 then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, related_entity_id,
        is_read, created_date, channel, route, dedupe_key, scheduled_for,
        delivery_status
      ) values (
        v_leader_id, 'Un partner alcanzó Nivel 1',
        'Un partner vinculado completó Q-Team y agregó 2 partners directos.',
        'info', 'partner', v_partner_id, false, now()::text,
        'push', '/Partners?partnerId=' || v_partner_id,
        'fast-start:partner:' || p_user_id::text || ':bonus:level-1:' || v_window_key,
        now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;

    if v_qteam_kits >= 4 and v_partners_count >= 2 and v_completed_branches >= 2 then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, related_entity_id,
        is_read, created_date, channel, route, dedupe_key, scheduled_for,
        delivery_status
      ) values (
        v_leader_id, 'Un partner alcanzó Nivel 2',
        'Dos ramas directas de un partner vinculado completaron Q-Team.',
        'info', 'partner', v_partner_id, false, now()::text,
        'push', '/Partners?partnerId=' || v_partner_id,
        'fast-start:partner:' || p_user_id::text || ':bonus:level-2:' || v_window_key,
        now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;

    if v_xteam_kits >= 10 then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, related_entity_id,
        is_read, created_date, channel, route, dedupe_key, scheduled_for,
        delivery_status
      ) values (
        v_leader_id, 'Un partner alcanzó X-Team',
        'Un partner vinculado alcanzó 10 kits Premier. Revisa el estado de su bono.',
        'info', 'partner', v_partner_id, false, now()::text,
        'push', '/Partners?partnerId=' || v_partner_id,
        'fast-start:partner:' || p_user_id::text || ':bonus:x-team:' || v_window_key,
        now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;

    v_title := null;
    v_body := null;
    v_dedupe_key := null;

    if v_qteam_kits < 4 and current_date <= v_started_at + 30 then
      v_remaining := 4 - v_qteam_kits;
      v_title := case when v_remaining = 1
        then 'A un partner le falta 1 kit para Q-Team'
        else 'A un partner le faltan ' || v_remaining::text || ' kits para Q-Team' end;
      v_body := case when v_remaining = 1
        then 'Su avance real está a 1 kit Premier de su siguiente meta.'
        else 'Su avance real está a ' || v_remaining::text || ' kits Premier de su siguiente meta.' end;
      v_dedupe_key := 'fast-start:partner:' || p_user_id::text || ':next:q-team:' || v_window_key || ':' || v_remaining::text;
    elsif v_qteam_kits >= 4 and v_partners_count < 2
          and current_date <= v_started_at + 60 then
      v_remaining := 2 - v_partners_count;
      v_title := case when v_remaining = 1
        then 'A un partner le falta 1 partner para Nivel 1'
        else 'A un partner le faltan 2 partners para Nivel 1' end;
      v_body := 'Su siguiente acción es agregar partners directos para avanzar de nivel.';
      v_dedupe_key := 'fast-start:partner:' || p_user_id::text || ':next:level-1:' || v_window_key || ':' || v_remaining::text;
    elsif v_qteam_kits >= 4 and v_partners_count >= 2
          and v_completed_branches < 2
          and current_date <= v_started_at + 90 then
      v_remaining := 2 - v_completed_branches;
      v_title := case when v_remaining = 1
        then 'A un partner le falta 1 rama para Nivel 2'
        else 'A un partner le faltan 2 ramas para Nivel 2' end;
      v_body := 'Su siguiente acción es ayudar a sus ramas directas a completar Q-Team.';
      v_dedupe_key := 'fast-start:partner:' || p_user_id::text || ':next:level-2:' || v_window_key || ':' || v_remaining::text;
    end if;

    if v_dedupe_key is null and v_xteam_kits < 10
          and current_date <= v_started_at + 120 then
      v_remaining := 10 - v_xteam_kits;
      v_title := case when v_remaining = 1
        then 'A un partner le falta 1 kit para X-Team'
        else 'A un partner le faltan ' || v_remaining::text || ' kits para X-Team' end;
      v_body := case when v_remaining = 1
        then 'Su avance real está a 1 kit Premier de su siguiente meta.'
        else 'Su avance real está a ' || v_remaining::text || ' kits Premier de su siguiente meta.' end;
      v_dedupe_key := 'fast-start:partner:' || p_user_id::text || ':next:x-team:' || v_window_key || ':' || v_remaining::text;
    end if;

    update public.notifications notification
       set delivery_status = 'skipped',
           delivery_lease_until = null,
           delivery_next_attempt_at = null,
           delivery_error_code = 'superseded_fast_start_action'
     where notification.user_id = v_leader_id
       and notification.channel = 'push'
       and (
         notification.delivery_status = 'pending'
         or (
           notification.delivery_status = 'sending'
           and coalesce(notification.delivery_lease_until, '-infinity'::timestamptz) <= now()
         )
       )
       and notification.dedupe_key like 'fast-start:partner:' || p_user_id::text || ':next:%'
       and notification.dedupe_key is distinct from v_dedupe_key;

    if v_dedupe_key is not null then
      insert into public.notifications (
        user_id, title, body, type, related_entity_type, related_entity_id,
        is_read, created_date, channel, route, dedupe_key, scheduled_for,
        delivery_status
      ) values (
        v_leader_id, v_title, v_body,
        'info', 'partner', v_partner_id,
        false, now()::text, 'push', '/Partners?partnerId=' || v_partner_id,
        v_dedupe_key, now(), 'pending'
      )
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;
  end if;

  return v_inserted;
end;
$$;

-- Recalculate milestones when the authoritative window or a direct edge
-- changes. Service jobs have no auth.uid() and intentionally remain silent.
create or replace function public.refresh_fast_start_after_settings_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.fast_start_started_at is distinct from old.fast_start_started_at then
    perform public.queue_fast_start_refresh(new.user_id);
    if new.parent_id is not null then
      perform public.queue_fast_start_refresh(new.parent_id);
    end if;
  elsif new.parent_id is distinct from old.parent_id and new.parent_id is not null then
    -- The child is the snapshot subject; refreshing it also emits the verified
    -- leader's aggregate next-action notification.
    perform public.queue_fast_start_refresh(new.user_id);
    perform public.queue_fast_start_refresh(new.parent_id);
  end if;
  return new;
end;
$$;

drop trigger if exists settings_refresh_fast_start on public.settings;
create trigger settings_refresh_fast_start
after update of fast_start_started_at, parent_id on public.settings
for each row
when (
  new.fast_start_started_at is distinct from old.fast_start_started_at
  or new.parent_id is distinct from old.parent_id
)
execute function public.refresh_fast_start_after_settings_change();

create or replace function public.refresh_fast_start_after_partner_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if auth.uid() is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
  else
    v_user_id := new.user_id;
  end if;
  -- A linked row is followed by the authoritative settings.parent_id update,
  -- which refreshes only after both sides of the edge agree.
  if tg_op = 'INSERT' and new.partner_user_id is not null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.partner_user_id is distinct from new.partner_user_id
     and new.partner_user_id is not null then
    return new;
  end if;
  perform public.queue_fast_start_refresh(v_user_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists partners_refresh_fast_start on public.partners;
create trigger partners_refresh_fast_start
after insert or update of start_date, partner_user_id or delete on public.partners
for each row execute function public.refresh_fast_start_after_partner_change();

create or replace function public.enqueue_due_daily_summaries(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  with candidates as (
    select s.user_id,
           s.timezone,
           (p_now at time zone s.timezone)::date as local_day,
           (((p_now at time zone s.timezone)::date + s.daily_summary_time) at time zone s.timezone) as scheduled_for
      from public.settings s
      join pg_catalog.pg_timezone_names zone on zone.name = s.timezone
     where s.notifications_enabled is true
       and s.push_consent_given
       and s.daily_summary_enabled
       and exists (
         select 1
           from public.access_grants access_grant
          where access_grant.user_id = s.user_id
            and access_grant.status in ('active', 'grace')
            and access_grant.revoked_at is null
            and (access_grant.access_until is null or access_grant.access_until > p_now)
       )
  ), due as (
    select candidate.*,
           count(task.id)::integer as task_count
      from candidates candidate
      left join public.tasks task
        on task.user_id = candidate.user_id
       and not coalesce(task.completed, false)
       and task.due_date <= candidate.local_day
     where candidate.scheduled_for <= p_now
       and candidate.scheduled_for > p_now - interval '70 minutes'
     group by candidate.user_id, candidate.timezone, candidate.local_day, candidate.scheduled_for
  )
  insert into public.notifications (
    user_id, title, body, type, related_entity_type, is_read, created_date,
    channel, route, dedupe_key, scheduled_for, delivery_status
  )
  select due.user_id,
         case when due.task_count = 0 then 'Hoy estás al día'
              when due.task_count = 1 then '1 tarea pendiente'
              else due.task_count::text || ' tareas pendientes' end,
         case when due.task_count = 0 then 'No tienes tareas pendientes para este día.'
              else 'Abre Hoy para avanzar con tus seguimientos.' end,
         'daily_summary', 'tasks', false, due.local_day::text,
         'push', '/Tasks', 'daily:' || due.local_day::text,
         due.scheduled_for, 'pending'
    from due
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

drop function if exists public.claim_push_notifications(integer);
create or replace function public.claim_push_notifications(p_limit integer default 50)
returns table(
  notification_id uuid,
  user_id uuid,
  title text,
  body text,
  route text,
  dedupe_key text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A preference or entitlement can change after a row was queued. Do not send
  -- stale work, including an abandoned lease from a previous worker.
  update public.notifications n
     set delivery_status = 'skipped',
         delivery_lease_until = null,
         delivery_next_attempt_at = null,
         delivery_error_code = 'push_not_allowed'
   where n.channel = 'push'
     and (
       n.delivery_status = 'pending'
       or (
         n.delivery_status = 'sending'
         and coalesce(n.delivery_lease_until, '-infinity'::timestamptz) <= now()
       )
     )
     and not (
       exists (
         select 1
           from public.access_grants access_grant
          where access_grant.user_id = n.user_id
            and access_grant.status in ('active', 'grace')
            and access_grant.revoked_at is null
            and (access_grant.access_until is null or access_grant.access_until > now())
       )
       and exists (
         select 1
           from public.settings s
          where s.user_id = n.user_id
            and s.notifications_enabled is true
            and s.push_consent_given
            and case
              when n.dedupe_key like 'daily:%' then s.daily_summary_enabled
              when n.dedupe_key like 'fast-start:%' then s.fast_start_notifications_enabled
              else s.task_notifications_enabled
            end
       )
     );

  update public.notifications n
     set delivery_status = 'failed',
         delivery_lease_until = null,
         delivery_next_attempt_at = null,
         delivery_error_code = 'maximum_delivery_attempts_reached'
   where n.channel = 'push'
     and n.delivery_attempt_count >= 5
     and (
       n.delivery_status = 'pending'
       or (
         n.delivery_status = 'sending'
         and coalesce(n.delivery_lease_until, '-infinity'::timestamptz) <= now()
       )
     );

  return query
  with due as (
    select n.id
      from public.notifications n
     where n.channel = 'push'
       and (
         (
           n.delivery_status = 'pending'
           and coalesce(n.delivery_next_attempt_at, '-infinity'::timestamptz) <= now()
         )
         or (
           n.delivery_status = 'sending'
           and coalesce(n.delivery_lease_until, '-infinity'::timestamptz) <= now()
         )
       )
       and n.delivery_attempt_count < 5
       and coalesce(n.scheduled_for, n.created_at) <= now()
       and exists (
         select 1
           from public.access_grants access_grant
          where access_grant.user_id = n.user_id
            and access_grant.status in ('active', 'grace')
            and access_grant.revoked_at is null
            and (access_grant.access_until is null or access_grant.access_until > now())
       )
       and exists (
         select 1
           from public.settings s
          where s.user_id = n.user_id
            and s.notifications_enabled is true
            and s.push_consent_given
            and case
              when n.dedupe_key like 'daily:%' then s.daily_summary_enabled
              when n.dedupe_key like 'fast-start:%' then s.fast_start_notifications_enabled
              else s.task_notifications_enabled
            end
       )
     order by coalesce(n.scheduled_for, n.created_at), n.created_at
     for update skip locked
     limit greatest(1, least(coalesce(p_limit, 50), 200))
  ), claimed as (
    update public.notifications n
       set delivery_status = 'sending',
           delivery_attempted_at = now(),
           delivery_attempt_count = n.delivery_attempt_count + 1,
           delivery_lease_until = now() + interval '2 minutes',
           delivery_next_attempt_at = null,
           delivery_error_code = null
      from due
     where n.id = due.id
    returning n.*
  )
  select claimed.id, claimed.user_id, claimed.title, claimed.body,
         claimed.route, claimed.dedupe_key, claimed.delivery_attempt_count
    from claimed;
end;
$$;

drop function if exists public.finish_push_notification(uuid, boolean, text, text);
-- A successful OneSignal create-notification response confirms provider
-- acceptance, not delivery to a device. Keep that state as `sent`.
-- `delivered`/`delivered_at` are reserved for a future authenticated provider
-- delivery webhook; this RPC must never fabricate that confirmation.
create or replace function public.finish_push_notification(
  p_notification_id uuid,
  p_attempt_count integer,
  p_sent boolean,
  p_provider_message_id text default null,
  p_error_code text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  update public.notifications
     set delivery_status = case when p_sent then 'sent'
                                when p_error_code = 'no_subscribed_device' then 'skipped'
                                when p_error_code like 'retryable:%'
                                  and delivery_attempt_count < 5 then 'pending'
                                else 'failed' end,
         provider_message_id = case when p_sent then left(p_provider_message_id, 200) else null end,
         delivery_next_attempt_at = case
           when not p_sent
             and p_error_code like 'retryable:%'
             and delivery_attempt_count < 5
           then now() + case
             when delivery_attempt_count <= 1 then interval '1 minute'
             when delivery_attempt_count = 2 then interval '5 minutes'
             when delivery_attempt_count = 3 then interval '15 minutes'
             else interval '1 hour'
           end
           else null
         end,
         delivery_lease_until = null,
         delivery_error_code = case when p_sent then null else left(coalesce(p_error_code, 'provider_error'), 120) end
   where id = p_notification_id
     and delivery_status = 'sending'
     and delivery_attempt_count = p_attempt_count
  returning delivery_status into v_status;

  return v_status;
end;
$$;

-- Keep account deletion complete after the additive 1.2 tables exist. Storage
-- objects are removed by the service worker before this transaction runs.
create or replace function public.delete_user_data(p_request_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.account_deletion_requests%rowtype;
  v_table text;
begin
  select *
    into v_request
    from public.account_deletion_requests
   where id = p_request_id
   for update;

  if not found or v_request.user_id is distinct from p_user_id then
    raise exception 'invalid_deletion_request';
  end if;
  if v_request.status = 'completed' then
    return;
  end if;

  if pg_catalog.to_regclass('public.partners') is not null then
    update public.partners set partner_user_id = null where partner_user_id = p_user_id;
  end if;
  if pg_catalog.to_regclass('public.settings') is not null then
    update public.settings set parent_id = null where parent_id = p_user_id;
  end if;

  foreach v_table in array array[
    'tasks', 'sales', 'partners', 'contacts', 'tags', 'product_links',
    'user_templates', 'user_products', 'message_templates', 'notifications',
    'template_share_imports', 'template_categories', 'sale_orders',
    'contact_batch_operations', 'settings'
  ] loop
    if pg_catalog.to_regclass('public.' || v_table) is not null
       and exists (
         select 1 from information_schema.columns
          where table_schema = 'public' and table_name = v_table and column_name = 'user_id'
       ) then
      execute pg_catalog.format('delete from public.%I where user_id = $1', v_table)
        using p_user_id;
    end if;
  end loop;

  if pg_catalog.to_regclass('public.template_share_bundles') is not null then
    delete from public.template_share_bundles where owner_id = p_user_id;
  end if;

  delete from public.access_grants where user_id = p_user_id;
  update public.billing_accounts
     set user_id = null,
         claim_email = null,
         operation_id = null,
         operation_expires_at = null,
         anonymized_at = coalesce(anonymized_at, now())
   where user_id = p_user_id;

  update public.account_deletion_requests
     set status = 'data_deleted', failure_code = null
   where id = p_request_id;
end;
$$;

revoke all on function public.claim_push_notifications(integer) from public, anon, authenticated;
revoke all on function public.finish_push_notification(uuid, integer, boolean, text, text) from public, anon, authenticated;
revoke all on function public.enqueue_due_daily_summaries(timestamptz) from public, anon, authenticated;
revoke all on function public.queue_fast_start_refresh(uuid) from public, anon, authenticated;
revoke all on function public.refresh_fast_start_after_settings_change() from public, anon, authenticated;
revoke all on function public.refresh_fast_start_after_partner_change() from public, anon, authenticated;
revoke all on function public.delete_user_data(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(integer) to service_role;
grant execute on function public.finish_push_notification(uuid, integer, boolean, text, text) to service_role;
grant execute on function public.enqueue_due_daily_summaries(timestamptz) to service_role;
grant execute on function public.delete_user_data(uuid, uuid) to service_role;
