-- Explicit contact import/bulk actions and private product photos.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- 202608190001 allowed PostgreSQL to install pgcrypto in the then-current
-- default schema. CREATE EXTENSION IF NOT EXISTS does not relocate it, so make
-- the schema explicit before security-definer functions call extensions.digest.
do $pgcrypto_schema$
begin
  if exists (
    select 1
      from pg_catalog.pg_extension extension_row
      join pg_catalog.pg_namespace namespace
        on namespace.oid = extension_row.extnamespace
     where extension_row.extname = 'pgcrypto'
       and namespace.nspname <> 'extensions'
  ) then
    alter extension pgcrypto set schema extensions;
  end if;
end
$pgcrypto_schema$;

alter table public.contacts
  add column if not exists phone_e164 text,
  add column if not exists phone_country_iso text,
  add column if not exists phone_raw text,
  add column if not exists import_source text not null default 'manual';

alter table public.contacts
  drop constraint if exists contacts_phone_e164_format,
  add constraint contacts_phone_e164_format
    check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  drop constraint if exists contacts_phone_country_iso_format,
  add constraint contacts_phone_country_iso_format
    check (phone_country_iso is null or phone_country_iso ~ '^[A-Z]{2}$'),
  drop constraint if exists contacts_import_source_check,
  add constraint contacts_import_source_check
    check (import_source in ('manual', 'device'));

-- Origin is required so an automation can replace only its own future work.
-- Unknown historical rows remain `legacy` and are never deleted implicitly.
alter table public.tasks
  add column if not exists origin text not null default 'legacy',
  add column if not exists source_sale_id uuid;

alter table public.tasks
  drop constraint if exists tasks_origin_check,
  add constraint tasks_origin_check check (origin in (
    'legacy', 'manual', 'contact_automation', 'sale_automation', 'partner_automation'
  ));

update public.tasks
   set origin = case
     when task_area = 'manual' then 'manual'
     when task_area = 'prospecto_producto'
       and template_subcategory ~ '^prospecto_producto_msg_[1-6]$'
       and task_name like 'Prospecto Producto – %'
       then 'contact_automation'
     when task_area = 'prospecto_partner'
       and template_subcategory ~ '^prospecto_partner_msg_[1-6]$'
       and task_name like 'Prospecto Partner – %'
       then 'contact_automation'
     when task_area = 'partner'
       and (
         (
           template_subcategory = 'partner_invitar_zynergia'
           and task_name = 'Invitar a Zynergia para ver su avance real'
         )
         or (
           template_subcategory in (
             'partner_smart_qteam', 'partner_smart_fs1', 'partner_smart_fs2',
             'partner_smart_xteam', 'partner_smart_checkin'
           )
           and task_name is distinct from 'Partner / Fast Start'
         )
       ) then 'partner_automation'
     when product_id is not null and (
       (subcategory = 'dia_3' and template_subcategory = 'producto_dia_3'
         and task_name = 'Bienvenida Día 3')
       or (subcategory = '7_dias_antes' and template_subcategory = 'producto_7_dias_antes'
         and task_name = 'Recompra 7 días antes')
       or (subcategory = '3_dias_antes' and template_subcategory = 'producto_3_dias_antes'
         and task_name = 'Recompra 3 días antes')
       or (subcategory = '5_dias_despues' and template_subcategory = 'producto_5_dias_despues'
         and task_name = 'Recompra 5 días después')
       or (subcategory = 'reactivacion' and template_subcategory = 'producto_reactivacion'
         and task_name = 'Reactivación')
     ) then 'sale_automation'
     else origin
   end
 where origin = 'legacy';

