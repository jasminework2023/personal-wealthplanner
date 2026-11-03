-- AI Membership & Credit System — Phase 1
-- Apply manually in Supabase SQL Editor after reviewing this migration.
-- Existing payment activation, Google Sheets, wallets, Telegram and payment amounts are unchanged.

alter table public.users
  add column if not exists lifetime_pro_status boolean not null default false,
  add column if not exists ai_trial_started_at timestamptz,
  add column if not exists ai_trial_expires_at timestamptz,
  add column if not exists ai_membership_plan text,
  add column if not exists ai_membership_started_at timestamptz,
  add column if not exists ai_membership_expires_at timestamptz,
  add column if not exists ai_credits_remaining integer not null default 0,
  add column if not exists ai_credit_period_started_at timestamptz,
  add column if not exists ai_credit_period_expires_at timestamptz;

alter table public.users drop constraint if exists users_ai_membership_plan_check;
alter table public.users add constraint users_ai_membership_plan_check
  check (ai_membership_plan is null or ai_membership_plan in ('ai_pro_monthly','ai_pro_annual'));
alter table public.users drop constraint if exists users_ai_credits_remaining_check;
alter table public.users add constraint users_ai_credits_remaining_check check (ai_credits_remaining >= 0);

create table if not exists public.ai_membership_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan text not null check (plan in ('lifetime_personal','ai_pro_monthly','ai_pro_annual')),
  provider text not null check (provider in ('xendit','lynk','manual')),
  provider_payment_id text not null,
  amount_idr bigint not null check (amount_idr > 0),
  status text not null default 'paid' check (status in ('pending','paid','failed','refunded')),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index if not exists ai_membership_payments_user_paid_idx
  on public.ai_membership_payments (user_id, paid_at desc);

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  request_id text not null,
  feature text not null,
  credits integer not null check (credits > 0),
  status text not null default 'reserved' check (status in ('reserved','committed','refunded')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (user_id, request_id)
);
create index if not exists ai_credit_ledger_user_created_idx
  on public.ai_credit_ledger (user_id, created_at desc);

alter table public.ai_membership_payments enable row level security;
alter table public.ai_credit_ledger enable row level security;
-- No client policies: access is only through trusted server functions using service_role.

