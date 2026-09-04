create table if not exists public.stripe_connect_anomalies (
  stripe_charge_id text primary key check (stripe_charge_id ~ '^ch_'),
  anomaly_kind text not null check (anomaly_kind in ('missing_transfer')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  last_event_id text not null,
  last_event_created_at timestamptz not null,
  last_error text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_connect_anomalies_open_idx
  on public.stripe_connect_anomalies (status)
  where status = 'open';

alter table public.stripe_connect_anomalies enable row level security;

drop trigger if exists stripe_connect_anomalies_set_updated_at
  on public.stripe_connect_anomalies;
create trigger stripe_connect_anomalies_set_updated_at
before update on public.stripe_connect_anomalies
for each row execute function public.zynergia_set_updated_at();

create or replace function public.record_stripe_connect_anomaly(
  p_stripe_charge_id text,
  p_anomaly_kind text,
  p_event_id text,
  p_event_created_at timestamptz,
  p_last_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_stripe_charge_id is null or p_stripe_charge_id !~ '^ch_'
     or p_anomaly_kind <> 'missing_transfer'
     or p_event_id is null or btrim(p_event_id) = ''
     or p_event_created_at is null then
    raise exception 'invalid_connect_anomaly';
  end if;

  insert into public.stripe_connect_anomalies (
    stripe_charge_id, anomaly_kind, status, last_event_id,
    last_event_created_at, last_error, resolved_at
  ) values (
    p_stripe_charge_id, p_anomaly_kind, 'open', p_event_id,
    p_event_created_at, left(coalesce(p_last_error, 'unknown'), 500), null
  ) on conflict (stripe_charge_id) do update
    set anomaly_kind = excluded.anomaly_kind,
        status = 'open',
        last_event_id = excluded.last_event_id,
        last_event_created_at = excluded.last_event_created_at,
        last_error = excluded.last_error,
        resolved_at = null;
end;
$$;

create or replace function public.resolve_stripe_connect_anomaly(
  p_stripe_charge_id text,
  p_event_id text,
  p_event_created_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_stripe_charge_id is null or p_stripe_charge_id !~ '^ch_'
     or p_event_id is null or btrim(p_event_id) = ''
     or p_event_created_at is null then
    raise exception 'invalid_connect_anomaly_resolution';
  end if;

  update public.stripe_connect_anomalies
     set status = 'resolved',
         last_event_id = p_event_id,
         last_event_created_at = p_event_created_at,
         last_error = null,
         resolved_at = now()
   where stripe_charge_id = p_stripe_charge_id;
end;
$$;

create or replace function public.assert_stripe_connect_checkout_ready()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
      from public.stripe_connect_charges
     where reconciliation_status <> 'balanced'
  ) or exists (
    select 1
      from public.stripe_connect_anomalies
     where status = 'open'
  ) then
    raise exception 'stripe_connect_ledger_unhealthy';
  end if;
end;
$$;

revoke all on table public.stripe_connect_anomalies from public, anon, authenticated;
revoke all on function public.record_stripe_connect_anomaly(
  text, text, text, timestamptz, text
) from public, anon, authenticated;
revoke all on function public.resolve_stripe_connect_anomaly(
  text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.assert_stripe_connect_checkout_ready()
  from public, anon, authenticated;

grant execute on function public.record_stripe_connect_anomaly(
  text, text, text, timestamptz, text
) to service_role;
grant execute on function public.resolve_stripe_connect_anomaly(
  text, text, timestamptz
) to service_role;
grant execute on function public.assert_stripe_connect_checkout_ready()
  to service_role;
