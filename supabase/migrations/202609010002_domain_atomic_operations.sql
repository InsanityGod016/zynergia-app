-- Minimal domain operations backed by the reviewed production schema snapshot.
-- Sale task generation and Fast Start recalculation remain in the existing
-- client engine until their database contracts are versioned explicitly.

alter table if exists public.sales
  add column if not exists operation_id uuid;

create unique index if not exists sales_user_operation_id_idx
  on public.sales (user_id, operation_id)
  where operation_id is not null;

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
  v_created boolean := false;
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
  if nullif(btrim(p_product_id), '') is null then
    raise exception using errcode = '22023', message = 'product_required';
  end if;
  if p_sale_type not in ('nueva', 'recompra') then
    raise exception using errcode = '22023', message = 'invalid_sale_type';
  end if;

  perform 1
    from public.contacts
   where id = p_contact_id
     and user_id = v_user_id
   for key share;
  if not found then
    raise exception using errcode = '42501', message = 'contact_not_owned_or_missing';
  end if;

  -- A retry with the same operation must describe the same sale.
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

  insert into public.sales (
    user_id,
    contact_id,
    product_id,
    purchase_date,
    sale_type,
    status,
    operation_id
  ) values (
    v_user_id,
    p_contact_id,
    p_product_id,
    p_purchase_date,
    p_sale_type,
    'active',
    p_operation_id
  )
  on conflict (user_id, operation_id) where operation_id is not null
  do nothing
  returning * into v_sale;

  v_created := found;
  if not v_created then
    select *
      into v_sale
      from public.sales
     where user_id = v_user_id
       and operation_id = p_operation_id;
  end if;

  if v_sale.id is null then
    raise exception using errcode = '40001', message = 'sale_retry_required';
  end if;
  if v_sale.contact_id is distinct from p_contact_id
     or v_sale.product_id is distinct from p_product_id
     or v_sale.purchase_date is distinct from p_purchase_date
     or v_sale.sale_type is distinct from p_sale_type then
    raise exception using errcode = '23505', message = 'operation_id_reused_with_different_sale';
  end if;

  return to_jsonb(v_sale) || jsonb_build_object('created', v_created);
end;
$$;

create or replace function public.anonymize_contact(p_contact_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_sales_preserved integer := 0;
  v_tasks_deleted integer := 0;
  v_tasks_scrubbed integer := 0;
  v_partners_unlinked integer := 0;
  v_templates_archived integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception using errcode = '42501', message = 'app_entitlement_required';
  end if;
  if p_contact_id is null then
    raise exception using errcode = '22023', message = 'contact_id_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('zynergia_partner_graph', 0)
  );

  select user_id
    into v_owner_id
    from public.contacts
   where id = p_contact_id
   for update;

  -- Repeating a completed deletion is a harmless no-op. An existing contact
  -- owned by someone else is rejected explicitly below.
  if not found then
    return jsonb_build_object(
      'status', 'already_removed',
      'contact_id', p_contact_id
    );
  end if;
  if v_owner_id <> v_user_id then
    raise exception using errcode = '42501', message = 'contact_not_owned';
  end if;

  -- Keep aggregate sales history but remove the personal link.
  update public.sales
     set contact_id = null
   where user_id = v_user_id
     and contact_id = p_contact_id;
  get diagnostics v_sales_preserved = row_count;

  -- Every unfinished task is future work, even when its due date has passed.
  delete from public.tasks
   where user_id = v_user_id
     and contact_id = p_contact_id
     and not coalesce(completed, false);
  get diagnostics v_tasks_deleted = row_count;

  -- Preserve completed task counts without retaining the contact identifier or
  -- a free-text task name that may contain the person's name.
  update public.tasks
     set contact_id = null,
         task_name = case
           when task_name is null then null
           else 'Seguimiento de contacto eliminado'
         end
   where user_id = v_user_id
     and contact_id = p_contact_id;
  get diagnostics v_tasks_scrubbed = row_count;

  -- This migration runs before message_templates is created. Dynamic SQL keeps
  -- the function installable now and archives contact-specific templates once
  -- that table exists, without retaining the deleted relationship.
  if pg_catalog.to_regclass('public.message_templates') is not null then
    execute
      'update public.message_templates '
      || 'set contact_id = null, archived_at = coalesce(archived_at, pg_catalog.now()) '
      || 'where user_id = $1 and contact_id = $2'
      using v_user_id, p_contact_id;
    get diagnostics v_templates_archived = row_count;
  end if;

  -- A linked account must not keep pointing at a leader after its relationship
  -- contact is removed.
  update public.settings child
     set parent_id = null
   where child.parent_id = v_user_id
     and exists (
       select 1
         from public.partners relationship
        where relationship.user_id = v_user_id
          and relationship.contact_id = p_contact_id
          and relationship.partner_user_id = child.user_id
     );

  delete from public.partners
   where user_id = v_user_id
     and contact_id = p_contact_id;
  get diagnostics v_partners_unlinked = row_count;

  delete from public.contacts
   where id = p_contact_id
     and user_id = v_user_id;

  return jsonb_build_object(
    'status', 'anonymized',
    'contact_id', p_contact_id,
    'sales_preserved', v_sales_preserved,
    'tasks_deleted', v_tasks_deleted,
    'tasks_scrubbed', v_tasks_scrubbed,
    'templates_archived', v_templates_archived,
    'partners_unlinked', v_partners_unlinked
  );
end;
$$;

revoke all on function public.record_sale(uuid, uuid, text, date, text)
  from public, anon, authenticated;
revoke all on function public.anonymize_contact(uuid)
  from public, anon, authenticated;

grant execute on function public.record_sale(uuid, uuid, text, date, text)
  to authenticated;
grant execute on function public.anonymize_contact(uuid)
  to authenticated;
