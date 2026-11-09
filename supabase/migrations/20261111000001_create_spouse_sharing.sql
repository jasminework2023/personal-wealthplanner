create table if not exists public.spouse_connections (
  id uuid primary key default gen_random_uuid(),
  requester_user_id text not null references public.users(user_id) on delete cascade,
  recipient_user_id text references public.users(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked')),
  invite_code_hash text unique,
  invite_expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spouse_connections_requester_idx
  on public.spouse_connections(requester_user_id);
create index if not exists spouse_connections_recipient_idx
  on public.spouse_connections(recipient_user_id);

create unique index if not exists spouse_connections_pair_unique
  on public.spouse_connections (
    least(requester_user_id, recipient_user_id),
    greatest(requester_user_id, recipient_user_id)
  )
  where status = 'accepted' and recipient_user_id is not null;

alter table public.spouse_connections enable row level security;
revoke all on table public.spouse_connections from anon, authenticated;

create or replace function public.set_spouse_connections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists spouse_connections_updated_at on public.spouse_connections;
create trigger spouse_connections_updated_at
before update on public.spouse_connections
for each row execute function public.set_spouse_connections_updated_at();
