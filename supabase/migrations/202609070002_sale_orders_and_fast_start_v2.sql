-- Multi-item sale orders and authoritative Fast Start kit snapshots.
-- This migration is additive: released 1.1.1 clients keep using record_sale,
-- while 1.2.0 clients use record_sale_order and get_fast_start_snapshots_v2.

create table if not exists public.sale_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  -- Historical rows may already be anonymized or incomplete. New orders are
  -- still required and validated by record_sale_order below.
  contact_id uuid,
  purchase_date date,
  sale_type text,
  status text not null default 'active',
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (user_id, operation_id),
  check (sale_type in ('nueva', 'recompra')),
  check (status in ('active', 'cancelled')),
  check (content_hash ~ '^[a-f0-9]{32}$')
);

-- Allows a transactionally rolled-back retry of a partially applied migration
-- without leaving an older, narrower sale_orders definition behind.
alter table public.sale_orders
  add column if not exists contact_id uuid,
  add column if not exists purchase_date date,
  add column if not exists sale_type text,
  add column if not exists status text default 'active',
  add column if not exists content_hash text;

-- A partially prepared schema must also accept already-anonymized history.
alter table public.sale_orders
  alter column contact_id drop not null,
  alter column purchase_date drop not null,
  alter column sale_type drop not null;

alter table public.sales
  add column if not exists order_id uuid references public.sale_orders(id) on delete set null,
  add column if not exists quantity integer not null default 1,
  add column if not exists follow_up_stopped_at timestamptz;

-- Every historical sale becomes a one-line order without changing its sale ID,
-- status, operation ID or Fast Start history.
insert into public.sale_orders (
  id, user_id, operation_id, contact_id, purchase_date, sale_type, status,
  content_hash, created_at
)
select sale.id,
       sale.user_id,
       sale.id,
       sale.contact_id,
       sale.purchase_date,
       sale.sale_type,
       case when sale.status = 'cancelled' then 'cancelled' else 'active' end,
       md5(pg_catalog.concat_ws(
         '|', sale.contact_id::text, sale.purchase_date::text, sale.sale_type,
         sale.product_id, '1'
       )),
       coalesce(sale.created_at, now())
  from public.sales sale
 where sale.order_id is null
on conflict (id) do nothing;

update public.sales
   set order_id = id,
       quantity = 1
 where order_id is null;

-- Older schemas did not enforce sales.contact_id -> contacts. Preserve every
-- sale while removing stale or cross-tenant contact references before adding
-- the new order foreign key.
update public.sale_orders historical_order
   set contact_id = null
 where historical_order.contact_id is not null
   and not exists (
     select 1
       from public.contacts contact
      where contact.id = historical_order.contact_id
        and contact.user_id = historical_order.user_id
   );

alter table public.sale_orders
  alter column status set default 'active',
  alter column status set not null,
  alter column content_hash set not null;

alter table public.tasks
  drop constraint if exists tasks_source_sale_id_fkey,
  add constraint tasks_source_sale_id_fkey
    foreign key (source_sale_id) references public.sales(id) on delete set null;

do $constraint$
begin
  if not exists (
    select 1
      from pg_catalog.pg_constraint
     where conname = 'sales_quantity_check'
       and conrelid = 'public.sales'::regclass
  ) then
    alter table public.sales
      add constraint sales_quantity_check check (quantity between 1 and 999);
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
     where conname = 'sales_status_check'
       and conrelid = 'public.sales'::regclass
  ) then
    update public.sales set status = 'active' where status is null;
    alter table public.sales
      add constraint sales_status_check check (status in ('active', 'cancelled'));
  end if;
end
$constraint$;

-- Deleting a CRM contact anonymizes the order instead of deleting financial
-- history or blocking the user's requested deletion.
alter table public.sale_orders
  drop constraint if exists sale_orders_contact_owner_fk,
  add constraint sale_orders_contact_owner_fk
    foreign key (contact_id) references public.contacts(id) on delete set null;

