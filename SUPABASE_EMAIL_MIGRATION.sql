-- Run once in Supabase SQL Editor before deploying the email patch.
alter table public.users
  add column if not exists email text;

create index if not exists users_email_idx on public.users (email);
