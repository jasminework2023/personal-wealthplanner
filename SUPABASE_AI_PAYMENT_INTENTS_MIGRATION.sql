-- Opaque Xendit invoice references for AI PRO+.
-- Apply this migration before deploying the updated checkout/webhook endpoints.
create table if not exists public.ai_payment_intents (
  external_id text primary key,
  user_id text not null,
  plan text not null check (plan in ('ai_pro_monthly','ai_pro_annual')),
  amount_idr bigint not null check (amount_idr in (20000,199000)),
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  provider_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create unique index if not exists ai_payment_intents_provider_payment_id_uidx
  on public.ai_payment_intents (provider_payment_id)
  where provider_payment_id is not null;

create index if not exists ai_payment_intents_user_created_idx
  on public.ai_payment_intents (user_id, created_at desc);

alter table public.ai_payment_intents enable row level security;
-- No client policies: server-only access through service_role.