-- Released 1.1.1 clients do not send `origin`. Classify only their recognizable
-- automatic task shapes at insert time so a later 1.2 order can replace the
-- same reminder sequence without touching manual tasks. Referral rows remain
-- legacy because an old manual "Pedir referido" row is indistinguishable from
-- the automatic row; preserving user work is safer than guessing.
create or replace function public.classify_legacy_task_origin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.origin is null or new.origin = 'legacy' then
    new.origin := case
      when new.task_area = 'manual' then 'manual'
      when new.task_area = 'prospecto_producto'
        and new.template_subcategory ~ '^prospecto_producto_msg_[1-6]$'
        and new.task_name like 'Prospecto Producto – %'
        then 'contact_automation'
      when new.task_area = 'prospecto_partner'
        and new.template_subcategory ~ '^prospecto_partner_msg_[1-6]$'
        and new.task_name like 'Prospecto Partner – %'
        then 'contact_automation'
      when new.task_area = 'partner'
        and (
          (
            new.template_subcategory = 'partner_invitar_zynergia'
            and new.task_name = 'Invitar a Zynergia para ver su avance real'
          )
          or (
            new.template_subcategory in (
              'partner_smart_qteam', 'partner_smart_fs1', 'partner_smart_fs2',
              'partner_smart_xteam', 'partner_smart_checkin'
            )
            and new.task_name is distinct from 'Partner / Fast Start'
          )
        ) then 'partner_automation'
      when new.product_id is not null and (
        (new.subcategory = 'dia_3' and new.template_subcategory = 'producto_dia_3'
          and new.task_name = 'Bienvenida Día 3')
        or (new.subcategory = '7_dias_antes' and new.template_subcategory = 'producto_7_dias_antes'
          and new.task_name = 'Recompra 7 días antes')
        or (new.subcategory = '3_dias_antes' and new.template_subcategory = 'producto_3_dias_antes'
          and new.task_name = 'Recompra 3 días antes')
        or (new.subcategory = '5_dias_despues' and new.template_subcategory = 'producto_5_dias_despues'
          and new.task_name = 'Recompra 5 días después')
        or (new.subcategory = 'reactivacion' and new.template_subcategory = 'producto_reactivacion'
          and new.task_name = 'Reactivación')
      ) then 'sale_automation'
      else 'legacy'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_classify_legacy_origin on public.tasks;
create trigger tasks_classify_legacy_origin
before insert on public.tasks
for each row execute function public.classify_legacy_task_origin();

revoke all on function public.classify_legacy_task_origin()
  from public, anon, authenticated;

-- Only an already explicit international number is safe to backfill. Local
-- numbers remain untouched until the owner chooses their country.
update public.contacts
   set phone_e164 = '+' || pg_catalog.regexp_replace(phone, '[^0-9]', '', 'g')
 where phone_e164 is null
   and btrim(coalesce(phone, '')) ~ '^\+'
   and length(pg_catalog.regexp_replace(phone, '[^0-9]', '', 'g')) between 8 and 15
   and pg_catalog.regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[1-9]';

create index if not exists contacts_user_phone_e164_idx
  on public.contacts (user_id, phone_e164)
  where phone_e164 is not null;

create table if not exists public.contact_batch_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  operation_kind text not null check (operation_kind in ('import', 'change_type', 'anonymize')),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, operation_id)
);

alter table public.contact_batch_operations enable row level security;
revoke all on table public.contact_batch_operations from public, anon, authenticated;
-- Contact removal must pass through anonymize_contact so historical sales lose
-- their personal link without being deleted. Released 1.1.1 already uses it.
revoke delete on table public.contacts from authenticated;

