# Telegram 404 fix

The Telegram endpoints are exposed as explicit Vercel API functions instead of relying only on the existing catch-all `/api/[...route].ts` router.

Files in this patch:
- `api/telegram-webhook.ts` — explicit `/api/telegram-webhook` endpoint
- `api/telegram-link.ts` — explicit `/api/telegram-link` endpoint
- `server/api/telegram-webhook.ts` — static import of the dashboard transaction parser
- `vercel.json` — includes the two Telegram functions

Do not delete the existing `api/[...route].ts` or existing transaction routes.
