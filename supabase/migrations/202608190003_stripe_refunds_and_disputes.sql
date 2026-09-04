alter table public.billing_accounts
  add column if not exists access_blocked_reason text,
  add column if not exists access_decision_event_id text,
  add column if not exists access_decision_at timestamptz,
  add column if not exists last_paid_invoice_event_id text,
  add column if not exists last_paid_invoice_event_at timestamptz;

do $migration$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'billing_accounts_access_blocked_reason_check'
       and conrelid = 'public.billing_accounts'::regclass
  ) then
    alter table public.billing_accounts
      add constraint billing_accounts_access_blocked_reason_check
      check (access_blocked_reason is null or access_blocked_reason in (
        'full_refund', 'dispute_open', 'dispute_lost'
      ));
  end if;
end
$migration$;

create table if not exists public.stripe_access_incidents (
  id uuid primary key default gen_random_uuid(),
  stripe_customer_id text not null
    references public.billing_accounts(stripe_customer_id) on delete cascade,
  stripe_subscription_id text not null,
  incident_key text not null,
  incident_kind text not null check (incident_kind in ('full_refund', 'dispute')),
  status text not null check (status in ('blocking', 'resolved')),
  blocked_reason text check (blocked_reason in ('full_refund', 'dispute_open', 'dispute_lost')),
  last_event_id text not null,
  last_event_created_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stripe_customer_id, incident_key),
  check (
    (status = 'blocking' and blocked_reason is not null and resolved_at is null)
    or (status = 'resolved' and blocked_reason is null and resolved_at is not null)
  )
);

create index if not exists stripe_access_incidents_blocking_idx
  on public.stripe_access_incidents (stripe_customer_id, last_event_created_at desc)
  where status = 'blocking';

alter table public.stripe_access_incidents enable row level security;

drop trigger if exists stripe_access_incidents_set_updated_at
  on public.stripe_access_incidents;
create trigger stripe_access_incidents_set_updated_at
before update on public.stripe_access_incidents
for each row execute function public.zynergia_set_updated_at();