create or replace function public.import_contacts(
  p_operation_id uuid,
  p_contacts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_previous public.contact_batch_operations%rowtype;
  v_request_hash text;
  v_item jsonb;
  v_name text;
  v_phone text;
  v_country_code text;
  v_country_iso text;
  v_phone_raw text;
  v_created integer := 0;
  v_duplicates integer := 0;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if p_operation_id is null then
    raise exception using errcode = '22023', message = 'operation_id_required';
  end if;
  if p_contacts is null or pg_catalog.jsonb_typeof(p_contacts) <> 'array'
     or pg_catalog.jsonb_array_length(p_contacts) < 1
     or pg_catalog.jsonb_array_length(p_contacts) > 1000 then
    raise exception using errcode = '22023', message = 'contacts_batch_must_have_1_to_1000_items';
  end if;
  v_request_hash := encode(
    extensions.digest(pg_catalog.convert_to(p_contacts::text, 'UTF8'), 'sha256'),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('contact_batch:' || v_user_id::text || ':' || p_operation_id::text, 0)
  );
  select * into v_previous
    from public.contact_batch_operations
   where user_id = v_user_id and operation_id = p_operation_id;
  if found then
    if v_previous.operation_kind <> 'import' or v_previous.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'operation_id_reused_with_different_contact_batch';
    end if;
    return v_previous.result;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('contact_import:' || v_user_id::text, 0)
  );

  for v_item in select value from pg_catalog.jsonb_array_elements(p_contacts) loop
    v_name := btrim(coalesce(v_item ->> 'full_name', ''));
    v_phone := btrim(coalesce(v_item ->> 'phone_e164', v_item ->> 'phone', ''));
    v_country_code := btrim(coalesce(v_item ->> 'country_code', ''));
    v_country_iso := nullif(upper(btrim(coalesce(v_item ->> 'phone_country_iso', ''))), '');
    v_phone_raw := left(coalesce(v_item ->> 'phone_raw', v_phone), 80);

    if length(v_name) < 1 or length(v_name) > 120 then
      raise exception using errcode = '22023', message = 'invalid_import_contact_name';
    end if;
    if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception using errcode = '22023', message = 'invalid_import_contact_phone';
    end if;
    if v_country_code !~ '^\+[1-9][0-9]{0,3}$' then
      raise exception using errcode = '22023', message = 'invalid_import_country_code';
    end if;
    if v_country_iso is not null and v_country_iso !~ '^[A-Z]{2}$' then
      raise exception using errcode = '22023', message = 'invalid_import_country_iso';
    end if;

    if exists (
      select 1
        from public.contacts contact
       where contact.user_id = v_user_id
         and (
           contact.phone_e164 = v_phone
           or (
             contact.phone_e164 is null
             and btrim(coalesce(contact.phone, '')) ~ '^\+'
             and '+' || pg_catalog.regexp_replace(contact.phone, '[^0-9]', '', 'g') = v_phone
           )
         )
    ) then
      v_duplicates := v_duplicates + 1;
      continue;
    end if;

    insert into public.contacts (
      user_id, full_name, phone, country_code, contact_type, notes, tag_ids,
      phone_e164, phone_country_iso, phone_raw, import_source
    ) values (
      v_user_id, v_name, v_phone, v_country_code, null, null, '[]'::jsonb,
      v_phone, v_country_iso, v_phone_raw, 'device'
    );
    v_created := v_created + 1;
  end loop;

  v_result := jsonb_build_object(
    'status', 'completed',
    'created', v_created,
    'duplicates', v_duplicates
  );
  insert into public.contact_batch_operations (
    user_id, operation_id, operation_kind, request_hash, result
  ) values (v_user_id, p_operation_id, 'import', v_request_hash, v_result);
  return v_result;
end;
$$;

