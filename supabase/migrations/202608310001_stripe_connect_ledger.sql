create table if not exists public.stripe_connect_charges (
  stripe_charge_id text primary key check (stripe_charge_id ~ '^ch_'),
  stripe_invoice_id text not null check (stripe_invoice_id ~ '^in_'),
  stripe_payment_intent_id text not null check (stripe_payment_intent_id ~ '^pi_'),
  stripe_customer_id text not null check (stripe_customer_id ~ '^cus_'),
  stripe_subscription_id text not null check (stripe_subscription_id ~ '^sub_'),
  stripe_original_transfer_id text not null unique check (stripe_original_transfer_id ~ '^tr_'),
  stripe_destination_account_id text not null check (stripe_destination_account_id ~ '^acct_'),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  charge_amount bigint not null check (charge_amount > 0),
  original_transfer_amount bigint not null check (
    original_transfer_amount > 0 and original_transfer_amount <= charge_amount
  ),
  effective_refund_amount bigint not null default 0 check (
    effective_refund_amount >= 0 and effective_refund_amount <= charge_amount
  ),
  financial_dispute_amount bigint not null default 0 check (
    financial_dispute_amount >= 0 and financial_dispute_amount <= charge_amount
  ),
  desired_clawback_amount bigint not null default 0 check (desired_clawback_amount >= 0),
  reconciled_net_clawback_amount bigint not null default 0,
  reconciliation_status text not null default 'pending'
    check (reconciliation_status in ('pending', 'balanced', 'failed')),
  last_event_id text not null,
  last_event_created_at timestamptz not null,
  last_error text,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (desired_clawback_amount <= original_transfer_amount)
);

create index if not exists stripe_connect_charges_invoice_idx
  on public.stripe_connect_charges (stripe_invoice_id);