create or replace function public.enforce_sale_client_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and not (
       coalesce(old.status, '') = 'active'
       and coalesce(new.status, '') = 'cancelled'
     ) then
    raise exception using errcode = '42501', message = 'sale_status_transition_not_allowed';
  end if;
  if old.follow_up_stopped_at is not null
     and new.follow_up_stopped_at is distinct from old.follow_up_stopped_at then
    raise exception using errcode = '42501', message = 'sale_follow_up_cannot_be_restarted';
  end if;

  -- Released 1.1.1 clients used status='cancelled' as their only way to stop
  -- reminders. Stamp that legacy intent so v2 can preserve the sale for Fast
  -- Start while the old UI still sees the state it expects. Historical rows
  -- that were already cancelled keep a null marker and remain excluded.
  if old.status = 'active' and new.status = 'cancelled' then
    new.follow_up_stopped_at := coalesce(old.follow_up_stopped_at, now());
    -- 1.1.1 deletes these rows from the client after changing status. Do the
    -- same work atomically so a disconnect between those calls cannot leave
    -- reminders behind. Manual, completed, overdue and historical rows stay.
    delete from public.tasks
     where user_id = old.user_id
       and contact_id is not distinct from old.contact_id
       and product_id is not distinct from old.product_id
       and origin = 'sale_automation'
       and not coalesce(completed, false)
       and due_date >= current_date
       and category in ('recompra', 'reactivacion');
  end if;
  return new;
end;
$$;

drop trigger if exists sales_enforce_client_update on public.sales;
create trigger sales_enforce_client_update
before update of status, follow_up_stopped_at on public.sales
for each row execute function public.enforce_sale_client_update();

create unique index if not exists sales_order_product_idx
  on public.sales (user_id, order_id, product_id)
  where order_id is not null;

drop index if exists public.sales_fast_start_v2_idx;
create index sales_fast_start_v2_idx
  on public.sales (user_id, purchase_date, product_id)
  where sale_type = 'nueva'
    and (coalesce(status, 'active') <> 'cancelled' or follow_up_stopped_at is not null);

alter table public.sale_orders enable row level security;

drop policy if exists sale_orders_select_own on public.sale_orders;
create policy sale_orders_select_own
  on public.sale_orders for select to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()));

-- Existing clients may still change status to cancelled. They can no longer
-- insert arbitrary sale rows or alter product/quantity ownership fields.
drop policy if exists users_own_sales on public.sales;
drop policy if exists sales_select_own on public.sales;
drop policy if exists sales_update_own on public.sales;

create policy sales_select_own
  on public.sales for select to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()));

create policy sales_update_own
  on public.sales for update to authenticated
  using (auth.uid() = user_id and public.has_app_entitlement(auth.uid()))
  with check (auth.uid() = user_id and public.has_app_entitlement(auth.uid()));

revoke all on table public.sale_orders from public, anon, authenticated;
grant select on table public.sale_orders to authenticated;

revoke all on table public.sales from public, anon, authenticated;
grant select on table public.sales to authenticated;
grant update (status) on table public.sales to authenticated;

revoke all on function public.enforce_sale_client_update() from public, anon, authenticated;