create or replace function public.bulk_update_contact_type(
  p_operation_id uuid,
  p_contact_ids uuid[],
  p_contact_type text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ids uuid[];
  v_request_hash text;
  v_previous public.contact_batch_operations%rowtype;
  v_contact public.contacts%rowtype;
  v_days integer;
  v_changed integer := 0;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if p_operation_id is null then
    raise exception using errcode = '22023', message = 'operation_id_required';
  end if;
  if p_contact_type is not null and p_contact_type not in (
    'prospecto_producto', 'prospecto_partner', 'cliente_producto', 'partner'
  ) then
    raise exception using errcode = '22023', message = 'invalid_contact_type';
  end if;

  select pg_catalog.array_agg(id order by id) into v_ids
    from (select distinct pg_catalog.unnest(p_contact_ids) as id) selected;
  if coalesce(pg_catalog.cardinality(v_ids), 0) < 1 or pg_catalog.cardinality(v_ids) > 1000 then
    raise exception using errcode = '22023', message = 'contact_ids_must_have_1_to_1000_items';
  end if;
  v_request_hash := encode(extensions.digest(pg_catalog.convert_to(
    jsonb_build_object('contact_ids', to_jsonb(v_ids), 'contact_type', p_contact_type)::text,
    'UTF8'
  ), 'sha256'), 'hex');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('contact_batch:' || v_user_id::text || ':' || p_operation_id::text, 0)
  );
  select * into v_previous
    from public.contact_batch_operations
   where user_id = v_user_id and operation_id = p_operation_id;
  if found then
    if v_previous.operation_kind <> 'change_type' or v_previous.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'operation_id_reused_with_different_contact_batch';
    end if;
    return v_previous.result;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('contact_bulk:' || v_user_id::text, 0)
  );
  if (select count(*) from public.contacts where user_id = v_user_id and id = any(v_ids)) <> pg_catalog.cardinality(v_ids) then
    raise exception using errcode = '42501', message = 'contact_not_owned_or_missing';
  end if;
  if p_contact_type is distinct from 'partner' and exists (
    select 1 from public.partners
     where user_id = v_user_id and contact_id = any(v_ids) and partner_user_id is not null
  ) then
    raise exception using errcode = '23514', message = 'linked_partner_type_protected';
  end if;

  for v_contact in
    select * from public.contacts
     where user_id = v_user_id and id = any(v_ids)
     order by id for update
  loop
    if v_contact.contact_type is not distinct from p_contact_type then
      continue;
    end if;

    if v_contact.contact_type in ('prospecto_produto', 'prospecto_producto') then
      delete from public.tasks
       where user_id = v_user_id and contact_id = v_contact.id
         and origin = 'contact_automation'
         and task_area = 'prospecto_producto' and not coalesce(completed, false);
    end if;
    if v_contact.contact_type = 'prospecto_partner' then
      delete from public.tasks
       where user_id = v_user_id and contact_id = v_contact.id
         and origin = 'contact_automation'
         and task_area = 'prospecto_partner' and not coalesce(completed, false);
    end if;
    if v_contact.contact_type = 'partner' and p_contact_type is distinct from 'partner' then
      delete from public.tasks
       where user_id = v_user_id and contact_id = v_contact.id
         and origin = 'partner_automation'
         and task_area = 'partner' and not coalesce(completed, false);
      delete from public.partners
       where user_id = v_user_id and contact_id = v_contact.id and partner_user_id is null;
    end if;
    if p_contact_type not in ('cliente_producto', 'partner') or p_contact_type is null then
      delete from public.tasks
       where user_id = v_user_id and contact_id = v_contact.id
         and origin = 'contact_automation'
         and task_area = 'referidos' and not coalesce(completed, false);
    end if;

    update public.contacts set contact_type = p_contact_type
     where id = v_contact.id and user_id = v_user_id;

    if p_contact_type in ('prospecto_producto', 'prospecto_partner') then
      for v_days in select value from unnest(array[0, 3, 7, 12, 18, 25]) as value loop
        insert into public.tasks (
          user_id, contact_id, category, subcategory, template_subcategory,
          task_name, task_area, due_date, completed, origin
        ) values (
          v_user_id,
          v_contact.id,
          'seguimiento',
          p_contact_type || '_msg_' || (array_position(array[0, 3, 7, 12, 18, 25], v_days))::text,
          p_contact_type || '_msg_' || (array_position(array[0, 3, 7, 12, 18, 25], v_days))::text,
          case p_contact_type
            when 'prospecto_producto' then 'Prospecto Producto – Seguimiento ' || (array_position(array[0, 3, 7, 12, 18, 25], v_days))::text
            else 'Prospecto Partner – Seguimiento ' || (array_position(array[0, 3, 7, 12, 18, 25], v_days))::text
          end,
          p_contact_type,
          current_date + v_days,
          false,
          'contact_automation'
        );
      end loop;
    end if;

    if p_contact_type = 'partner' then
      if not exists (
        select 1 from public.partners where user_id = v_user_id and contact_id = v_contact.id
      ) then
        insert into public.partners (
          user_id, contact_id, start_date, fast_start_deadline, fast_start_status,
          fase_actual, qteam_completed, fs_level1_completed, fs_level2_completed,
          xteam_completed
        ) values (
          v_user_id, v_contact.id, current_date, current_date + 120, 'activo',
          1, false, false, false, false
        );
      end if;
      if not exists (
        select 1 from public.tasks where user_id = v_user_id and contact_id = v_contact.id
          and origin = 'partner_automation'
          and task_area = 'partner' and not coalesce(completed, false)
      ) then
        insert into public.tasks (
          user_id, contact_id, category, subcategory, template_subcategory,
          task_name, task_area, due_date, completed, origin
        ) values (
          v_user_id, v_contact.id, 'seguimiento', 'partner_invitar_zynergia',
          'partner_invitar_zynergia', 'Invitar a Zynergia para ver su avance real',
          'partner', current_date, false, 'partner_automation'
        );
      end if;
    end if;

    if p_contact_type in ('cliente_producto', 'partner') and not exists (
      select 1 from public.tasks where user_id = v_user_id and contact_id = v_contact.id
        and origin = 'contact_automation'
        and task_area = 'referidos' and not coalesce(completed, false)
    ) then
      insert into public.tasks (
        user_id, contact_id, category, subcategory, template_subcategory,
        task_name, task_area, due_date, completed, origin
      ) values (
        v_user_id, v_contact.id, 'seguimiento', 'referido', 'referido',
        'Pedir referido', 'referidos',
        greatest(current_date, coalesce(v_contact.created_at::date, current_date) + 30), false,
        'contact_automation'
      );
    end if;

    v_changed := v_changed + 1;
  end loop;

  v_result := jsonb_build_object('status', 'completed', 'changed', v_changed);
  insert into public.contact_batch_operations (
    user_id, operation_id, operation_kind, request_hash, result
  ) values (v_user_id, p_operation_id, 'change_type', v_request_hash, v_result);
  return v_result;
