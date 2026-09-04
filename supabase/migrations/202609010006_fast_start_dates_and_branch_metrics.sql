-- Fast Start dates belong to each account. Team metrics expose only aggregate
-- counts for linked direct branches; no contact, sale, or branch identifiers.

alter table public.settings
  add column if not exists fast_start_started_at date;

create or replace function public.set_fast_start_date(p_started_at date)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(v_user_id) then
    raise exception 'app_entitlement_required';
  end if;
  if p_started_at is null then
    raise exception 'fast_start_date_required';
  end if;
  if p_started_at > current_date then
    raise exception 'fast_start_date_in_future';
  end if;

  update public.settings
     set fast_start_started_at = p_started_at
   where user_id = v_user_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'settings_row_missing';
  end if;

  return p_started_at;
end;
$$;

revoke all on function public.set_fast_start_date(date) from public, anon, authenticated;
grant execute on function public.set_fast_start_date(date) to authenticated;

-- The released clients call this function by named arguments, so keep both the
-- signature and the unused premier_product_ids argument for compatibility.
drop function if exists public.get_partners_fs_metrics(uuid[], text[]);

create function public.get_partners_fs_metrics(user_ids uuid[], premier_product_ids text[])
returns table(
  user_id uuid,
  premier_clients integer,
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
    raise exception 'authentication_required';
  end if;
  if not public.has_app_entitlement(auth.uid()) then
    raise exception 'app_entitlement_required';
  end if;
  if exists (
    select 1
      from unnest(coalesce(user_ids, array[]::uuid[])) requested(user_id)
     where requested.user_id is not null
       and requested.user_id <> auth.uid()
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
  with canonical_premier(product_id) as (
    select unnest(array[
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
  ), requested_users as (
    select distinct requested.user_id
      from unnest(coalesce(user_ids, array[]::uuid[])) requested(user_id)
     where requested.user_id is not null
  ), premier as (
    select s.user_id, count(distinct s.contact_id)::integer as premier_clients
      from public.sales s
      join requested_users requested on requested.user_id = s.user_id
      join canonical_premier product on product.product_id = s.product_id
     where coalesce(s.status, 'active') <> 'cancelled'
     group by s.user_id
  ), partner_counts as (
    select p.user_id, count(*)::integer as partners_count
      from public.partners p
      join requested_users requested on requested.user_id = p.user_id
     group by p.user_id
  ), linked_branches as (
    select p.user_id as owner_user_id, p.partner_user_id as branch_user_id
      from public.partners p
      join requested_users requested on requested.user_id = p.user_id
     where p.partner_user_id is not null
  ), branch_premier as (
    select branch.owner_user_id,
           branch.branch_user_id,
           count(distinct s.contact_id) filter (
             where product.product_id is not null
               and coalesce(s.status, 'active') <> 'cancelled'
           )::integer as premier_clients
      from linked_branches branch
      left join public.sales s on s.user_id = branch.branch_user_id
      left join canonical_premier product on product.product_id = s.product_id
     group by branch.owner_user_id, branch.branch_user_id
  ), branch_aggregates as (
    select branch.owner_user_id,
           jsonb_agg(
             jsonb_build_object('premier_clients', branch.premier_clients)
             order by branch.premier_clients desc, branch.branch_user_id
           ) as direct_branches
      from branch_premier branch
     group by branch.owner_user_id
  )
  select requested.user_id,
         coalesce(premier.premier_clients, 0),
         coalesce(partner_counts.partners_count, 0),
         settings.fast_start_started_at,
         coalesce(branch_aggregates.direct_branches, '[]'::jsonb)
    from requested_users requested
    left join premier on premier.user_id = requested.user_id
    left join partner_counts on partner_counts.user_id = requested.user_id
    left join public.settings settings on settings.user_id = requested.user_id
    left join branch_aggregates on branch_aggregates.owner_user_id = requested.user_id;
end;
$$;

revoke all on function public.get_partners_fs_metrics(uuid[], text[]) from public, anon, authenticated;
grant execute on function public.get_partners_fs_metrics(uuid[], text[]) to authenticated;
