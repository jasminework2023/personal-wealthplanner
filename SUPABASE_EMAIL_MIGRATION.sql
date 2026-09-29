-- Run once in Supabase SQL Editor before deploying the Telegram integration.
alter table public.users
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_link_code text,
  add column if not exists telegram_link_expires_at timestamptz,
  add column if not exists telegram_pending_receipt jsonb;

create unique index if not exists users_telegram_chat_id_uidx
  on public.users (telegram_chat_id)
  where telegram_chat_id is not null;

create unique index if not exists users_telegram_link_code_uidx
  on public.users (telegram_link_code)
  where telegram_link_code is not null;
