create extension if not exists pgcrypto;

create table if not exists public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  claim_email text,
  price_id text,
  entitlement_eligible boolean not null default false,
  subscription_status text not null default 'none'
    check (subscription_status in (
      'none', 'incomplete', 'incomplete_expired', 'trialing', 'active',
      'past_due', 'canceled', 'unpaid', 'paused'
    )),
  current_period_end timestamptz,
  grace_until timestamptz,
  scheduled_cancel_at timestamptz,
  cancel_at_period_end boolean not null default false,
  operation_id uuid,
  operation_expires_at timestamptz,
  last_stripe_event_id text,
  last_stripe_event_created_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (claim_email is null or claim_email = lower(btrim(claim_email))),
  check (user_id is null or claim_email is null)
);

create index if not exists billing_accounts_claim_email_idx
  on public.billing_accounts (claim_email)
  where user_id is null and anonymized_at is null;

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('stripe', 'manual')),
  source_key text not null,
  status text not null check (status in ('active', 'grace', 'revoked')),
  access_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_key)
);

create index if not exists access_grants_user_idx
  on public.access_grants (user_id, status, access_until);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  event_created_at timestamptz not null,
  payload_sha256 text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  locked_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'processing'
    check (status in ('scheduling', 'scheduled', 'processing', 'data_deleted', 'completed', 'failed')),
  execute_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  locked_at timestamptz,
  failure_code text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  anonymized_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists account_deletion_requests_user_idx
  on public.account_deletion_requests (user_id, requested_at desc);

create unique index if not exists account_deletion_requests_active_user_idx
  on public.account_deletion_requests (user_id)
  where user_id is not null;

create index if not exists account_deletion_requests_due_idx
  on public.account_deletion_requests (status, execute_at);

alter table if exists public.settings
  add column if not exists onboarding_completed_at timestamptz;

alter table public.billing_accounts enable row level security;
alter table public.access_grants enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy billing_accounts_select_own
  on public.billing_accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy access_grants_select_own
  on public.access_grants
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy account_deletion_requests_select_own
  on public.account_deletion_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.zynergia_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists billing_accounts_set_updated_at on public.billing_accounts;
create trigger billing_accounts_set_updated_at
before update on public.billing_accounts
for each row execute function public.zynergia_set_updated_at();

drop trigger if exists access_grants_set_updated_at on public.access_grants;
create trigger access_grants_set_updated_at
before update on public.access_grants
for each row execute function public.zynergia_set_updated_at();

drop trigger if exists stripe_webhook_events_set_updated_at on public.stripe_webhook_events;
create trigger stripe_webhook_events_set_updated_at
before update on public.stripe_webhook_events
for each row execute function public.zynergia_set_updated_at();

drop trigger if exists account_deletion_requests_set_updated_at on public.account_deletion_requests;
create trigger account_deletion_requests_set_updated_at
before update on public.account_deletion_requests
for each row execute function public.zynergia_set_updated_at();

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

  if v_account.entitlement_eligible
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