end;
$$;

create or replace function public.bulk_anonymize_contacts(
  p_operation_id uuid,
  p_contact_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ids uuid[];
  v_request_hash text;
  v_previous public.contact_batch_operations%rowtype;
  v_contact_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if p_operation_id is null then
    raise exception using errcode = '22023', message = 'operation_id_required';
  end if;
  select pg_catalog.array_agg(id order by id) into v_ids
    from (select distinct pg_catalog.unnest(p_contact_ids) as id) selected;
  if coalesce(pg_catalog.cardinality(v_ids), 0) < 1 or pg_catalog.cardinality(v_ids) > 1000 then
    raise exception using errcode = '22023', message = 'contact_ids_must_have_1_to_1000_items';
  end if;
  v_request_hash := encode(extensions.digest(pg_catalog.convert_to(
    jsonb_build_object('contact_ids', to_jsonb(v_ids))::text,
    'UTF8'
  ), 'sha256'), 'hex');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('contact_batch:' || v_user_id::text || ':' || p_operation_id::text, 0)
  );
  select * into v_previous
    from public.contact_batch_operations
   where user_id = v_user_id and operation_id = p_operation_id;
  if found then
    if v_previous.operation_kind <> 'anonymize' or v_previous.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'operation_id_reused_with_different_contact_batch';
    end if;
    return v_previous.result;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('contact_bulk:' || v_user_id::text, 0)
  );
  if (select count(*) from public.contacts where user_id = v_user_id and id = any(v_ids)) <> pg_catalog.cardinality(v_ids) then
    raise exception using errcode = '42501', message = 'contact_not_owned_or_missing';
  end if;
  if exists (
    select 1 from public.partners
     where user_id = v_user_id and contact_id = any(v_ids) and partner_user_id is not null
  ) then
    raise exception using errcode = '23514', message = 'linked_partner_delete_protected';
  end if;

  foreach v_contact_id in array v_ids loop
    perform public.anonymize_contact(v_contact_id);
  end loop;

  v_result := jsonb_build_object(
    'status', 'completed',
    'anonymized', pg_catalog.cardinality(v_ids)
  );
  insert into public.contact_batch_operations (
    user_id, operation_id, operation_kind, request_hash, result
  ) values (v_user_id, p_operation_id, 'anonymize', v_request_hash, v_result);
  return v_result;
end;
$$;

revoke all on function public.import_contacts(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.bulk_update_contact_type(uuid, uuid[], text) from public, anon, authenticated;
revoke all on function public.bulk_anonymize_contacts(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.import_contacts(uuid, jsonb) to authenticated;
grant execute on function public.bulk_update_contact_type(uuid, uuid[], text) to authenticated;
grant execute on function public.bulk_anonymize_contacts(uuid, uuid[]) to authenticated;

alter table public.user_products
  add column if not exists image_path text;

-- Products are archived so historical sales keep a stable product reference.
revoke delete on table public.user_products from authenticated;

alter table public.user_products
  drop constraint if exists user_products_image_path_safe,
  add constraint user_products_image_path_safe check (
    image_path is null
    or image_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]+\.(webp|jpg|jpeg|png)$'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', false, 3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_images_select_own on storage.objects;
create policy product_images_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_app_entitlement(auth.uid())
  );

drop policy if exists product_images_insert_own on storage.objects;
create policy product_images_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_app_entitlement(auth.uid())
  );

drop policy if exists product_images_delete_own on storage.objects;
create policy product_images_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.has_app_entitlement(auth.uid())
  );
