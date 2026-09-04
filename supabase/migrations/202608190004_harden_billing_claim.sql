drop function if exists public.claim_billing_account(uuid, text);

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

revoke all on function public.claim_billing_account(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_billing_account(uuid, text, text)
  to service_role;