create or replace function public.refresh_stripe_access_block(p_stripe_customer_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
begin
  select blocked_reason
    into v_reason
    from public.stripe_access_incidents
   where stripe_customer_id = p_stripe_customer_id
     and status = 'blocking'
   order by last_event_created_at desc, incident_key
   limit 1;

  update public.billing_accounts
     set access_blocked_reason = v_reason
   where stripe_customer_id = p_stripe_customer_id;
end;
$$;

create or replace function public.refresh_stripe_access_grant(p_stripe_customer_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.billing_accounts%rowtype;
  v_status text;
  v_access_until timestamptz;
begin
  select *
    into v_account
    from public.billing_accounts
   where stripe_customer_id = p_stripe_customer_id
   for update;

  if not found then
    return;
  end if;

  if v_account.user_id is null or v_account.anonymized_at is not null then
    delete from public.access_grants
     where source = 'stripe' and source_key = p_stripe_customer_id;
    return;
  end if;

  if v_account.access_blocked_reason is not null then
    v_status := 'revoked';
    v_access_until := null;
  elsif v_account.entitlement_eligible
        and v_account.subscription_status = 'active'
        and v_account.current_period_end is not null
        and v_account.current_period_end > now() then
    v_status := 'active';
    v_access_until := v_account.current_period_end;
  elsif v_account.entitlement_eligible
        and v_account.subscription_status = 'past_due'
        and v_account.grace_until is not null
        and v_account.grace_until > now() then
    v_status := 'grace';
    v_access_until := v_account.grace_until;
  else
    v_status := 'revoked';
    v_access_until := null;
  end if;

  insert into public.access_grants (
    user_id, source, source_key, status, access_until, revoked_at
  ) values (
    v_account.user_id,
    'stripe',
    p_stripe_customer_id,
    v_status,
    v_access_until,
    case when v_status = 'revoked' then now() else null end
  )
  on conflict (source, source_key) do update
    set user_id = excluded.user_id,
        status = excluded.status,
        access_until = excluded.access_until,
        revoked_at = excluded.revoked_at;
end;
$$;

create or replace function public.record_stripe_access_incident(
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_claim_email text,
  p_incident_key text,
  p_incident_kind text,
  p_access_blocked_reason text,
  p_event_id text,
  p_event_created_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.billing_accounts%rowtype;
  v_incident public.stripe_access_incidents%rowtype;
  v_email text := nullif(lower(btrim(p_claim_email)), '');
  v_status text := case when p_access_blocked_reason is null then 'resolved' else 'blocking' end;
begin
  if p_stripe_customer_id is null or p_stripe_customer_id !~ '^cus_'
     or p_stripe_subscription_id is null or p_stripe_subscription_id !~ '^sub_' then
    raise exception 'invalid_stripe_billing_target';
  end if;
  if p_event_id is null or btrim(p_event_id) = '' or p_event_created_at is null then
    raise exception 'invalid_access_incident_event';
  end if;
  if p_incident_kind not in ('full_refund', 'dispute')
     or (p_incident_kind = 'full_refund' and p_incident_key !~ '^charge:ch_')
     or (p_incident_kind = 'dispute' and p_incident_key !~ '^dispute:dp_') then
    raise exception 'invalid_access_incident';
  end if;
  if (p_incident_kind = 'full_refund' and p_access_blocked_reason is distinct from 'full_refund')
     or (p_incident_kind = 'dispute' and p_access_blocked_reason is not null
         and p_access_blocked_reason not in ('dispute_open', 'dispute_lost')) then
    raise exception 'invalid_access_blocked_reason';
  end if;

  insert into public.billing_accounts (
    stripe_customer_id, stripe_subscription_id, claim_email
  ) values (
    p_stripe_customer_id, p_stripe_subscription_id, v_email
  )
  on conflict (stripe_customer_id) do nothing;

  select *
    into v_account
    from public.billing_accounts
   where stripe_customer_id = p_stripe_customer_id
   for update;

  if v_account.anonymized_at is not null then
    return jsonb_build_object('status', 'ignored_anonymized');
  end if;
  if v_status = 'blocking'
     and v_account.stripe_subscription_id is not null
     and v_account.stripe_subscription_id <> p_stripe_subscription_id then
    return jsonb_build_object('status', 'ignored_unrelated_subscription');
  end if;
  if p_incident_kind = 'full_refund'
     and v_account.last_paid_invoice_event_at is not null
     and p_event_created_at < v_account.last_paid_invoice_event_at then
    return jsonb_build_object('status', 'ignored_before_latest_payment');
  end if;

  update public.billing_accounts
     set stripe_subscription_id = coalesce(stripe_subscription_id, p_stripe_subscription_id),
         claim_email = case
           when user_id is null then coalesce(claim_email, v_email)
           else null
         end
   where id = v_account.id;

  insert into public.stripe_access_incidents (
    stripe_customer_id,
    stripe_subscription_id,
    incident_key,
    incident_kind,
    status,
    blocked_reason,
    last_event_id,
    last_event_created_at,
    resolved_at
  ) values (
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_incident_key,
    p_incident_kind,
    v_status,
    p_access_blocked_reason,
    p_event_id,
    p_event_created_at,
    case when v_status = 'resolved' then p_event_created_at else null end
  )
  on conflict (stripe_customer_id, incident_key) do update
    set stripe_subscription_id = excluded.stripe_subscription_id,
        incident_kind = excluded.incident_kind,
        status = excluded.status,
        blocked_reason = excluded.blocked_reason,
        last_event_id = excluded.last_event_id,
        last_event_created_at = excluded.last_event_created_at,
        resolved_at = excluded.resolved_at
    where excluded.last_event_created_at > public.stripe_access_incidents.last_event_created_at
       or (
         excluded.last_event_created_at = public.stripe_access_incidents.last_event_created_at
         and excluded.status = 'blocking'
         and public.stripe_access_incidents.status = 'resolved'
       )
  returning * into v_incident;

  if v_incident.id is null then
    return jsonb_build_object('status', 'ignored_stale_event');
  end if;

  update public.billing_accounts
     set access_decision_event_id = case
           when access_decision_at is null or p_event_created_at >= access_decision_at
             then p_event_id
           else access_decision_event_id
         end,
         access_decision_at = greatest(
           coalesce(access_decision_at, '-infinity'::timestamptz),
           p_event_created_at
         )
   where stripe_customer_id = p_stripe_customer_id;

  perform public.refresh_stripe_access_block(p_stripe_customer_id);
  perform public.refresh_stripe_access_grant(p_stripe_customer_id);

  return jsonb_build_object('status', v_status, 'incident_key', p_incident_key);
end;
$$;

create or replace function public.record_stripe_invoice_paid(
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_event_id text,
  p_event_created_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.billing_accounts%rowtype;
  v_resolved integer;
begin
  if p_stripe_customer_id is null or p_stripe_customer_id !~ '^cus_'
     or p_stripe_subscription_id is null or p_stripe_subscription_id !~ '^sub_'
     or p_event_id is null or btrim(p_event_id) = '' or p_event_created_at is null then
    raise exception 'invalid_paid_invoice_event';
  end if;

  select *
    into v_account
    from public.billing_accounts
   where stripe_customer_id = p_stripe_customer_id
   for update;

  if not found then
    raise exception 'billing_account_missing';
  end if;
  if v_account.anonymized_at is not null then
    return jsonb_build_object('status', 'ignored_anonymized');
  end if;
  if v_account.stripe_subscription_id is distinct from p_stripe_subscription_id then
    return jsonb_build_object('status', 'ignored_unrelated_subscription');
  end if;
  if v_account.last_paid_invoice_event_at is not null
     and p_event_created_at < v_account.last_paid_invoice_event_at then
    return jsonb_build_object('status', 'ignored_stale_event');
  end if;

  update public.billing_accounts
     set last_paid_invoice_event_id = p_event_id,
         last_paid_invoice_event_at = p_event_created_at,
         access_decision_event_id = case
           when access_decision_at is null or p_event_created_at >= access_decision_at
             then p_event_id
           else access_decision_event_id
         end,
         access_decision_at = greatest(
           coalesce(access_decision_at, '-infinity'::timestamptz),
           p_event_created_at
         )
   where id = v_account.id;

  update public.stripe_access_incidents
     set status = 'resolved',
         blocked_reason = null,
         last_event_id = p_event_id,
         last_event_created_at = p_event_created_at,
         resolved_at = p_event_created_at
   where stripe_customer_id = p_stripe_customer_id
     and incident_kind = 'full_refund'
     and status = 'blocking'
     and last_event_created_at < p_event_created_at;
  get diagnostics v_resolved = row_count;

  perform public.refresh_stripe_access_block(p_stripe_customer_id);
  perform public.refresh_stripe_access_grant(p_stripe_customer_id);

  return jsonb_build_object('status', 'recalculated', 'refunds_resolved', v_resolved);
end;
$$;

create or replace function public.begin_account_deletion(p_user_id uuid, p_operation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.account_deletion_requests%rowtype;
  v_account public.billing_accounts%rowtype;
  v_execute_at timestamptz;
  v_should_schedule boolean := false;
begin
  if p_user_id is null or p_operation_id is null then
    raise exception 'invalid_deletion_request';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 1)
  );

  select *
    into v_request
    from public.account_deletion_requests
   where user_id = p_user_id
   for update;

  if not found then
    if exists (
      select 1 from public.account_deletion_requests
       where operation_id = p_operation_id and user_id is distinct from p_user_id
    ) then
      raise exception 'operation_id_already_used';
    end if;
    insert into public.account_deletion_requests (operation_id, user_id)
    values (p_operation_id, p_user_id)
    returning * into v_request;
  elsif v_request.status = 'processing'
        and v_request.execute_at <= now()
        and v_request.locked_at > now() - interval '15 minutes' then
    return jsonb_build_object(
      'request_id', v_request.id,
      'status', v_request.status,
      'operation_id', v_request.operation_id,
      'user_id', v_request.user_id,
      'stripe_customer_id', v_request.stripe_customer_id,
      'stripe_subscription_id', v_request.stripe_subscription_id,
      'execute_at', v_request.execute_at,
      'should_schedule', false,
      'already_processing', true
    );
  end if;

  select *
    into v_account
    from public.billing_accounts
   where user_id = p_user_id and anonymized_at is null;

  if v_account.id is not null
     and v_account.entitlement_eligible
     and v_account.subscription_status = 'active'
     and v_account.access_blocked_reason is null
     and v_account.current_period_end is not null
     and v_account.current_period_end > now() then
    v_execute_at := v_account.current_period_end;
    v_should_schedule := true;
  else
    v_execute_at := now();
  end if;

  update public.account_deletion_requests
     set status = case when v_should_schedule then 'scheduling' else 'processing' end,
         execute_at = v_execute_at,
         stripe_customer_id = v_account.stripe_customer_id,
         stripe_subscription_id = v_account.stripe_subscription_id,
         attempt_count = attempt_count + 1,
         locked_at = now(),
         failure_code = null
   where id = v_request.id
   returning * into v_request;

  return jsonb_build_object(
    'request_id', v_request.id,
    'status', v_request.status,
    'operation_id', v_request.operation_id,
    'user_id', v_request.user_id,
    'stripe_customer_id', v_request.stripe_customer_id,
    'stripe_subscription_id', v_request.stripe_subscription_id,
    'execute_at', v_request.execute_at,
    'should_schedule', v_should_schedule
  );
end;
$$;

create or replace function public.get_access_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_billing public.billing_accounts%rowtype;
  v_grant public.access_grants%rowtype;
  v_onboarding timestamptz;
  v_deletion_at timestamptz;
begin
  select *
    into v_billing
    from public.billing_accounts
   where user_id = p_user_id
     and anonymized_at is null
   limit 1;

  select *
    into v_grant
    from public.access_grants
   where user_id = p_user_id
     and status in ('active', 'grace')
     and revoked_at is null
     and (access_until is null or access_until > now())
   order by case status when 'active' then 0 else 1 end, access_until desc nulls first
   limit 1;

  if to_regclass('public.settings') is not null then
    execute 'select onboarding_completed_at from public.settings where user_id = $1 limit 1'
      into v_onboarding
      using p_user_id;
  end if;

  select execute_at
    into v_deletion_at
    from public.account_deletion_requests
   where user_id = p_user_id
     and status in ('scheduling', 'scheduled', 'processing', 'failed')
   limit 1;

  return jsonb_build_object(
    'billing', case when v_billing.id is null then null else jsonb_build_object(
      'stripe_customer_id', v_billing.stripe_customer_id,
      'stripe_subscription_id', v_billing.stripe_subscription_id,
      'price_id', v_billing.price_id,
      'entitlement_eligible', v_billing.entitlement_eligible,
      'subscription_status', v_billing.subscription_status,
      'current_period_end', v_billing.current_period_end,
      'grace_until', v_billing.grace_until,
      'scheduled_cancel_at', v_billing.scheduled_cancel_at,
      'cancel_at_period_end', v_billing.cancel_at_period_end,
      'access_blocked_reason', v_billing.access_blocked_reason
    ) end,
    'access', jsonb_build_object(
      'entitled', v_grant.id is not null,
      'state', case
        when v_grant.id is null then 'inactive'
        when v_grant.source = 'manual' and v_grant.status = 'active' then 'complimentary'
        else v_grant.status
      end,
      'access_until', v_grant.access_until
    ),
    'onboarding_completed_at', v_onboarding,
    'deletion_scheduled_for', v_deletion_at
  );
end;
$$;

revoke all on public.stripe_access_incidents from anon, authenticated;
revoke all on function public.refresh_stripe_access_block(text)
  from public, anon, authenticated;
revoke all on function public.record_stripe_access_incident(text, text, text, text, text, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.record_stripe_invoice_paid(text, text, text, timestamptz)
  from public, anon, authenticated;

grant execute on function public.record_stripe_access_incident(text, text, text, text, text, text, text, timestamptz)
  to service_role;
grant execute on function public.record_stripe_invoice_paid(text, text, text, timestamptz)
  to service_role;