create table if not exists public.stripe_connect_disputes (
  stripe_dispute_id text primary key check (stripe_dispute_id ~ '^(dp_|du_)'),
  stripe_charge_id text not null
    references public.stripe_connect_charges(stripe_charge_id) on delete cascade,
  amount bigint not null check (amount > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  status text not null check (status in (
    'warning_needs_response', 'warning_under_review', 'warning_closed',
    'needs_response', 'under_review', 'won', 'lost', 'prevented'
  )),
  financially_blocking boolean not null,
  last_event_id text not null,
  last_event_created_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_connect_disputes_charge_idx
  on public.stripe_connect_disputes (stripe_charge_id, financially_blocking);

create table if not exists public.stripe_connect_transfers (
  stripe_transfer_id text primary key check (stripe_transfer_id ~ '^tr_'),
  stripe_charge_id text not null
    references public.stripe_connect_charges(stripe_charge_id) on delete cascade,
  kind text not null check (kind in ('original', 'restoration')),
  amount bigint not null check (amount > 0),
  amount_reversed bigint not null default 0 check (
    amount_reversed >= 0 and amount_reversed <= amount
  ),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  stripe_destination_account_id text not null check (stripe_destination_account_id ~ '^acct_'),
  stripe_created_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stripe_connect_transfers_charge_idx
  on public.stripe_connect_transfers (stripe_charge_id, kind, stripe_created_at);

create table if not exists public.stripe_connect_adjustments (
  id uuid primary key default gen_random_uuid(),
  operation_key text not null unique,
  stripe_charge_id text not null
    references public.stripe_connect_charges(stripe_charge_id) on delete cascade,
  kind text not null check (kind in ('reversal', 'restoration')),
  source_transfer_id text check (source_transfer_id is null or source_transfer_id ~ '^tr_'),
  stripe_object_id text not null unique check (stripe_object_id ~ '^(tr_|trr_)'),
  amount bigint not null check (amount > 0),
  event_id text not null,
  created_at timestamptz not null default now(),
  check (
    (kind = 'reversal' and source_transfer_id is not null and stripe_object_id ~ '^trr_')
    or (kind = 'restoration' and source_transfer_id is null and stripe_object_id ~ '^tr_')
  )
);

create index if not exists stripe_connect_adjustments_charge_idx
  on public.stripe_connect_adjustments (stripe_charge_id, created_at);

alter table public.stripe_connect_charges enable row level security;
alter table public.stripe_connect_disputes enable row level security;
alter table public.stripe_connect_transfers enable row level security;
alter table public.stripe_connect_adjustments enable row level security;

drop trigger if exists stripe_connect_charges_set_updated_at on public.stripe_connect_charges;
create trigger stripe_connect_charges_set_updated_at
before update on public.stripe_connect_charges
for each row execute function public.zynergia_set_updated_at();

drop trigger if exists stripe_connect_disputes_set_updated_at on public.stripe_connect_disputes;
create trigger stripe_connect_disputes_set_updated_at
before update on public.stripe_connect_disputes
for each row execute function public.zynergia_set_updated_at();

drop trigger if exists stripe_connect_transfers_set_updated_at on public.stripe_connect_transfers;
create trigger stripe_connect_transfers_set_updated_at
before update on public.stripe_connect_transfers
for each row execute function public.zynergia_set_updated_at();

create or replace function public.get_stripe_connect_charge_state(p_stripe_charge_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_charge public.stripe_connect_charges%rowtype;
  v_transfers jsonb;
  v_forward bigint;
  v_reversed bigint;
  v_net bigint;
begin
  select * into v_charge
    from public.stripe_connect_charges
   where stripe_charge_id = p_stripe_charge_id;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by
           case when t.kind = 'restoration' then 0 else 1 end,
           t.stripe_created_at desc, t.stripe_transfer_id), '[]'::jsonb),
         coalesce(sum(t.amount), 0),
         coalesce(sum(t.amount_reversed), 0)
    into v_transfers, v_forward, v_reversed
    from public.stripe_connect_transfers t
   where t.stripe_charge_id = p_stripe_charge_id;

  v_net := v_charge.original_transfer_amount - (v_forward - v_reversed);
  return jsonb_build_object(
    'charge', to_jsonb(v_charge),
    'transfers', v_transfers,
    'forward_amount', v_forward,
    'reversed_amount', v_reversed,
    'net_clawback_amount', v_net
  );
end;
$$;

create or replace function public.sync_stripe_connect_charge_snapshot(
  p_stripe_charge_id text,
  p_stripe_invoice_id text,
  p_stripe_payment_intent_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_original_transfer_id text,
  p_stripe_destination_account_id text,
  p_currency text,
  p_charge_amount bigint,
  p_original_transfer_amount bigint,
  p_original_transfer_amount_reversed bigint,
  p_original_transfer_created_at timestamptz,
  p_effective_refund_amount bigint,
  p_financial_dispute_amount bigint,
  p_desired_clawback_amount bigint,
  p_disputes jsonb,
  p_event_id text,
  p_event_created_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.stripe_connect_charges%rowtype;
  v_dispute jsonb;
  v_calculated_disputes bigint := 0;
  v_status text;
  v_blocking boolean;
begin
  if p_stripe_charge_id !~ '^ch_' or p_stripe_invoice_id !~ '^in_'
     or p_stripe_payment_intent_id !~ '^pi_' or p_stripe_customer_id !~ '^cus_'
     or p_stripe_subscription_id !~ '^sub_' or p_stripe_original_transfer_id !~ '^tr_'
     or p_stripe_destination_account_id !~ '^acct_' or p_currency !~ '^[a-z]{3}$'
     or p_charge_amount <= 0 or p_original_transfer_amount <= 0
     or p_original_transfer_amount > p_charge_amount
     or p_original_transfer_amount_reversed < 0
     or p_original_transfer_amount_reversed > p_original_transfer_amount
     or p_effective_refund_amount < 0 or p_effective_refund_amount > p_charge_amount
     or p_financial_dispute_amount < 0 or p_financial_dispute_amount > p_charge_amount
     or p_desired_clawback_amount < 0 or p_desired_clawback_amount > p_original_transfer_amount
     or p_original_transfer_created_at is null or p_event_id is null or p_event_created_at is null
     or jsonb_typeof(p_disputes) is distinct from 'array' then
    raise exception 'invalid_connect_charge_snapshot';
  end if;

  for v_dispute in select value from jsonb_array_elements(p_disputes)
  loop
    v_status := v_dispute->>'status';
    -- Access is blocked for open disputes in a separate canonical incident.
    -- Financial clawback waits for `lost` so US -> MX cross-border reversals
    -- are not attempted while Stripe can prohibit them.
    v_blocking := v_status = 'lost';
    if coalesce(v_dispute->>'id', '') !~ '^(dp_|du_)'
       or coalesce((v_dispute->>'amount')::bigint, 0) <= 0
       or v_dispute->>'currency' is distinct from p_currency
       or v_status not in (
         'warning_needs_response', 'warning_under_review', 'warning_closed',
         'needs_response', 'under_review', 'won', 'lost', 'prevented'
       ) then
      raise exception 'invalid_connect_dispute_snapshot';
    end if;
    if v_blocking then
      v_calculated_disputes := least(
        p_charge_amount,
        v_calculated_disputes + (v_dispute->>'amount')::bigint
      );
    end if;
  end loop;

  if v_calculated_disputes <> p_financial_dispute_amount then
    raise exception 'connect_dispute_total_mismatch';
  end if;
  if p_desired_clawback_amount <> round(
    p_original_transfer_amount::numeric *
    least(p_charge_amount, p_effective_refund_amount + p_financial_dispute_amount)::numeric /
    p_charge_amount::numeric
  )::bigint then
    raise exception 'connect_clawback_total_mismatch';
  end if;

  select * into v_existing
    from public.stripe_connect_charges
   where stripe_charge_id = p_stripe_charge_id
   for update;
  if found and (
    v_existing.stripe_invoice_id is distinct from p_stripe_invoice_id
    or v_existing.stripe_payment_intent_id is distinct from p_stripe_payment_intent_id
    or v_existing.stripe_customer_id is distinct from p_stripe_customer_id
    or v_existing.stripe_subscription_id is distinct from p_stripe_subscription_id
    or v_existing.stripe_original_transfer_id is distinct from p_stripe_original_transfer_id
    or v_existing.stripe_destination_account_id is distinct from p_stripe_destination_account_id
    or v_existing.currency is distinct from p_currency
    or v_existing.charge_amount is distinct from p_charge_amount
    or v_existing.original_transfer_amount is distinct from p_original_transfer_amount
  ) then
    raise exception 'connect_charge_identity_mismatch';
  end if;

  insert into public.stripe_connect_charges (
    stripe_charge_id, stripe_invoice_id, stripe_payment_intent_id,
    stripe_customer_id, stripe_subscription_id, stripe_original_transfer_id,
    stripe_destination_account_id, currency, charge_amount, original_transfer_amount,
    effective_refund_amount, financial_dispute_amount, desired_clawback_amount,
    reconciliation_status, last_event_id, last_event_created_at, last_error
  ) values (
    p_stripe_charge_id, p_stripe_invoice_id, p_stripe_payment_intent_id,
    p_stripe_customer_id, p_stripe_subscription_id, p_stripe_original_transfer_id,
    p_stripe_destination_account_id, p_currency, p_charge_amount, p_original_transfer_amount,
    p_effective_refund_amount, p_financial_dispute_amount, p_desired_clawback_amount,
    'pending', p_event_id, p_event_created_at, null
  ) on conflict (stripe_charge_id) do update
    set stripe_invoice_id = excluded.stripe_invoice_id,
        stripe_payment_intent_id = excluded.stripe_payment_intent_id,
        stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_original_transfer_id = excluded.stripe_original_transfer_id,
        stripe_destination_account_id = excluded.stripe_destination_account_id,
        currency = excluded.currency,
        charge_amount = excluded.charge_amount,
        original_transfer_amount = excluded.original_transfer_amount,
        effective_refund_amount = excluded.effective_refund_amount,
        financial_dispute_amount = excluded.financial_dispute_amount,
        desired_clawback_amount = excluded.desired_clawback_amount,
        reconciliation_status = 'pending',
        last_event_id = excluded.last_event_id,
        last_event_created_at = excluded.last_event_created_at,
        last_error = null;

  insert into public.stripe_connect_transfers (
    stripe_transfer_id, stripe_charge_id, kind, amount, amount_reversed,
    currency, stripe_destination_account_id, stripe_created_at, last_seen_at
  ) values (
    p_stripe_original_transfer_id, p_stripe_charge_id, 'original',
    p_original_transfer_amount, p_original_transfer_amount_reversed,
    p_currency, p_stripe_destination_account_id, p_original_transfer_created_at, now()
  ) on conflict (stripe_transfer_id) do update
    set amount = excluded.amount,
        amount_reversed = excluded.amount_reversed,
        currency = excluded.currency,
        stripe_destination_account_id = excluded.stripe_destination_account_id,
        last_seen_at = now();

  delete from public.stripe_connect_disputes d
   where d.stripe_charge_id = p_stripe_charge_id
     and not exists (
       select 1 from jsonb_array_elements(p_disputes) item
        where item->>'id' = d.stripe_dispute_id
     );

  for v_dispute in select value from jsonb_array_elements(p_disputes)
  loop
    v_status := v_dispute->>'status';
    v_blocking := v_status = 'lost';
    insert into public.stripe_connect_disputes (
      stripe_dispute_id, stripe_charge_id, amount, currency, status,
      financially_blocking, last_event_id, last_event_created_at
    ) values (
      v_dispute->>'id', p_stripe_charge_id, (v_dispute->>'amount')::bigint,
      p_currency, v_status, v_blocking, p_event_id, p_event_created_at
    ) on conflict (stripe_dispute_id) do update
      set stripe_charge_id = excluded.stripe_charge_id,
          amount = excluded.amount,
          currency = excluded.currency,
          status = excluded.status,
          financially_blocking = excluded.financially_blocking,
          last_event_id = excluded.last_event_id,
          last_event_created_at = excluded.last_event_created_at;
  end loop;

  return jsonb_build_object(
    'status', 'synced',
    'state', public.get_stripe_connect_charge_state(p_stripe_charge_id)
  );
end;
$$;

create or replace function public.sync_stripe_connect_transfer_snapshot(
  p_stripe_charge_id text,
  p_stripe_transfer_id text,
  p_kind text,
  p_amount bigint,
  p_amount_reversed bigint,
  p_currency text,
  p_destination_account_id text,
  p_transfer_created_at timestamptz,
  p_reversals jsonb,
  p_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_charge public.stripe_connect_charges%rowtype;
  v_existing public.stripe_connect_transfers%rowtype;
  v_reversal jsonb;
  v_reversal_total bigint := 0;
begin
  select * into v_charge
    from public.stripe_connect_charges
   where stripe_charge_id = p_stripe_charge_id
   for update;
  if not found then raise exception 'connect_charge_missing'; end if;
  if p_stripe_transfer_id !~ '^tr_' or p_kind not in ('original', 'restoration')
     or p_amount <= 0 or p_amount_reversed < 0 or p_amount_reversed > p_amount
     or p_currency is distinct from v_charge.currency
     or p_destination_account_id is distinct from v_charge.stripe_destination_account_id
     or p_transfer_created_at is null or p_event_id is null
     or jsonb_typeof(p_reversals) is distinct from 'array' then
    raise exception 'invalid_connect_transfer_snapshot';
  end if;
  if p_kind = 'original' and p_stripe_transfer_id is distinct from v_charge.stripe_original_transfer_id then
    raise exception 'connect_original_transfer_mismatch';
  end if;

  select * into v_existing
    from public.stripe_connect_transfers
   where stripe_transfer_id = p_stripe_transfer_id;
  if found and (
    v_existing.stripe_charge_id is distinct from p_stripe_charge_id
    or v_existing.kind is distinct from p_kind
    or v_existing.amount is distinct from p_amount
    or v_existing.currency is distinct from p_currency
    or v_existing.stripe_destination_account_id is distinct from p_destination_account_id
    or v_existing.stripe_created_at is distinct from p_transfer_created_at
  ) then
    raise exception 'connect_transfer_identity_mismatch';
  end if;

  insert into public.stripe_connect_transfers (
    stripe_transfer_id, stripe_charge_id, kind, amount, amount_reversed,
    currency, stripe_destination_account_id, stripe_created_at, last_seen_at
  ) values (
    p_stripe_transfer_id, p_stripe_charge_id, p_kind, p_amount, p_amount_reversed,
    p_currency, p_destination_account_id, p_transfer_created_at, now()
  ) on conflict (stripe_transfer_id) do update
    set amount = excluded.amount,
        amount_reversed = excluded.amount_reversed,
        last_seen_at = now();

  for v_reversal in select value from jsonb_array_elements(p_reversals)
  loop
    if coalesce(v_reversal->>'id', '') !~ '^trr_'
       or coalesce((v_reversal->>'amount')::bigint, 0) <= 0
       or v_reversal->>'currency' is distinct from p_currency then
      raise exception 'invalid_connect_reversal_snapshot';
    end if;
    v_reversal_total := v_reversal_total + (v_reversal->>'amount')::bigint;
    insert into public.stripe_connect_adjustments (
      operation_key, stripe_charge_id, kind, source_transfer_id,
      stripe_object_id, amount, event_id
    ) values (
      'stripe:' || (v_reversal->>'id'), p_stripe_charge_id, 'reversal',
      p_stripe_transfer_id, v_reversal->>'id', (v_reversal->>'amount')::bigint, p_event_id
    ) on conflict (stripe_object_id) do nothing;
  end loop;

  if v_reversal_total <> p_amount_reversed then
    raise exception 'connect_reversal_total_mismatch';
  end if;

  return public.get_stripe_connect_charge_state(p_stripe_charge_id);
end;
$$;

create or replace function public.reconcile_stripe_access_incident_canonical(
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
  v_email text := nullif(lower(btrim(p_claim_email)), '');
  v_status text := case when p_access_blocked_reason is null then 'resolved' else 'blocking' end;
begin
  if p_stripe_customer_id !~ '^cus_' or p_stripe_subscription_id !~ '^sub_'
     or p_event_id is null or btrim(p_event_id) = '' or p_event_created_at is null
     or p_incident_kind not in ('full_refund', 'dispute')
     or (p_incident_kind = 'full_refund' and p_incident_key !~ '^charge:ch_')
     or (p_incident_kind = 'dispute' and p_incident_key !~ '^dispute:(dp_|du_)')
     or (p_incident_kind = 'full_refund' and p_access_blocked_reason is not null
         and p_access_blocked_reason <> 'full_refund')
     or (p_incident_kind = 'dispute' and p_access_blocked_reason is not null
         and p_access_blocked_reason not in ('dispute_open', 'dispute_lost')) then
    raise exception 'invalid_canonical_access_incident';
  end if;

  insert into public.billing_accounts (
    stripe_customer_id, stripe_subscription_id, claim_email
  ) values (
    p_stripe_customer_id, p_stripe_subscription_id, v_email
  ) on conflict (stripe_customer_id) do nothing;

  select * into v_account
    from public.billing_accounts
   where stripe_customer_id = p_stripe_customer_id
   for update;
  if v_account.anonymized_at is not null then
    return jsonb_build_object('status', 'ignored_anonymized');
  end if;
  if v_status = 'blocking' and v_account.stripe_subscription_id is not null
     and v_account.stripe_subscription_id <> p_stripe_subscription_id then
    return jsonb_build_object('status', 'ignored_unrelated_subscription');
  end if;

  update public.billing_accounts
     set stripe_subscription_id = coalesce(stripe_subscription_id, p_stripe_subscription_id),
         claim_email = case when user_id is null then coalesce(claim_email, v_email) else null end,
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

  insert into public.stripe_access_incidents (
    stripe_customer_id, stripe_subscription_id, incident_key, incident_kind,
    status, blocked_reason, last_event_id, last_event_created_at, resolved_at
  ) values (
    p_stripe_customer_id, p_stripe_subscription_id, p_incident_key, p_incident_kind,
    v_status, p_access_blocked_reason, p_event_id, p_event_created_at,
    case when v_status = 'resolved' then now() else null end
  ) on conflict (stripe_customer_id, incident_key) do update
    set stripe_subscription_id = excluded.stripe_subscription_id,
        incident_kind = excluded.incident_kind,
        status = excluded.status,
        blocked_reason = excluded.blocked_reason,
        last_event_id = excluded.last_event_id,
        last_event_created_at = greatest(
          public.stripe_access_incidents.last_event_created_at,
          excluded.last_event_created_at
        ),
        resolved_at = excluded.resolved_at;

  perform public.refresh_stripe_access_block(p_stripe_customer_id);
  perform public.refresh_stripe_access_grant(p_stripe_customer_id);
  return jsonb_build_object('status', v_status, 'incident_key', p_incident_key);
end;
$$;

create or replace function public.record_stripe_connect_reversal(
  p_operation_key text,
  p_stripe_charge_id text,
  p_source_transfer_id text,
  p_stripe_reversal_id text,
  p_amount bigint,
  p_event_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_operation_key is null or length(p_operation_key) < 16
     or p_source_transfer_id !~ '^tr_' or p_stripe_reversal_id !~ '^trr_'
     or p_amount <= 0 or p_event_id is null then
    raise exception 'invalid_connect_reversal';
  end if;
  insert into public.stripe_connect_adjustments (
    operation_key, stripe_charge_id, kind, source_transfer_id,
    stripe_object_id, amount, event_id
  ) values (
    p_operation_key, p_stripe_charge_id, 'reversal', p_source_transfer_id,
    p_stripe_reversal_id, p_amount, p_event_id
  ) on conflict do nothing;
  if not exists (
    select 1 from public.stripe_connect_adjustments
     where operation_key = p_operation_key
       and stripe_charge_id = p_stripe_charge_id
       and kind = 'reversal'
       and source_transfer_id = p_source_transfer_id
       and stripe_object_id = p_stripe_reversal_id
       and amount = p_amount
  ) then
    raise exception 'connect_reversal_idempotency_conflict';
  end if;
end;
$$;

create or replace function public.record_stripe_connect_restoration(
  p_operation_key text,
  p_stripe_charge_id text,
  p_stripe_transfer_id text,
  p_amount bigint,
  p_currency text,
  p_destination_account_id text,
  p_transfer_created_at timestamptz,
  p_event_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_operation_key is null or length(p_operation_key) < 16
     or p_stripe_transfer_id !~ '^tr_' or p_amount <= 0
     or p_currency !~ '^[a-z]{3}$' or p_destination_account_id !~ '^acct_'
     or p_transfer_created_at is null or p_event_id is null then
    raise exception 'invalid_connect_restoration';
  end if;
  if exists (
    select 1 from public.stripe_connect_transfers
     where stripe_transfer_id = p_stripe_transfer_id
       and (
         stripe_charge_id is distinct from p_stripe_charge_id
         or kind <> 'restoration'
         or amount is distinct from p_amount
         or currency is distinct from p_currency
         or stripe_destination_account_id is distinct from p_destination_account_id
         or stripe_created_at is distinct from p_transfer_created_at
       )
  ) then
    raise exception 'connect_restoration_identity_conflict';
  end if;
  insert into public.stripe_connect_transfers (
    stripe_transfer_id, stripe_charge_id, kind, amount, amount_reversed,
    currency, stripe_destination_account_id, stripe_created_at, last_seen_at
  ) values (
    p_stripe_transfer_id, p_stripe_charge_id, 'restoration', p_amount, 0,
    p_currency, p_destination_account_id, p_transfer_created_at, now()
  ) on conflict (stripe_transfer_id) do nothing;

  insert into public.stripe_connect_adjustments (
    operation_key, stripe_charge_id, kind, source_transfer_id,
    stripe_object_id, amount, event_id
  ) values (
    p_operation_key, p_stripe_charge_id, 'restoration', null,
    p_stripe_transfer_id, p_amount, p_event_id
  ) on conflict do nothing;
  if not exists (
    select 1 from public.stripe_connect_adjustments
     where operation_key = p_operation_key
       and stripe_charge_id = p_stripe_charge_id
       and kind = 'restoration'
       and source_transfer_id is null
       and stripe_object_id = p_stripe_transfer_id
       and amount = p_amount
  ) then
    raise exception 'connect_restoration_idempotency_conflict';
  end if;
end;
$$;

create or replace function public.complete_stripe_connect_reconciliation(
  p_stripe_charge_id text,
  p_net_clawback_amount bigint,
  p_event_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_charge public.stripe_connect_charges%rowtype;
  v_state jsonb;
begin
  select * into v_charge
    from public.stripe_connect_charges
   where stripe_charge_id = p_stripe_charge_id
   for update;
  if not found then raise exception 'connect_charge_missing'; end if;
  v_state := public.get_stripe_connect_charge_state(p_stripe_charge_id);
  if (v_state->>'net_clawback_amount')::bigint <> p_net_clawback_amount
     or p_net_clawback_amount <> v_charge.desired_clawback_amount then
    raise exception 'connect_reconciliation_not_balanced';
  end if;
  update public.stripe_connect_charges
     set reconciled_net_clawback_amount = p_net_clawback_amount,
         reconciliation_status = 'balanced',
         reconciled_at = now(),
         last_error = null,
         last_event_id = p_event_id
   where stripe_charge_id = p_stripe_charge_id;
  return public.get_stripe_connect_charge_state(p_stripe_charge_id);
end;
$$;

create or replace function public.fail_stripe_connect_reconciliation(
  p_stripe_charge_id text,
  p_last_error text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.stripe_connect_charges
     set reconciliation_status = 'failed',
         last_error = left(coalesce(p_last_error, 'unknown'), 500)
   where stripe_charge_id = p_stripe_charge_id;
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
  ) then
    raise exception 'stripe_connect_ledger_unhealthy';
  end if;
end;
$$;

revoke all on table public.stripe_connect_charges from public, anon, authenticated;
revoke all on table public.stripe_connect_disputes from public, anon, authenticated;
revoke all on table public.stripe_connect_transfers from public, anon, authenticated;
revoke all on table public.stripe_connect_adjustments from public, anon, authenticated;

revoke all on function public.get_stripe_connect_charge_state(text) from public, anon, authenticated;
revoke all on function public.sync_stripe_connect_charge_snapshot(
  text, text, text, text, text, text, text, text, bigint, bigint, bigint,
  timestamptz, bigint, bigint, bigint, jsonb, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.sync_stripe_connect_transfer_snapshot(
  text, text, text, bigint, bigint, text, text, timestamptz, jsonb, text
) from public, anon, authenticated;
revoke all on function public.record_stripe_connect_reversal(
  text, text, text, text, bigint, text
) from public, anon, authenticated;
revoke all on function public.record_stripe_connect_restoration(
  text, text, text, bigint, text, text, timestamptz, text
) from public, anon, authenticated;
revoke all on function public.complete_stripe_connect_reconciliation(text, bigint, text)
  from public, anon, authenticated;
revoke all on function public.fail_stripe_connect_reconciliation(text, text)
  from public, anon, authenticated;
revoke all on function public.reconcile_stripe_access_incident_canonical(
  text, text, text, text, text, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.assert_stripe_connect_checkout_ready()
  from public, anon, authenticated;

grant execute on function public.get_stripe_connect_charge_state(text) to service_role;
grant execute on function public.sync_stripe_connect_charge_snapshot(
  text, text, text, text, text, text, text, text, bigint, bigint, bigint,
  timestamptz, bigint, bigint, bigint, jsonb, text, timestamptz
) to service_role;
grant execute on function public.sync_stripe_connect_transfer_snapshot(
  text, text, text, bigint, bigint, text, text, timestamptz, jsonb, text
) to service_role;
grant execute on function public.record_stripe_connect_reversal(
  text, text, text, text, bigint, text
) to service_role;
grant execute on function public.record_stripe_connect_restoration(
  text, text, text, bigint, text, text, timestamptz, text
) to service_role;
grant execute on function public.complete_stripe_connect_reconciliation(text, bigint, text)
  to service_role;
grant execute on function public.fail_stripe_connect_reconciliation(text, text)
  to service_role;
grant execute on function public.reconcile_stripe_access_incident_canonical(
  text, text, text, text, text, text, text, timestamptz
) to service_role;
grant execute on function public.assert_stripe_connect_checkout_ready()
  to service_role;