create or replace function public.record_sale_order(
  p_operation_id uuid,
  p_contact_id uuid,
  p_items jsonb,
  p_purchase_date date,
  p_sale_type text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.sale_orders%rowtype;
  v_created boolean := false;
  v_normalized_items jsonb;
  v_content_hash text;
  v_item record;
  v_sale_id uuid;
  v_parent_id uuid;
  v_cycle_days integer;
  v_repurchase_enabled boolean;
  v_all_product_ids constant text[] := array[
    'prod_kit_belage', 'prod_kit_kronuit_fire', 'prod_kit_inner_7',
    'prod_kit_hasaki', 'prod_kit_zeal', 'prod_kit_zeal_10',
    'prod_kit_balanceoil', 'prod_kit_balanceoil_with_test', 'prod_kit_viv',
    'prod_kit_xtend', 'prod_kit_serum', 'prod_belage', 'prod_kronuit',
    'prod_inner_7', 'prod_hasaki', 'prod_zeal_mango',
    'prod_zeal_wild_berry', 'prod_zeal_mango_10', 'prod_burn',
    'prod_essentoil', 'prod_viv', 'prod_xtend', 'prod_zinobiotic', 'prod_serum'
  ]::text[];
  v_premier_product_ids constant text[] := array[
    'prod_kit_belage', 'prod_kit_kronuit_fire', 'prod_kit_inner_7',
    'prod_kit_hasaki', 'prod_kit_zeal', 'prod_kit_zeal_10',
    'prod_kit_balanceoil', 'prod_kit_balanceoil_with_test', 'prod_kit_viv',
    'prod_kit_xtend', 'prod_kit_serum'
  ]::text[];
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if p_operation_id is null or p_contact_id is null or p_purchase_date is null then
    raise exception using errcode = '22023', message = 'sale_fields_required';
  end if;
  if p_purchase_date > current_date then
    raise exception using errcode = '22023', message = 'future_sale_date_not_allowed';
  end if;
  if coalesce(p_sale_type, '') not in ('nueva', 'recompra') then
    raise exception using errcode = '22023', message = 'invalid_sale_type';
  end if;
  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception using errcode = '22023', message = 'invalid_sale_items';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_items) item
     where jsonb_typeof(item) <> 'object'
        or nullif(btrim(item->>'product_id'), '') is null
        or coalesce(item->>'quantity', '') !~ '^[1-9][0-9]{0,2}$'
  ) then
    raise exception using errcode = '22023', message = 'invalid_sale_item';
  end if;

  select jsonb_agg(
           jsonb_build_object('product_id', normalized.product_id, 'quantity', normalized.quantity)
           order by normalized.product_id
         )
    into v_normalized_items
    from (
      select btrim(item->>'product_id') as product_id,
             sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(p_items) item
       group by btrim(item->>'product_id')
    ) normalized;

  if exists (
    select 1
      from jsonb_array_elements(v_normalized_items) item
     where (item->>'quantity')::integer > 999
  ) then
    raise exception using errcode = '22023', message = 'sale_item_quantity_too_large';
  end if;

  v_content_hash := md5(pg_catalog.concat_ws(
    '|', p_contact_id::text, p_purchase_date::text, p_sale_type,
    v_normalized_items::text
  ));

  -- Resolve an already committed operation before revalidating mutable CRM
  -- state. A legitimate retry must still return its original result after its
  -- contact was anonymized or a product was archived.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_operation_id::text, 0)
  );

  select *
    into v_order
    from public.sale_orders
   where user_id = v_user_id
     and operation_id = p_operation_id
   for update;

  if found then
    if v_order.content_hash is distinct from v_content_hash then
      raise exception using errcode = '23505', message = 'operation_id_reused_with_different_sale';
    end if;

    return jsonb_build_object(
      'order_id', v_order.id,
      'created', false,
      'items', (
        select coalesce(jsonb_agg(to_jsonb(sale) order by sale.product_id), '[]'::jsonb)
          from public.sales sale
         where sale.order_id = v_order.id and sale.user_id = v_user_id
      )
    );
  end if;

  perform 1
    from public.contacts
   where id = p_contact_id
     and user_id = v_user_id
   for key share;
  if not found then
    raise exception using errcode = '42501', message = 'contact_not_owned_or_missing';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_normalized_items) item
     where not (
       (
         item->>'product_id' = any(v_all_product_ids)
         and not exists (
           select 1
             from public.user_products archived
            where archived.user_id = v_user_id
              and archived.product_id = item->>'product_id'
              and archived.archived_at is not null
         )
       )
       or exists (
         select 1
           from public.user_products custom_product
          where custom_product.user_id = v_user_id
            and custom_product.product_id = item->>'product_id'
            and custom_product.archived_at is null
       )
     )
  ) then
    raise exception using errcode = '22023', message = 'product_not_available';
  end if;

  if exists (
    select 1 from public.sales
     where user_id = v_user_id and operation_id = p_operation_id
  ) then
    raise exception using errcode = '23505', message = 'operation_id_already_used_by_legacy_sale';
  end if;

  insert into public.sale_orders (
    user_id, operation_id, contact_id, purchase_date, sale_type, status,
    content_hash
  ) values (
    v_user_id, p_operation_id, p_contact_id, p_purchase_date, p_sale_type,
    'active', v_content_hash
  )
  returning * into v_order;
  v_created := true;

  insert into public.sales (
    user_id, contact_id, product_id, purchase_date, sale_type, status,
    order_id, quantity
  )
  select v_user_id,
         p_contact_id,
         item->>'product_id',
         p_purchase_date,
         p_sale_type,
         'active',
         v_order.id,
         (item->>'quantity')::integer
    from jsonb_array_elements(v_normalized_items) item;

  -- One follow-up sequence per distinct product, regardless of quantity.
  for v_item in
    select item->>'product_id' as product_id
      from jsonb_array_elements(v_normalized_items) item
  loop
    select sale.id
      into v_sale_id
      from public.sales sale
     where sale.user_id = v_user_id
       and sale.order_id = v_order.id
       and sale.product_id = v_item.product_id;

    select coalesce(
             (
               select product.cycle_days
                 from public.user_products product
                where product.user_id = v_user_id
                  and product.product_id = v_item.product_id
                  and product.archived_at is null
             ),
             case
               when v_item.product_id = any(v_premier_product_ids) then 180
               when v_item.product_id = any(v_all_product_ids) then 30
               else null
             end
           ),
           coalesce(
             (
               select product.repurchase_enabled
                 from public.user_products product
                where product.user_id = v_user_id
                  and product.product_id = v_item.product_id
                  and product.archived_at is null
             ),
             true
           )
      into v_cycle_days, v_repurchase_enabled;

    delete from public.tasks
     where user_id = v_user_id
       and contact_id = p_contact_id
       and product_id = v_item.product_id
       and origin = 'sale_automation'
       and not coalesce(completed, false);

    if p_sale_type = 'nueva' then
      insert into public.tasks (
        user_id, contact_id, product_id, category, subcategory,
        template_subcategory, task_name, task_area, due_date, completed,
        origin, source_sale_id
      ) values (
        v_user_id, p_contact_id, v_item.product_id, 'seguimiento', 'dia_3',
        'producto_dia_3', 'Bienvenida Día 3', 'producto', p_purchase_date + 3, false,
        'sale_automation', v_sale_id
      );
    end if;

    if v_repurchase_enabled and v_cycle_days is not null and v_cycle_days > 0 then
      insert into public.tasks (
        user_id, contact_id, product_id, category, subcategory,
        template_subcategory, task_name, task_area, due_date, completed,
        origin, source_sale_id
      ) values
        (v_user_id, p_contact_id, v_item.product_id, 'recompra', '7_dias_antes',
         'producto_7_dias_antes', 'Recompra 7 días antes', 'producto',
         p_purchase_date + v_cycle_days - 7, false, 'sale_automation', v_sale_id),
        (v_user_id, p_contact_id, v_item.product_id, 'recompra', '3_dias_antes',
         'producto_3_dias_antes', 'Recompra 3 días antes', 'producto',
         p_purchase_date + v_cycle_days - 3, false, 'sale_automation', v_sale_id),
        (v_user_id, p_contact_id, v_item.product_id, 'recompra', '5_dias_despues',
         'producto_5_dias_despues', 'Recompra 5 días después', 'producto',
         p_purchase_date + v_cycle_days + 5, false, 'sale_automation', v_sale_id),
        (v_user_id, p_contact_id, v_item.product_id, 'reactivacion', 'reactivacion',
         'producto_reactivacion', 'Reactivación', 'producto',
         p_purchase_date + v_cycle_days + 35, false, 'sale_automation', v_sale_id);
    end if;
  end loop;

  -- A later migration may install the push outbox hook. Dynamic SQL keeps
  -- this migration deployable before that function exists.
  if pg_catalog.to_regprocedure('public.queue_fast_start_refresh(uuid)') is not null then
    execute 'select public.queue_fast_start_refresh($1)' using v_user_id;
    -- A stale one-sided parent_id must never make the core sale transaction
    -- fail inside the optional notification hook. Queue the upline refresh
    -- only when both persisted graph edges still agree.
    select settings.parent_id
      into v_parent_id
      from public.settings settings
      join public.partners relationship
        on relationship.user_id = settings.parent_id
       and relationship.partner_user_id = settings.user_id
     where settings.user_id = v_user_id;
    if v_parent_id is not null then
      -- A direct branch sale can change the leader's Level 2 snapshot too.
      execute 'select public.queue_fast_start_refresh($1)' using v_parent_id;
    end if;
  end if;

  return jsonb_build_object(
    'order_id', v_order.id,
    'created', v_created,
    'items', (
      select coalesce(jsonb_agg(to_jsonb(sale) order by sale.product_id), '[]'::jsonb)
        from public.sales sale
       where sale.order_id = v_order.id and sale.user_id = v_user_id
    )
  );
