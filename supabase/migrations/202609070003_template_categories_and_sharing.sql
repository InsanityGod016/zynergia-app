-- Private template categories and capability-link sharing.
-- Bundles are immutable snapshots: they never contain contact IDs, ownership,
-- default flags or any other CRM relationship.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.template_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  situation text not null check (situation in (
    'repurchase', 'product', 'product-prospect', 'business',
    'fast-start', 'referral', 'manual'
  )),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists template_categories_active_name_idx
  on public.template_categories (user_id, lower(btrim(name)), situation)
  where archived_at is null;

alter table public.message_templates
  add column if not exists category_id uuid;

do $$
begin
  alter table public.message_templates
    add constraint message_templates_category_owner_fk
    foreign key (category_id)
    references public.template_categories(id)
    on delete set null;
exception when duplicate_object then
  null;
end;
$$;

create index if not exists message_templates_category_idx
  on public.message_templates (user_id, category_id, created_at desc)
  where archived_at is null;

create table if not exists public.template_share_bundles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'array'
    and jsonb_array_length(snapshot) between 1 and 120
  ),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, operation_id)
);

create index if not exists template_share_bundles_owner_idx
  on public.template_share_bundles (owner_id, created_at desc);

create table if not exists public.template_share_imports (
  bundle_id uuid not null references public.template_share_bundles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  imported_template_ids text[] not null default '{}',
  imported_count integer not null default 0 check (imported_count between 0 and 120),
  imported_at timestamptz not null default now(),
  primary key (bundle_id, user_id),
  unique (user_id, operation_id)
);

drop trigger if exists template_categories_set_updated_at on public.template_categories;
create trigger template_categories_set_updated_at
before update on public.template_categories
for each row execute function public.zynergia_set_updated_at();

alter table public.template_categories enable row level security;
alter table public.template_share_bundles enable row level security;
alter table public.template_share_imports enable row level security;

drop policy if exists template_categories_entitled_own on public.template_categories;
create policy template_categories_entitled_own
  on public.template_categories
  for all
  to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()))
  with check (auth.uid() = user_id and public.has_app_entitlement(auth.uid()));

drop policy if exists message_templates_entitled_own on public.message_templates;
create policy message_templates_entitled_own
  on public.message_templates
  for all
  to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()))
  with check (
    auth.uid() = user_id
    and public.has_app_entitlement(auth.uid())
    and (
      contact_id is null
      or exists (
        select 1 from public.contacts c
         where c.id = message_templates.contact_id
           and c.user_id = auth.uid()
      )
    )
    and (
      category_id is null
      or exists (
        select 1 from public.template_categories tc
         where tc.id = message_templates.category_id
           and tc.user_id = auth.uid()
           and tc.situation = message_templates.situation
           and tc.archived_at is null
      )
    )
  );

drop policy if exists template_share_bundles_owner_select on public.template_share_bundles;
create policy template_share_bundles_owner_select
  on public.template_share_bundles
  for select
  to authenticated
  using (auth.uid() = owner_id and public.has_app_entitlement(auth.uid()));

drop policy if exists template_share_imports_own_select on public.template_share_imports;
create policy template_share_imports_own_select
  on public.template_share_imports
  for select
  to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()));

-- The released 1.1.1 client still writes message_templates directly. Keep that
-- route compatible, but enforce the same bounded, known-token contract at the
-- database boundary. Sparse legacy system overrides remain readable and can
-- still be archived/defaulted; any content or metadata they change is checked.
create or replace function public.validate_message_template_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(new.template_id, ''))) not between 1 and 200
     or char_length(coalesce(new.content, '')) not between 1 and 5000
     or regexp_replace(
       new.content,
       '\{\{(contact\.full_name|product\.name|product\.link_url)\}\}',
       '',
       'g'
     ) ~ '\{\{[^{}]+\}\}'
     or (new.name is not null and char_length(btrim(new.name)) not between 1 and 100)
     or (new.situation is not null and new.situation not in (
       'repurchase', 'product', 'product-prospect', 'business',
       'fast-start', 'referral', 'manual'
     ))
     or (new.category is not null and char_length(btrim(new.category)) not between 1 and 60)
     or (new.subcategory is not null and char_length(btrim(new.subcategory)) not between 1 and 100)
     or (new.tone is not null and new.tone !~ '^[a-z0-9_-]{1,30}$')
     or (
       new.origin = 'user'
       and (
         new.name is null
         or new.situation is null
         or new.category is null
         or new.subcategory is null
         or new.tone is null
       )
     ) then
    raise exception using errcode = '22023', message = 'invalid_message_template';
  end if;
  return new;
