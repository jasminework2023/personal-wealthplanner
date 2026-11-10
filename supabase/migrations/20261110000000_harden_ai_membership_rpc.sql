-- AI PRO+ membership RPC is only called by the server-side Xendit webhook
-- using the Supabase service-role client. It does not need SECURITY DEFINER.
-- Remove PUBLIC execute access so anonymous/authenticated clients cannot invoke
-- the entitlement mutation directly.
ALTER FUNCTION public.activate_ai_membership_payment(
  text,
  text,
  text,
  text,
  bigint
) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.activate_ai_membership_payment(
  text,
  text,
  text,
  text,
  bigint
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.activate_ai_membership_payment(
  text,
  text,
  text,
  text,
  bigint
) TO service_role;
