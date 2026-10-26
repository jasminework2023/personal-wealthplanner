-- Wallet metadata for the bank accounts listed in Setup!K:L.
-- Run in Supabase SQL editor. API accesses this table with service-role credentials only.
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  name text not null,
  name_key text not null,
  color_mode text not null default 'auto' check (color_mode in ('auto', 'custom')),
  color text null check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  opening_balance numeric not null default 0,
  sort_order integer not null default 0,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallets_username_name_key_unique unique (username, name_key)
);

create index if not exists wallets_username_active_idx
  on public.wallets (username, archived_at);

alter table public.wallets enable row level security;
-- Intentionally no client policies: access is server-side through service role only.