end;
$$;

drop trigger if exists message_templates_validate_write on public.message_templates;
create trigger message_templates_validate_write
before insert or update of
  template_id, name, content, situation, category, subcategory, tone,
  contact_id, origin, category_id
on public.message_templates
for each row execute function public.validate_message_template_write();

create or replace function public.update_message_template(
  p_template_id text,
  p_name text,
  p_content text,
  p_situation text,
  p_category text,
  p_subcategory text,
  p_tone text,
  p_contact_id uuid,
  p_category_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.message_templates%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if nullif(btrim(p_template_id), '') is null
     or char_length(btrim(p_template_id)) > 200
     or nullif(btrim(p_name), '') is null
     or char_length(btrim(p_name)) > 100
     or char_length(coalesce(p_content, '')) not between 1 and 5000
     or coalesce(p_situation, '') not in (
       'repurchase', 'product', 'product-prospect', 'business',
       'fast-start', 'referral', 'manual'
     )
     or nullif(btrim(p_category), '') is null
     or char_length(btrim(p_category)) > 60
     or nullif(btrim(p_subcategory), '') is null
     or char_length(btrim(p_subcategory)) > 100
     or coalesce(p_tone, '') !~ '^[a-z0-9_-]{1,30}$'
     or regexp_replace(
       p_content,
       '\{\{(contact\.full_name|product\.name|product\.link_url)\}\}',
       '',
       'g'
     ) ~ '\{\{[^{}]+\}\}' then
    raise exception using errcode = '22023', message = 'invalid_message_template';
  end if;
  if p_contact_id is not null and not exists (
    select 1 from public.contacts
     where id = p_contact_id and user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'contact_not_owned_or_missing';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.template_categories
     where id = p_category_id
       and user_id = v_user_id
       and situation = p_situation
       and archived_at is null
  ) then
    raise exception using errcode = '42501', message = 'category_not_owned_or_incompatible';
  end if;

  update public.message_templates
     set name = btrim(p_name),
         content = p_content,
         situation = p_situation,
         category = btrim(p_category),
         subcategory = btrim(p_subcategory),
         tone = p_tone,
         contact_id = p_contact_id,
         category_id = p_category_id
   where user_id = v_user_id
     and template_id = p_template_id
     and archived_at is null
  returning * into v_template;
  if not found then
    raise exception using errcode = '42501', message = 'template_not_owned_or_missing';
  end if;
  return to_jsonb(v_template);
end;
$$;

create or replace function public.archive_message_template(p_template_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.message_templates%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  update public.message_templates
     set archived_at = now(), is_default = false
   where user_id = v_user_id
     and template_id = p_template_id
     and archived_at is null
  returning * into v_template;
  if not found then
    raise exception using errcode = '42501', message = 'template_not_owned_or_missing';
  end if;
  return to_jsonb(v_template);
end;
$$;

create or replace function public.set_template_default(
  p_template_id text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.message_templates%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  select * into v_template
    from public.message_templates
   where user_id = v_user_id
     and template_id = p_template_id
     and archived_at is null
   for update;
  if not found then
    raise exception using errcode = '42501', message = 'template_not_owned_or_missing';
  end if;
  if coalesce(p_enabled, false) then
    update public.message_templates
       set is_default = false
     where user_id = v_user_id
       and id <> v_template.id
       and situation = v_template.situation
       and contact_id is not distinct from v_template.contact_id
       and is_default
       and archived_at is null;
  end if;
  update public.message_templates
     set is_default = coalesce(p_enabled, false)
   where id = v_template.id
  returning * into v_template;
  return to_jsonb(v_template);
end;
$$;

create or replace function public.update_template_category(
  p_category_id uuid,
  p_name text,
  p_situation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_category public.template_categories%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if nullif(btrim(p_name), '') is null or char_length(btrim(p_name)) > 80 then
    raise exception using errcode = '22023', message = 'invalid_category_name';
  end if;
  if coalesce(p_situation, '') not in (
    'repurchase', 'product', 'product-prospect', 'business',
    'fast-start', 'referral', 'manual'
  ) then
    raise exception using errcode = '22023', message = 'invalid_template_situation';
  end if;

  update public.template_categories
     set name = btrim(p_name), situation = p_situation
   where id = p_category_id
     and user_id = v_user_id
     and archived_at is null
  returning * into v_category;
  if not found then
    raise exception using errcode = '42501', message = 'category_not_owned_or_missing';
  end if;

  update public.message_templates
     set situation = p_situation,
         category = case when p_situation = 'repurchase' then 'recompra' else 'seguimiento' end
   where user_id = v_user_id
     and category_id = p_category_id
     and archived_at is null;

  return to_jsonb(v_category);
end;
$$;

create or replace function public.archive_template_category(p_category_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_category public.template_categories%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;

  select * into v_category
    from public.template_categories
   where id = p_category_id
     and user_id = v_user_id
     and archived_at is null
   for update;
  if not found then
    raise exception using errcode = '42501', message = 'category_not_owned_or_missing';
  end if;

  update public.message_templates
     set category_id = null
   where user_id = v_user_id
     and category_id = p_category_id;
  update public.template_categories
     set archived_at = now()
   where id = p_category_id
     and user_id = v_user_id
  returning * into v_category;

  return to_jsonb(v_category);
end;
$$;

create or replace function public.create_template_share_bundle(
  p_operation_id uuid,
  p_template_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template_ids text[];
  v_request_hash text;
  v_snapshot jsonb;
  v_token text;
  v_bundle public.template_share_bundles%rowtype;
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
  if coalesce(cardinality(p_template_ids), 0) not between 1 and 120
     or exists (
       select 1
         from unnest(coalesce(p_template_ids, array[]::text[])) as item(template_id)
        where char_length(btrim(coalesce(item.template_id, ''))) not between 1 and 200
     ) then
    raise exception using errcode = '22023', message = 'template_ids_must_be_1_to_120_unique_values';
  end if;
  select array_agg(template_id order by template_id)
    into v_template_ids
    from (
      select distinct btrim(item.template_id) as template_id
        from unnest(coalesce(p_template_ids, array[]::text[])) as item(template_id)
       where nullif(btrim(item.template_id), '') is not null
    ) selected;
  if cardinality(v_template_ids) <> cardinality(p_template_ids) then
    raise exception using errcode = '22023', message = 'template_ids_must_be_1_to_120_unique_values';
  end if;

  v_request_hash := encode(
    extensions.digest(
      convert_to(array_to_string(v_template_ids, chr(31)), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_token := encode(
    extensions.digest(
      convert_to('template-share:' || v_user_id::text || ':' || p_operation_id::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('template_share:' || v_user_id::text || ':' || p_operation_id::text, 0)
  );
  select * into v_bundle
    from public.template_share_bundles
   where owner_id = v_user_id and operation_id = p_operation_id;
  if found then
    if v_bundle.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'operation_id_reused_with_different_templates';
    end if;
    return jsonb_build_object(
      'id', v_bundle.id,
      'token', v_token,
      'expires_at', v_bundle.expires_at,
      'created_at', v_bundle.created_at,
      'created', false
    );
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'name', btrim(template.name),
      'content', template.content,
      'situation', template.situation,
      'tone', template.tone,
      'category_name', category.name
    ) order by selected.ordinality
  ) into v_snapshot
    from unnest(v_template_ids) with ordinality selected(template_id, ordinality)
    join public.message_templates template
      on template.template_id = selected.template_id
     and template.user_id = v_user_id
     and template.archived_at is null
    left join public.template_categories category
      on category.id = template.category_id
     and category.user_id = v_user_id
     and category.situation = template.situation
     and category.archived_at is null
   where char_length(btrim(coalesce(template.name, ''))) between 1 and 100
     and char_length(coalesce(template.content, '')) between 1 and 5000
     and template.situation in (
       'repurchase', 'product', 'product-prospect', 'business',
       'fast-start', 'referral', 'manual'
     )
     and coalesce(template.tone, '') ~ '^[a-z0-9_-]{1,30}$'
     and regexp_replace(
       template.content,
       '\{\{(contact\.full_name|product\.name|product\.link_url)\}\}',
       '',
       'g'
     ) !~ '\{\{[^{}]+\}\}';

  if coalesce(jsonb_array_length(v_snapshot), 0) <> cardinality(v_template_ids) then
    raise exception using errcode = '42501', message = 'template_not_owned_missing_or_invalid';
  end if;

  insert into public.template_share_bundles (
    owner_id, operation_id, request_hash, token_hash, snapshot
  )
  values (
    v_user_id,
    p_operation_id,
    v_request_hash,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_snapshot
  )
  returning * into v_bundle;

  return jsonb_build_object(
    'id', v_bundle.id,
    'token', v_token,
    'expires_at', v_bundle.expires_at,
    'created_at', v_bundle.created_at,
    'created', true
  );
end;
$$;

create or replace function public.preview_template_share_bundle(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bundle public.template_share_bundles%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    return null;
  end if;
  select * into v_bundle
    from public.template_share_bundles
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and revoked_at is null
     and expires_at > now();
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_bundle.id,
    'expires_at', v_bundle.expires_at,
    'templates', v_bundle.snapshot
  );
end;
$$;

create or replace function public.import_template_share_bundle(
  p_operation_id uuid,
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_bundle public.template_share_bundles%rowtype;
  v_previous public.template_share_imports%rowtype;
  v_operation_previous public.template_share_imports%rowtype;
  v_request_hash text;
  v_item jsonb;
  v_category_id uuid;
  v_template_id text;
  v_template_name text;
  v_template_ids text[] := '{}';
  v_count integer := 0;
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
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_share_token';
  end if;
  v_request_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('template_import_operation:' || v_user_id::text || ':' || p_operation_id::text, 0)
  );
  select * into v_operation_previous
    from public.template_share_imports
   where user_id = v_user_id and operation_id = p_operation_id;
  if found then
    if v_operation_previous.request_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'operation_id_reused_with_different_share';
    end if;
    return jsonb_build_object(
      'bundle_id', v_operation_previous.bundle_id,
      'imported_count', v_operation_previous.imported_count,
      'template_ids', to_jsonb(v_operation_previous.imported_template_ids),
      'created', false
    );
  end if;

  select * into v_bundle
    from public.template_share_bundles
   where token_hash = v_request_hash
   for update;
  if not found then
    raise exception using errcode = '22023', message = 'share_bundle_unavailable';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('template_import_user:' || v_user_id::text, 0)
  );
  select * into v_previous
    from public.template_share_imports
   where bundle_id = v_bundle.id and user_id = v_user_id;
  if found then
    return jsonb_build_object(
      'bundle_id', v_bundle.id,
      'imported_count', v_previous.imported_count,
      'template_ids', to_jsonb(v_previous.imported_template_ids),
      'created', false
    );
  end if;
  if v_bundle.revoked_at is not null or v_bundle.expires_at <= now() then
    raise exception using errcode = '22023', message = 'share_bundle_unavailable';
  end if;

  insert into public.template_share_imports (
    bundle_id, user_id, operation_id, request_hash
  ) values (
    v_bundle.id, v_user_id, p_operation_id, v_request_hash
  );

  for v_item in select value from jsonb_array_elements(v_bundle.snapshot) loop
    v_category_id := null;
    if nullif(btrim(v_item->>'category_name'), '') is not null then
      select id into v_category_id
        from public.template_categories
       where user_id = v_user_id
         and lower(btrim(name)) = lower(btrim(v_item->>'category_name'))
         and situation = v_item->>'situation'
         and archived_at is null
       limit 1;
      if not found then
        insert into public.template_categories (user_id, name, situation)
        values (v_user_id, btrim(v_item->>'category_name'), v_item->>'situation')
        returning id into v_category_id;
      end if;
    end if;

    v_template_id := 'tpl_shared_' || replace(gen_random_uuid()::text, '-', '');
    v_template_name := v_item->>'name';
    if exists (
      select 1
        from public.message_templates template
       where template.user_id = v_user_id
         and template.archived_at is null
         and lower(btrim(template.name)) = lower(btrim(v_template_name))
    ) then
      v_template_name := left(btrim(v_template_name), 88) || ' (importada)';
    end if;
    insert into public.message_templates (
      user_id, template_id, name, content, situation, category, subcategory,
      tone, category_id, contact_id, origin, is_default
    ) values (
      v_user_id,
      v_template_id,
      v_template_name,
      v_item->>'content',
      v_item->>'situation',
      case when v_item->>'situation' = 'repurchase' then 'recompra' else 'seguimiento' end,
      v_item->>'situation',
      v_item->>'tone',
      v_category_id,
      null,
      'user',
      false
    );
    v_template_ids := array_append(v_template_ids, v_template_id);
    v_count := v_count + 1;
  end loop;

  update public.template_share_imports
     set imported_template_ids = v_template_ids,
         imported_count = v_count
   where bundle_id = v_bundle.id and user_id = v_user_id;

  return jsonb_build_object(
    'bundle_id', v_bundle.id,
    'imported_count', v_count,
    'template_ids', to_jsonb(v_template_ids),
    'created', true
  );
end;
$$;

create or replace function public.revoke_template_share_bundle(p_bundle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_bundle public.template_share_bundles%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  update public.template_share_bundles
     set revoked_at = coalesce(revoked_at, now())
   where id = p_bundle_id and owner_id = v_user_id
  returning * into v_bundle;
  if not found then
    raise exception using errcode = '42501', message = 'share_bundle_not_owned_or_missing';
  end if;
  return jsonb_build_object('id', v_bundle.id, 'revoked_at', v_bundle.revoked_at);
end;
$$;

-- Public 1.2 contract. Keep the *_bundle functions above temporarily as
-- compatibility aliases for prerelease clients, while all shipped clients use
-- the stable names from the product contract.
create or replace function public.create_template_share(
  p_operation_id uuid,
  p_template_ids text[]
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select public.create_template_share_bundle(p_operation_id, p_template_ids);
$$;

create or replace function public.preview_template_share(p_token text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select public.preview_template_share_bundle(p_token);
$$;

create or replace function public.import_template_share(
  p_operation_id uuid,
  p_token text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select public.import_template_share_bundle(p_operation_id, p_token);
$$;

create or replace function public.revoke_template_share(p_share_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select public.revoke_template_share_bundle(p_share_id);
$$;

revoke all on table public.template_categories from public, anon, authenticated;
revoke all on table public.template_share_bundles from public, anon, authenticated;
revoke all on table public.template_share_imports from public, anon, authenticated;
-- Keep UPDATE for the already-released 1.1.1 client. Its updates are still
-- constrained to the signed-in owner's rows by RLS. 1.2 uses the stricter RPCs
-- below, but revoking UPDATE here would break edits/defaults/archives for users
-- who have not upgraded yet.
revoke delete on table public.message_templates from authenticated;
revoke update, delete on table public.template_categories from authenticated;
grant select, insert, update on table public.message_templates to authenticated;
grant select, insert on table public.template_categories to authenticated;
grant select on table public.template_share_bundles to authenticated;
grant select on table public.template_share_imports to authenticated;

revoke all on function public.update_message_template(text, text, text, text, text, text, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.archive_message_template(text) from public, anon, authenticated;
revoke all on function public.set_template_default(text, boolean) from public, anon, authenticated;
revoke all on function public.update_template_category(uuid, text, text) from public, anon, authenticated;
revoke all on function public.archive_template_category(uuid) from public, anon, authenticated;
revoke all on function public.create_template_share_bundle(uuid, text[]) from public, anon, authenticated;
revoke all on function public.preview_template_share_bundle(text) from public, anon, authenticated;
revoke all on function public.import_template_share_bundle(uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_template_share_bundle(uuid) from public, anon, authenticated;
revoke all on function public.create_template_share(uuid, text[]) from public, anon, authenticated;
revoke all on function public.preview_template_share(text) from public, anon, authenticated;
revoke all on function public.import_template_share(uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_template_share(uuid) from public, anon, authenticated;
revoke all on function public.validate_message_template_write() from public, anon, authenticated;
grant execute on function public.update_message_template(text, text, text, text, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.archive_message_template(text) to authenticated;
grant execute on function public.set_template_default(text, boolean) to authenticated;
grant execute on function public.update_template_category(uuid, text, text) to authenticated;
grant execute on function public.archive_template_category(uuid) to authenticated;
grant execute on function public.create_template_share_bundle(uuid, text[]) to authenticated;
grant execute on function public.preview_template_share_bundle(text) to authenticated;
grant execute on function public.import_template_share_bundle(uuid, text) to authenticated;
grant execute on function public.revoke_template_share_bundle(uuid) to authenticated;
grant execute on function public.create_template_share(uuid, text[]) to authenticated;
grant execute on function public.preview_template_share(text) to authenticated;
grant execute on function public.import_template_share(uuid, text) to authenticated;
grant execute on function public.revoke_template_share(uuid) to authenticated;