create or replace function public.sync_stripe_billing_account(
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_user_id uuid,
  p_claim_email text,
  p_price_id text,
  p_subscription_status text,
  p_current_period_end timestamptz,
  p_grace_until timestamptz,
  p_cancel_at_period_end boolean,
  p_scheduled_cancel_at timestamptz,
  p_entitlement_eligible boolean,
  p_operation_id uuid,
  p_last_event_id text,
  p_event_created_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.billing_accounts%rowtype;
  v_candidate_user uuid;
  v_owner uuid;
  v_email text;
  v_grace_until timestamptz;
begin
  if p_stripe_customer_id is null or p_stripe_customer_id !~ '^cus_' then
    raise exception 'invalid_stripe_customer_id';
  end if;

  if p_subscription_status not in (
    'none', 'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused'
  ) then
    raise exception 'invalid_subscription_status';
  end if;

  v_email := nullif(lower(btrim(p_claim_email)), '');
  if p_user_id is not null and exists (select 1 from auth.users where id = p_user_id) then
    v_candidate_user := p_user_id;
  end if;

  select *
    into v_account
    from public.billing_accounts
   where stripe_customer_id = p_stripe_customer_id
   for update;

  if found then
    if p_event_created_at is not null
       and v_account.last_stripe_event_created_at is not null
       and p_event_created_at < v_account.last_stripe_event_created_at then
      return jsonb_build_object(
        'status', 'ignored_stale_event',
        'stripe_customer_id', v_account.stripe_customer_id,
        'stripe_subscription_id', v_account.stripe_subscription_id
      );
    end if;

    if v_account.anonymized_at is not null then
      update public.billing_accounts
         set stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id),
             price_id = p_price_id,
             entitlement_eligible = coalesce(p_entitlement_eligible, false),
             subscription_status = p_subscription_status,
             current_period_end = p_current_period_end,
             grace_until = null,
             scheduled_cancel_at = p_scheduled_cancel_at,
             cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
             last_stripe_event_id = coalesce(p_last_event_id, last_stripe_event_id),
             last_stripe_event_created_at = coalesce(p_event_created_at, last_stripe_event_created_at),
             user_id = null,
             claim_email = null,
             operation_id = null,
             operation_expires_at = null
       where id = v_account.id
       returning * into v_account;
      perform public.refresh_stripe_access_grant(p_stripe_customer_id);
      return jsonb_build_object('status', 'anonymized', 'stripe_customer_id', p_stripe_customer_id);
    end if;

    v_owner := coalesce(v_account.user_id, v_candidate_user);
    if v_owner is null then
      v_email := coalesce(v_email, v_account.claim_email);
    else
      v_email := null;
    end if;

    if p_subscription_status = 'past_due' then
      v_grace_until := case
        when v_account.subscription_status = 'past_due'
          then coalesce(v_account.grace_until, p_grace_until)
        else p_grace_until
      end;
    else
      v_grace_until := null;
    end if;

    update public.billing_accounts
       set user_id = v_owner,
           stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id),
           claim_email = v_email,
           price_id = p_price_id,
           entitlement_eligible = coalesce(p_entitlement_eligible, false),
           subscription_status = p_subscription_status,
           current_period_end = p_current_period_end,
           grace_until = v_grace_until,
           scheduled_cancel_at = p_scheduled_cancel_at,
           cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
           operation_id = coalesce(p_operation_id, operation_id),
           operation_expires_at = case
             when p_subscription_status in ('active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete')
               then null
             else operation_expires_at
           end,
           last_stripe_event_id = coalesce(p_last_event_id, last_stripe_event_id),
           last_stripe_event_created_at = coalesce(p_event_created_at, last_stripe_event_created_at)
     where id = v_account.id
     returning * into v_account;
  else
    insert into public.billing_accounts (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      claim_email,
      price_id,
      entitlement_eligible,
      subscription_status,
      current_period_end,
      grace_until,
      scheduled_cancel_at,
      cancel_at_period_end,
      operation_id,
      operation_expires_at,
      last_stripe_event_id,
      last_stripe_event_created_at
    ) values (
      v_candidate_user,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      case when v_candidate_user is null then v_email else null end,
      p_price_id,
      coalesce(p_entitlement_eligible, false),
      p_subscription_status,
      p_current_period_end,
      case when p_subscription_status = 'past_due' then p_grace_until else null end,
      p_scheduled_cancel_at,
      coalesce(p_cancel_at_period_end, false),
      p_operation_id,
      null,
      p_last_event_id,
      p_event_created_at
    )
    returning * into v_account;
  end if;

  perform public.refresh_stripe_access_grant(p_stripe_customer_id);

  return jsonb_build_object(
    'status', 'synced',
    'stripe_customer_id', v_account.stripe_customer_id,
    'stripe_subscription_id', v_account.stripe_subscription_id,
    'subscription_status', v_account.subscription_status
  );
end;
$$;

