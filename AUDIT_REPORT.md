# Personal Wealthplanner — Audit Baseline

Baseline: personal-wealthplanner-main (23)

## Confirmed issues from code/schema audit

1. `users.user_id` is NOT NULL, while customer creation did not reliably provide it.
2. `users.is_active` is INTEGER, while several handlers used boolean values.
3. Some webhook logic ordered by `created_at`, but the supplied `users` schema did not contain it.
4. `pending_activations` is empty and is not treated as the active source of truth.
5. Lynk webhook used a hard-coded exact amount whitelist that can reject fee-inclusive grand totals.
6. Lynk payment uses a static product URL, so the generated dashboard token is not intrinsically carried into the payment.
7. Webhook activation lacked durable message/event idempotency.
8. Dashboard data initialization contained demo/mock data, allowing production failures to look like valid data.
9. Xendit files/features are preserved.

## Not fully verified

- The separate public website checkout project and whether it calls `/api/create-payment`.
- The exact Google Sheet template/ranges.
- A complete production Vercel build; syntax inspection is not equivalent to a successful deployment.

## Deployment order

1. Run `SUPABASE_AUDIT_MIGRATION.sql`.
2. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel Production.
3. Deploy the dashboard/backend.
4. Test `/api/access`.
5. Test customer creation.
6. Test Lynk webhook.
7. Test dashboard with a real token.
8. Regression-test Xendit.
9. Audit the separate public website checkout project.
