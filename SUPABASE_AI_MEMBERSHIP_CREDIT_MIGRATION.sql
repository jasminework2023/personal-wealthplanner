-- AI Membership & Credit System — Phase 1
-- Apply manually in Supabase SQL Editor after reviewing this migration.
-- This migration does not alter existing payment activation (users.is_active),
-- Google Sheets data, wallets, Telegram, or existing payment amounts.

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

alter table public.users
  drop constraint if exists users_ai_membership_plan_check;
alter table public.users
  add constraint users_ai_membership_plan_check
  check (ai_membership_plan is null or ai_membership_plan in ('ai_pro_monthly','ai_pro_annual'));

alter table public.users
  drop constraint if exists users_ai_credits_remaining_check;
alter table public.users
  add constraint users_ai_credits_remaining_check
  check (ai_credits_remaining >= 0);

create table if not exists public.ai_membership_payments (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  plan text not null check (plan in ('lifetime_personal','ai_pro_monthly','ai_pro_annual')),
  provider text not null check (provider in ('xendit','lynk','manual')),
  provider_payment_id text not null,
  amount_idr bigint not null check (amount_idr > 0),
  status text not null default 'paid' check (status in ('pending','paid','failed','refunded')),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create index if not exists ai_membership_payments_username_paid_idx
  on public.ai_membership_payments (username, paid_at desc);

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  request_id text not null,
  feature text not null,
  credits integer not null check (credits > 0),
  status text not null default 'reserved' check (status in ('reserved','committed','refunded')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (username, request_id)
);

create index if not exists ai_credit_ledger_username_created_idx
  on public.ai_credit_ledger (username, created_at desc);

alter table public.ai_membership_payments enable row level security;
alter table public.ai_credit_ledger enable row level security;
-- No client policies. Access is through trusted server functions using service_role.

create or replace function public.reserve_ai_credits(
  p_username text,
  p_request_id text,
  p_feature text,
  p_credits integer
)
returns table (
  allowed boolean,
  reason text,
  credits_remaining integer,
  trial_expires_at timestamptz,
  membership_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_now timestamptz := now();
begin
  if p_username is null or length(trim(p_username)) = 0
     or p_request_id is null or length(trim(p_request_id)) = 0
     or p_feature is null or length(trim(p_feature)) = 0
     or p_credits is null or p_credits < 1 or p_credits > 100 then
    return query select false, 'invalid_request', 0, null::timestamptz, null::timestamptz;
    return;
  end if;

  select * into v_user
  from public.users
  where username = trim(p_username)
  for update;

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

  if exists (
    select 1 from public.ai_credit_ledger
    where username = trim(p_username) and request_id = trim(p_request_id)
  ) then
    return query select false, 'duplicate_request', v_user.ai_credits_remaining,
      v_user.ai_trial_expires_at, v_user.ai_membership_expires_at;
    return;
  end if;

  if v_user.ai_credit_period_expires_at is null
     or v_user.ai_credit_period_expires_at <= v_now then
    update public.users
    set ai_credits_remaining = 300,
        ai_credit_period_started_at = v_now,
        ai_credit_period_expires_at = v_now + interval '30 days'
    where user_id = v_user.user_id
    returning * into v_user;
  end if;

  if v_user.ai_credits_remaining < p_credits then
    return query select false, 'insufficient_credits', v_user.ai_credits_remaining,
      v_user.ai_trial_expires_at, v_user.ai_membership_expires_at;
    return;
  end if;

  update public.users
  set ai_credits_remaining = ai_credits_remaining - p_credits
  where user_id = v_user.user_id
  returning * into v_user;

  insert into public.ai_credit_ledger (username, request_id, feature, credits, status)
  values (trim(p_username), trim(p_request_id), trim(p_feature), p_credits, 'reserved');

  return query select true, 'reserved', v_user.ai_credits_remaining,
    v_user.ai_trial_expires_at, v_user.ai_membership_expires_at;
end;
$$;

create or replace function public.settle_ai_credit(
  p_username text,
  p_request_id text,
  p_success boolean
)
returns table (settled boolean, status text, credits_remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger public.ai_credit_ledger%rowtype;
  v_user public.users%rowtype;
begin
  select * into v_ledger
  from public.ai_credit_ledger
  where username = trim(p_username) and request_id = trim(p_request_id)
  for update;

  if not found then
    select * into v_user from public.users where username = trim(p_username);
    return query select false, 'not_found', coalesce(v_user.ai_credits_remaining, 0);
    return;
  end if;

  if v_ledger.status <> 'reserved' then
    select * into v_user from public.users where username = trim(p_username);
    return query select false, v_ledger.status, coalesce(v_user.ai_credits_remaining, 0);
    return;
  end if;

  if p_success then
    update public.ai_credit_ledger
    set status = 'committed', settled_at = now()
    where id = v_ledger.id;
  else
    update public.users
    set ai_credits_remaining = ai_credits_remaining + v_ledger.credits
    where username = trim(p_username)
    returning * into v_user;

    update public.ai_credit_ledger
    set status = 'refunded', settled_at = now()
    where id = v_ledger.id;
  end if;

  if v_user.user_id is null then
    select * into v_user from public.users where username = trim(p_username);
  end if;

  return query select true,
    case when p_success then 'committed' else 'refunded' end,
    coalesce(v_user.ai_credits_remaining, 0);
end;
$$;

revoke all on function public.reserve_ai_credits(text, text, text, integer) from public;
revoke all on function public.settle_ai_credit(text, text, boolean) from public;
revoke all on function public.reserve_ai_credits(text, text, text, integer) from anon, authenticated;
revoke all on function public.settle_ai_credit(text, text, boolean) from anon, authenticated;
grant execute on function public.reserve_ai_credits(text, text, text, integer) to service_role;
grant execute on function public.settle_ai_credit(text, text, boolean) to service_role;
