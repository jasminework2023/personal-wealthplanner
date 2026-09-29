-- Jalankan SEKALI di Supabase SQL Editor SEBELUM deploy webhook baru.
-- Aman dijalankan ulang (idempotent).
alter table public.users
  add column if not exists last_payment_id text,
  add column if not exists welcome_email_sent_at timestamptz;

-- Index unik ini yang mencegah dua delivery webhook bersamaan
-- untuk pembayaran yang sama membuat dua customer / dua email.
create unique index if not exists users_last_payment_id_uidx
  on public.users (last_payment_id) where last_payment_id is not null;