create or replace function public.reserve_ai_credits(
  p_user_id uuid, p_request_id text, p_feature text, p_credits integer
)
returns table (
  allowed boolean, reason text, credits_remaining integer,
  trial_expires_at timestamptz, membership_expires_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_now timestamptz := now();
begin
  if p_user_id is null or p_request_id is null or length(trim(p_request_id)) = 0
     or p_feature is null or length(trim(p_feature)) = 0
     or p_credits is null or p_credits < 1 or p_credits > 100 then
    return query select false, 'invalid_request', 0, null::timestamptz, null::timestamptz;
    return;
  end if;

  select * into v_user from public.users where user_id = p_user_id for update;
  if not found then
    return query select false, 'user_not_found', 0, null::timestamptz, null::timestamptz;
    return;
  end if;

  if coalesce(v_user.ai_trial_expires_at, '-infinity'::timestamptz) <= v_now
     and coalesce(v_user.ai_membership_expires_at, '-infinity'::timestamptz) <= v_now then
    return query select false, 'ai_access_expired', v_user.ai_credits_remaining,
      v_user.ai_trial_expires_at, v_user.ai_membership_expires_at;
    return;
  end if;

  if exists (select 1 from public.ai_credit_ledger
             where user_id = p_user_id and request_id = trim(p_request_id)) then
    return query select false, 'duplicate_request', v_user.ai_credits_remaining,
      v_user.ai_trial_expires_at, v_user.ai_membership_expires_at;
    return;
  end if;

  if v_user.ai_credit_period_expires_at is null or v_user.ai_credit_period_expires_at <= v_now then
    update public.users
      set ai_credits_remaining = 300,
          ai_credit_period_started_at = v_now,
          ai_credit_period_expires_at = v_now + interval '30 days'
      where user_id = p_user_id returning * into v_user;
  end if;

  if v_user.ai_credits_remaining < p_credits then
    return query select false, 'insufficient_credits', v_user.ai_credits_remaining,
      v_user.ai_trial_expires_at, v_user.ai_membership_expires_at;
    return;
  end if;

  update public.users set ai_credits_remaining = ai_credits_remaining - p_credits
    where user_id = p_user_id returning * into v_user;

  insert into public.ai_credit_ledger (user_id, request_id, feature, credits, status)
    values (p_user_id, trim(p_request_id), trim(p_feature), p_credits, 'reserved');

  return query select true, 'reserved', v_user.ai_credits_remaining,
    v_user.ai_trial_expires_at, v_user.ai_membership_expires_at;
end;
$$;

create or replace function public.settle_ai_credit(
  p_user_id uuid, p_request_id text, p_success boolean
)
returns table (settled boolean, status text, credits_remaining integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_ledger public.ai_credit_ledger%rowtype;
  v_user public.users%rowtype;
begin
  select * into v_ledger from public.ai_credit_ledger
    where user_id = p_user_id and request_id = trim(p_request_id) for update;
  if not found then
    select * into v_user from public.users where user_id = p_user_id;
    return query select false, 'not_found', coalesce(v_user.ai_credits_remaining, 0);
    return;
  end if;

  if v_ledger.status <> 'reserved' then
    select * into v_user from public.users where user_id = p_user_id;
    return query select false, v_ledger.status, coalesce(v_user.ai_credits_remaining, 0);
    return;
  end if;

  if p_success then
    update public.ai_credit_ledger set status = 'committed', settled_at = now() where id = v_ledger.id;
  else
    update public.users set ai_credits_remaining = ai_credits_remaining + v_ledger.credits
      where user_id = p_user_id returning * into v_user;
    update public.ai_credit_ledger set status = 'refunded', settled_at = now() where id = v_ledger.id;
  end if;

  if v_user.user_id is null then
    select * into v_user from public.users where user_id = p_user_id;
  end if;
  return query select true, case when p_success then 'committed' else 'refunded' end,
    coalesce(v_user.ai_credits_remaining, 0);
end;
$$;

create or replace function public.activate_ai_membership_payment(
  p_user_id uuid,
  p_plan text,
  p_provider text,
  p_provider_payment_id text,
  p_amount_idr bigint
)
returns table (activated boolean, reason text, expires_at timestamptz)
language plpgsql security definer set search_path = public
as $
declare
  v_user public.users%rowtype;
  v_payment_id uuid;
  v_expiry timestamptz;
  v_now timestamptz := now();
begin
  if p_user_id is null or p_provider_payment_id is null or length(trim(p_provider_payment_id)) = 0
     or p_provider not in ('xendit','lynk','manual') then
    return query select false, 'invalid_request', null::timestamptz;
    return;
  end if;

  if not (
    (p_plan = 'lifetime_personal' and p_amount_idr = 149000)
    or (p_plan = 'ai_pro_monthly' and p_amount_idr = 20000)
    or (p_plan = 'ai_pro_annual' and p_amount_idr = 199000)
  ) then
    return query select false, 'invalid_plan_or_amount', null::timestamptz;
    return;
  end if;

  select * into v_user from public.users where user_id = p_user_id for update;
  if not found then
    return query select false, 'user_not_found', null::timestamptz;
    return;
  end if;

  insert into public.ai_membership_payments
    (user_id, plan, provider, provider_payment_id, amount_idr, status, paid_at)
  values
    (p_user_id, p_plan, p_provider, trim(p_provider_payment_id), p_amount_idr, 'paid', v_now)
  on conflict (provider, provider_payment_id) do nothing
  returning id into v_payment_id;

  if v_payment_id is null then
    return query select false, 'duplicate_payment', null::timestamptz;
    return;
  end if;

  if p_plan = 'lifetime_personal' then
    update public.users set
      lifetime_pro_status = true,
      ai_trial_started_at = coalesce(ai_trial_started_at, v_now),
      ai_trial_expires_at = coalesce(ai_trial_expires_at,
        coalesce(ai_trial_started_at, v_now) + interval '12 months'),
      ai_credits_remaining = case
        when ai_credit_period_expires_at is null or ai_credit_period_expires_at <= v_now then 300
        else ai_credits_remaining end,
      ai_credit_period_started_at = case
        when ai_credit_period_expires_at is null or ai_credit_period_expires_at <= v_now then v_now
        else ai_credit_period_started_at end,
      ai_credit_period_expires_at = case
        when ai_credit_period_expires_at is null or ai_credit_period_expires_at <= v_now then v_now + interval '30 days'
        else ai_credit_period_expires_at end
    where user_id = p_user_id
    returning ai_trial_expires_at into v_expiry;
  else
    update public.users set
      ai_membership_plan = p_plan,
      ai_membership_started_at = case
        when ai_membership_expires_at is not null and ai_membership_expires_at > v_now
          then coalesce(ai_membership_started_at, v_now)
        else v_now end,
      ai_membership_expires_at = case
        when ai_membership_expires_at is not null and ai_membership_expires_at > v_now
          then ai_membership_expires_at + case when p_plan = 'ai_pro_monthly'
            then interval '30 days' else interval '12 months' end
        else v_now + case when p_plan = 'ai_pro_monthly'
            then interval '30 days' else interval '12 months' end end,
      ai_credits_remaining = 300,
      ai_credit_period_started_at = v_now,
      ai_credit_period_expires_at = v_now + interval '30 days'
    where user_id = p_user_id
    returning ai_membership_expires_at into v_expiry;
  end if;

  return query select true, 'activated', v_expiry;
end;
$;

revoke all on function public.reserve_ai_credits(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.settle_ai_credit(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.activate_ai_membership_payment(uuid, text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.reserve_ai_credits(uuid, text, text, integer) to service_role;
grant execute on function public.settle_ai_credit(uuid, text, boolean) to service_role;
grant execute on function public.activate_ai_membership_payment(uuid, text, text, text, bigint) to service_role;
