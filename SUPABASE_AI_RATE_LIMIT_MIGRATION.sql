-- AI receipt endpoint rate limiting.
-- Apply manually in Supabase SQL Editor before deploying the matching application code.
-- This migration stores only the username and fixed-window counters (never the dashboard token).

create table if not exists public.ai_rate_limits (
  username text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_rate_limits enable row level security;
-- No client policies. Only the server's service-role client should call the RPC.

create or replace function public.consume_ai_rate_limit(
  p_username text,
  p_window_seconds integer default 60,
  p_max_requests integer default 5
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_seconds integer := greatest(1, least(coalesce(p_window_seconds, 60), 3600));
  v_max_requests integer := greatest(1, least(coalesce(p_max_requests, 5), 100));
  v_started_at timestamptz;
  v_count integer;
begin
  if p_username is null or length(trim(p_username)) = 0 then
    return query select false, v_window_seconds;
    return;
  end if;

  insert into public.ai_rate_limits as current_limit
    (username, window_started_at, request_count, updated_at)
  values
    (trim(p_username), now(), 1, now())
  on conflict (username) do update
    set window_started_at = case
          when current_limit.window_started_at <= now() - make_interval(secs => v_window_seconds)
            then now()
          else current_limit.window_started_at
        end,
        request_count = case
          when current_limit.window_started_at <= now() - make_interval(secs => v_window_seconds)
            then 1
          else current_limit.request_count + 1
        end,
        updated_at = now()
    where current_limit.window_started_at <= now() - make_interval(secs => v_window_seconds)
       or current_limit.request_count < v_max_requests
  returning current_limit.window_started_at, current_limit.request_count
    into v_started_at, v_count;

  if found then
    return query select true, 0;
    return;
  end if;

  select limits.window_started_at, limits.request_count
    into v_started_at, v_count
    from public.ai_rate_limits as limits
    where limits.username = trim(p_username);

  return query
    select false,
      greatest(1, ceil(extract(epoch from (
        v_started_at + make_interval(secs => v_window_seconds) - now()
      )))::integer);
end;
$$;

revoke all on function public.consume_ai_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_ai_rate_limit(text, integer, integer) from anon, authenticated;
grant execute on function public.consume_ai_rate_limit(text, integer, integer) to service_role;