end;
$$;

-- Compatibility wrapper for every released 1.1.1 client.
create or replace function public.record_sale(
  p_operation_id uuid,
  p_contact_id uuid,
  p_product_id text,
  p_purchase_date date,
  p_sale_type text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales%rowtype;
  v_result jsonb;
  v_order_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;

  select *
    into v_sale
    from public.sales
   where user_id = v_user_id
     and operation_id = p_operation_id;

  if found then
    if v_sale.contact_id is distinct from p_contact_id
       or v_sale.product_id is distinct from p_product_id
       or v_sale.purchase_date is distinct from p_purchase_date
       or v_sale.sale_type is distinct from p_sale_type then
      raise exception using errcode = '23505', message = 'operation_id_reused_with_different_sale';
    end if;
    return to_jsonb(v_sale) || jsonb_build_object('created', false);
  end if;

  v_result := public.record_sale_order(
    p_operation_id,
    p_contact_id,
    jsonb_build_array(jsonb_build_object('product_id', p_product_id, 'quantity', 1)),
    p_purchase_date,
    p_sale_type
  );
  v_order_id := (v_result->>'order_id')::uuid;

  update public.sales
     set operation_id = p_operation_id
   where user_id = v_user_id
     and order_id = v_order_id
  returning * into v_sale;

  -- The released 1.1.1 client owns follow-up creation after this RPC returns.
  -- Remove the v2 reminders made by record_sale_order inside this same
  -- transaction, including overdue rows that the old client would not replace.
  delete from public.tasks
   where user_id = v_user_id
     and source_sale_id = v_sale.id
     and origin = 'sale_automation';

  return to_jsonb(v_sale) || jsonb_build_object('created', coalesce((v_result->>'created')::boolean, false));
end;
$$;

create or replace function public.stop_sale_follow_up(
  p_sale_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales%rowtype;
  v_sales_updated integer := 0;
  v_tasks_deleted integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  select *
    into v_sale
    from public.sales
   where id = p_sale_id and user_id = v_user_id
   for update;
  if not found then
    raise exception using errcode = '42501', message = 'sale_not_owned_or_missing';
  end if;

  update public.sales
     set follow_up_stopped_at = coalesce(follow_up_stopped_at, now())
   where user_id = v_user_id
     and contact_id = v_sale.contact_id
     and product_id = v_sale.product_id
     and coalesce(status, 'active') <> 'cancelled';
  get diagnostics v_sales_updated = row_count;

  delete from public.tasks
   where user_id = v_user_id
     and contact_id = v_sale.contact_id
     and product_id = v_sale.product_id
     and origin = 'sale_automation'
     and not coalesce(completed, false)
     and due_date >= current_date
     and category in ('recompra', 'reactivacion');
  get diagnostics v_tasks_deleted = row_count;

  return jsonb_build_object(
    'sales_updated', v_sales_updated,
    'tasks_deleted', v_tasks_deleted
  );
end;
$$;

-- Temporary compatibility for the first 1.2 preview builds.
create or replace function public.stop_product_follow_up(
  p_contact_id uuid,
  p_product_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;

  select sale.id
    into v_sale_id
    from public.sales sale
   where sale.user_id = v_user_id
     and sale.contact_id = p_contact_id
     and sale.product_id = p_product_id
   order by sale.purchase_date desc, sale.created_at desc
   limit 1;

  if v_sale_id is null then
    raise exception using errcode = '42501', message = 'sale_not_owned_or_missing';
  end if;
  return public.stop_sale_follow_up(v_sale_id);
end;
$$;

create or replace function public.get_fast_start_snapshots_v2(p_user_ids uuid[])
returns table(
  user_id uuid,
  qteam_kits integer,
  xteam_kits integer,
  partners_count integer,
  fast_start_started_at date,
  direct_branches jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if exists (
    select 1
      from unnest(coalesce(p_user_ids, array[]::uuid[])) requested(user_id)
     where requested.user_id is not null
       and requested.user_id <> auth.uid()
       and not exists (
         select 1
           from public.partners relationship
          where relationship.user_id = auth.uid()
            and relationship.partner_user_id = requested.user_id
       )
  ) then
    raise exception using errcode = '42501', message = 'partner_access_denied';
  end if;

  return query
  with canonical_premier(product_id) as (
    select unnest(array[
      'prod_kit_belage', 'prod_kit_kronuit_fire', 'prod_kit_inner_7',
      'prod_kit_hasaki', 'prod_kit_zeal', 'prod_kit_zeal_10',
      'prod_kit_balanceoil', 'prod_kit_balanceoil_with_test', 'prod_kit_viv',
      'prod_kit_xtend', 'prod_kit_serum'
    ]::text[])
  ), requested_users as (
    select distinct requested.user_id
      from unnest(coalesce(p_user_ids, array[]::uuid[])) requested(user_id)
     where requested.user_id is not null
  ), account_base as (
    select requested.user_id, settings.fast_start_started_at
      from requested_users requested
      left join public.settings settings on settings.user_id = requested.user_id
  ), kit_totals as (
    select account.user_id,
           coalesce(sum(sale.quantity) filter (
             where sale.purchase_date between account.fast_start_started_at
                                          and account.fast_start_started_at + 30
           ), 0)::integer as qteam_kits,
           coalesce(sum(sale.quantity) filter (
             where sale.purchase_date between account.fast_start_started_at
                                          and account.fast_start_started_at + 120
           ), 0)::integer as xteam_kits
      from account_base account
      left join public.sales sale
        on sale.user_id = account.user_id
       and sale.sale_type = 'nueva'
       and (
         coalesce(sale.status, 'active') <> 'cancelled'
         or sale.follow_up_stopped_at is not null
       )
       and sale.purchase_date <= current_date
      left join canonical_premier product on product.product_id = sale.product_id
     where product.product_id is not null or sale.id is null
     group by account.user_id
  ), partner_counts as (
    select relationship.user_id, count(*)::integer as partners_count
      from public.partners relationship
      join requested_users requested on requested.user_id = relationship.user_id
      join account_base owner_account on owner_account.user_id = relationship.user_id
     where owner_account.fast_start_started_at is not null
       and relationship.start_date between owner_account.fast_start_started_at
                                       and owner_account.fast_start_started_at + 60
       and relationship.start_date <= current_date
     group by relationship.user_id
  ), linked_branches as (
    select relationship.user_id as owner_user_id,
           relationship.partner_user_id as branch_user_id,
           owner_settings.fast_start_started_at as owner_started_at,
           branch_settings.fast_start_started_at as branch_started_at
      from public.partners relationship
      join requested_users requested on requested.user_id = relationship.user_id
      join public.settings owner_settings
        on owner_settings.user_id = relationship.user_id
      left join public.settings branch_settings
        on branch_settings.user_id = relationship.partner_user_id
     where relationship.partner_user_id is not null
       and branch_settings.parent_id = relationship.user_id
       and relationship.start_date between owner_settings.fast_start_started_at
                                       and owner_settings.fast_start_started_at + 60
       and relationship.start_date <= current_date
  ), branch_totals as (
    select branch.owner_user_id,
           branch.branch_user_id,
           case
             when branch.branch_started_at is null then null
             else coalesce(sum(sale.quantity) filter (
               where product.product_id is not null
                 and sale.sale_type = 'nueva'
                 and (
                   coalesce(sale.status, 'active') <> 'cancelled'
                   or sale.follow_up_stopped_at is not null
                 )
                 and sale.purchase_date <= current_date
                 and sale.purchase_date between branch.branch_started_at
                                            and branch.branch_started_at + 30
                 and sale.purchase_date between branch.owner_started_at
                                            and branch.owner_started_at + 90
             ), 0)::integer
           end as qteam_kits
      from linked_branches branch
      left join public.sales sale on sale.user_id = branch.branch_user_id
      left join canonical_premier product on product.product_id = sale.product_id
     group by branch.owner_user_id, branch.branch_user_id, branch.branch_started_at
  ), branch_aggregates as (
    select branch.owner_user_id,
           jsonb_agg(
             jsonb_build_object('qteam_kits', branch.qteam_kits)
             order by branch.qteam_kits desc nulls last
           ) as direct_branches
      from branch_totals branch
     group by branch.owner_user_id
  )
  select account.user_id,
         coalesce(totals.qteam_kits, 0),
         coalesce(totals.xteam_kits, 0),
         coalesce(partners.partners_count, 0),
         account.fast_start_started_at,
         coalesce(branches.direct_branches, '[]'::jsonb)
    from account_base account
    left join kit_totals totals on totals.user_id = account.user_id
    left join partner_counts partners on partners.user_id = account.user_id
    left join branch_aggregates branches on branches.owner_user_id = account.user_id;
end;
$$;

create or replace function public.get_my_fast_start_snapshot_v2()
returns table(
  user_id uuid,
  qteam_kits integer,
  xteam_kits integer,
  partners_count integer,
  fast_start_started_at date,
  direct_branches jsonb
)
language sql
security definer
set search_path = ''
as $$
  select * from public.get_fast_start_snapshots_v2(array[auth.uid()]);
$$;

create or replace function public.get_team_snapshot_v2()
returns table(
  user_id uuid,
  qteam_kits integer,
  xteam_kits integer,
  partners_count integer,
  fast_start_started_at date,
  direct_branches jsonb
)
language sql
security definer
set search_path = ''
as $$
  select *
    from public.get_fast_start_snapshots_v2(
      array[auth.uid()] || coalesce((
        select array_agg(relationship.partner_user_id order by relationship.partner_user_id)
          from public.partners relationship
          join public.settings child
            on child.user_id = relationship.partner_user_id
           and child.parent_id = auth.uid()
         where relationship.user_id = auth.uid()
           and relationship.partner_user_id is not null
      ), array[]::uuid[])
    );
$$;

revoke all on function public.record_sale_order(uuid, uuid, jsonb, date, text)
  from public, anon, authenticated;
revoke all on function public.record_sale(uuid, uuid, text, date, text)
  from public, anon, authenticated;
revoke all on function public.stop_sale_follow_up(uuid)
  from public, anon, authenticated;
revoke all on function public.stop_product_follow_up(uuid, text)
  from public, anon, authenticated;
revoke all on function public.get_fast_start_snapshots_v2(uuid[])
  from public, anon, authenticated;
revoke all on function public.get_my_fast_start_snapshot_v2()
  from public, anon, authenticated;
revoke all on function public.get_team_snapshot_v2()
  from public, anon, authenticated;

grant execute on function public.record_sale_order(uuid, uuid, jsonb, date, text)
  to authenticated;
grant execute on function public.record_sale(uuid, uuid, text, date, text)
  to authenticated;
grant execute on function public.stop_sale_follow_up(uuid)
  to authenticated;
grant execute on function public.stop_product_follow_up(uuid, text)
  to authenticated;
grant execute on function public.get_my_fast_start_snapshot_v2() to authenticated;
grant execute on function public.get_team_snapshot_v2() to authenticated;