create or replace function public.claim_billing_account(
  p_user_id uuid,
  p_email text,
  p_expected_stripe_customer_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := nullif(lower(btrim(p_email)), '');
  v_account public.billing_accounts%rowtype;
begin
  if v_email is null then
    raise exception 'verified_email_required';
  end if;
  if p_user_id is null or not exists (
    select 1
      from auth.users
     where id = p_user_id
       and lower(email) = v_email
       and email_confirmed_at is not null
  ) then
    raise exception 'invalid_user';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));

  select *
    into v_account
    from public.billing_accounts
   where user_id = p_user_id
     and anonymized_at is null
   for update;

  if found then
    if not v_account.entitlement_eligible
       and v_account.subscription_status in ('active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete') then
      return jsonb_build_object('status', 'conflict', 'reason', 'unsupported_price');
    end if;
    return jsonb_build_object(
      'status', 'existing',
      'stripe_customer_id', v_account.stripe_customer_id,
      'stripe_subscription_id', v_account.stripe_subscription_id
    );
  end if;

  if p_expected_stripe_customer_id is null then
    return jsonb_build_object('status', 'validation_required');
  end if;
  if p_expected_stripe_customer_id !~ '^cus_' then
    raise exception 'invalid_expected_stripe_customer_id';
  end if;

  select *
    into v_account
    from public.billing_accounts
   where stripe_customer_id = p_expected_stripe_customer_id
   for update;

  if not found or v_account.anonymized_at is not null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_account.user_id is not null then
    return jsonb_build_object('status', 'conflict', 'reason', 'billing_account_already_owned');
  end if;
  if v_account.claim_email is distinct from v_email then
    return jsonb_build_object('status', 'conflict', 'reason', 'validated_customer_email_mismatch');
  end if;

  if not v_account.entitlement_eligible
     and v_account.subscription_status in ('active', 'trialing', 'past_due', 'unpaid', 'paused', 'incomplete') then
    return jsonb_build_object('status', 'conflict', 'reason', 'unsupported_price');
  end if;

  update public.billing_accounts
     set user_id = p_user_id,
         claim_email = null
   where id = v_account.id
     and user_id is null
   returning * into v_account;

  if not found then
    return jsonb_build_object('status', 'conflict', 'reason', 'billing_claim_race');
  end if;

  perform public.refresh_stripe_access_grant(v_account.stripe_customer_id);

  return jsonb_build_object(
    'status', 'claimed',
    'stripe_customer_id', v_account.stripe_customer_id,
    'stripe_subscription_id', v_account.stripe_subscription_id
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
      'cancel_at_period_end', v_billing.cancel_at_period_end
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

create or replace function public.reserve_checkout_operation(p_user_id uuid, p_operation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.billing_accounts%rowtype;
begin
  if p_user_id is null or p_operation_id is null then
    raise exception 'invalid_checkout_operation';
  end if;

  select *
    into v_account
    from public.billing_accounts
   where user_id = p_user_id and anonymized_at is null
   for update;

  if not found then
    raise exception 'billing_account_missing';
  end if;
  if v_account.operation_id = p_operation_id then
    return jsonb_build_object('status', 'reserved');
  end if;
  if v_account.operation_id is not null and v_account.operation_expires_at > now() then
    return jsonb_build_object('status', 'conflict');
  end if;

  update public.billing_accounts
     set operation_id = p_operation_id,
         operation_expires_at = now() + interval '24 hours'
   where id = v_account.id;

  return jsonb_build_object('status', 'reserved');
end;
$$;

create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_payload_sha256 text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
  v_existing_hash text;
begin
  if p_event_id is null or p_payload_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_webhook_event';
  end if;

  insert into public.stripe_webhook_events (
    event_id, event_type, event_created_at, payload_sha256
  ) values (
    p_event_id, p_event_type, p_event_created_at, p_payload_sha256
  )
  on conflict (event_id) do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    return true;
  end if;

  select payload_sha256
    into v_existing_hash
    from public.stripe_webhook_events
   where event_id = p_event_id;
  if v_existing_hash is distinct from p_payload_sha256 then
    raise exception 'webhook_event_hash_mismatch';
  end if;

  update public.stripe_webhook_events
     set status = 'processing',
         attempt_count = attempt_count + 1,
         locked_at = now(),
         processed_at = null,
         last_error = null
   where event_id = p_event_id
     and (
       status = 'failed'
       or (status = 'processing' and locked_at < now() - interval '5 minutes')
     );
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

create or replace function public.complete_stripe_webhook_event(p_event_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.stripe_webhook_events
     set status = 'processed', processed_at = now(), last_error = null
   where event_id = p_event_id and status = 'processing';
$$;

create or replace function public.fail_stripe_webhook_event(p_event_id text, p_last_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.stripe_webhook_events
     set status = 'failed', last_error = left(p_last_error, 500)
   where event_id = p_event_id and status = 'processing';
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

create or replace function public.schedule_account_deletion(
  p_request_id uuid,
  p_execute_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  if p_execute_at is null then
    raise exception 'deletion_execute_at_required';
  end if;

  update public.account_deletion_requests
     set status = 'scheduled',
         execute_at = p_execute_at,
         locked_at = null,
         failure_code = null
   where id = p_request_id
     and status in ('scheduling', 'processing', 'failed', 'scheduled');
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'deletion_request_not_schedulable';
  end if;
end;
$$;

create or replace function public.claim_due_account_deletions(p_limit integer)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with candidates as materialized (
    select id
      from public.account_deletion_requests
     where (
       status = 'scheduling'
       or (status = 'scheduled' and execute_at <= now())
       or (status = 'failed' and updated_at < now() - interval '5 minutes')
       or (status = 'processing' and locked_at < now() - interval '15 minutes')
       or status = 'data_deleted'
     )
     order by execute_at asc nulls first, requested_at asc
     for update skip locked
     limit least(greatest(coalesce(p_limit, 25), 1), 100)
  ), claimed as (
    update public.account_deletion_requests as request
       set status = 'processing',
           attempt_count = attempt_count + 1,
           locked_at = now(),
           failure_code = null
      from candidates
     where request.id = candidates.id
    returning request.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'request_id', id,
    'operation_id', operation_id,
    'user_id', user_id,
    'stripe_customer_id', stripe_customer_id,
    'stripe_subscription_id', stripe_subscription_id,
    'execute_at', execute_at,
    'mode', case when execute_at > now() then 'schedule' else 'execute' end
  )), '[]'::jsonb)
  from claimed;
$$;

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

  if to_regclass('public.partners') is not null
     and exists (
       select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'partners' and column_name = 'partner_user_id'
     ) then
    execute 'update public.partners set partner_user_id = null where partner_user_id = $1'
      using p_user_id;
  end if;

  if to_regclass('public.settings') is not null
     and exists (
       select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'settings' and column_name = 'parent_id'
     ) then
    execute 'update public.settings set parent_id = null where parent_id = $1'
      using p_user_id;
  end if;

  foreach v_table in array array[
    'tasks', 'sales', 'partners', 'contacts', 'tags', 'product_links',
    'user_templates', 'user_products', 'message_templates', 'notifications', 'settings'
  ] loop
    if to_regclass('public.' || v_table) is not null
       and exists (
         select 1 from information_schema.columns
          where table_schema = 'public' and table_name = v_table and column_name = 'user_id'
       ) then
      execute format('delete from public.%I where user_id = $1', v_table)
        using p_user_id;
    end if;
  end loop;

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

create or replace function public.fail_account_deletion(p_request_id uuid, p_failure_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.account_deletion_requests
     set status = 'failed', failure_code = left(p_failure_code, 100), locked_at = null
   where id = p_request_id and status <> 'completed';
$$;

create or replace function public.complete_account_deletion(p_request_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.account_deletion_requests
     set status = 'completed',
         user_id = null,
         stripe_customer_id = null,
         stripe_subscription_id = null,
         failure_code = null,
         completed_at = now(),
         anonymized_at = now(),
         locked_at = null
   where id = p_request_id;
$$;

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
  if to_regclass('public.settings') is null then
    raise exception 'settings_table_missing';
  end if;

  execute 'update public.settings set onboarding_completed_at = coalesce(onboarding_completed_at, $1) where user_id = $2'
    using v_completed_at, v_user_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'settings_row_missing';
  end if;

  execute 'select onboarding_completed_at from public.settings where user_id = $1'
    into v_completed_at
    using v_user_id;
  return v_completed_at;
end;
$$;

revoke all on public.billing_accounts from anon, authenticated;
revoke all on public.access_grants from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;
revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.billing_accounts to authenticated;
grant select on public.access_grants to authenticated;
grant select on public.account_deletion_requests to authenticated;

revoke all on function public.zynergia_set_updated_at() from public, anon, authenticated;

revoke all on function public.refresh_stripe_access_grant(text) from public, anon, authenticated;
revoke all on function public.sync_stripe_billing_account(text, text, uuid, text, text, text, timestamptz, timestamptz, boolean, timestamptz, boolean, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_billing_account(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_access_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.reserve_checkout_operation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_stripe_webhook_event(text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.complete_stripe_webhook_event(text) from public, anon, authenticated;
revoke all on function public.fail_stripe_webhook_event(text, text) from public, anon, authenticated;
revoke all on function public.begin_account_deletion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.schedule_account_deletion(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_due_account_deletions(integer) from public, anon, authenticated;
revoke all on function public.delete_user_data(uuid, uuid) from public, anon, authenticated;
revoke all on function public.fail_account_deletion(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.complete_onboarding() from public, anon;

grant execute on function public.refresh_stripe_access_grant(text) to service_role;
grant execute on function public.sync_stripe_billing_account(text, text, uuid, text, text, text, timestamptz, timestamptz, boolean, timestamptz, boolean, uuid, text, timestamptz) to service_role;
grant execute on function public.claim_billing_account(uuid, text, text) to service_role;
grant execute on function public.get_access_snapshot(uuid) to service_role;
grant execute on function public.reserve_checkout_operation(uuid, uuid) to service_role;
grant execute on function public.claim_stripe_webhook_event(text, text, timestamptz, text) to service_role;
grant execute on function public.complete_stripe_webhook_event(text) to service_role;
grant execute on function public.fail_stripe_webhook_event(text, text) to service_role;
grant execute on function public.begin_account_deletion(uuid, uuid) to service_role;
grant execute on function public.schedule_account_deletion(uuid, timestamptz) to service_role;
grant execute on function public.claim_due_account_deletions(integer) to service_role;
grant execute on function public.delete_user_data(uuid, uuid) to service_role;
grant execute on function public.fail_account_deletion(uuid, text) to service_role;
grant execute on function public.complete_account_deletion(uuid) to service_role;
grant execute on function public.complete_onboarding() to authenticated;
