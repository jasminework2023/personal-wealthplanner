# Telegram Integration — Deploy Checklist

## 1. Supabase
Run `SUPABASE_TELEGRAM_MIGRATION.sql` once in the Supabase SQL Editor.

It adds:
- `telegram_chat_id`
- `telegram_link_code`
- `telegram_link_expires_at`
- `telegram_pending_receipt`

## 2. Vercel Environment Variables
Add these server-side variables:

- `TELEGRAM_BOT_TOKEN` = token from BotFather
- `TELEGRAM_BOT_USERNAME` = `wealthplannerAI`
- `TELEGRAM_WEBHOOK_SECRET` = a random secret string (do not share publicly)

Do not put the bot token in frontend/VITE variables.

## 3. Deploy
Deploy the dashboard normally. The Telegram webhook endpoint is:

`https://wealthplanner.id/api/telegram-webhook`

## 4. Register Telegram webhook
After deployment, run this from a terminal. Replace the two placeholders locally; do not commit them:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://wealthplanner.id/api/telegram-webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>","allowed_updates":["message","callback_query"]}'
```

Check:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

The returned URL should be the Wealthplanner webhook and `last_error_message` should be empty.

## 5. Customer flow

1. Customer pays.
2. Xendit webhook activates the account.
3. System creates a 24-hour one-time Telegram linking code.
4. Resend sends the welcome email with:
   - clickable activation URL containing the customer's dashboard token;
   - Google Sheet instructions;
   - optional **Hubungkan Telegram** button.
5. Customer opens Dashboard Welcome.
6. Customer makes a Google Sheet copy and connects it.
7. Customer clicks **Hubungkan Telegram**.
8. Telegram `/start CODE` stores `telegram_chat_id` against the existing dashboard account.
9. Customer can send transaction text or receipt photos.

The customer never needs to know or type their numeric Telegram ID.

## Customer-facing URL
The email uses:

`https://www.wealthplanner.id/dashboard/welcome?token=...`

The token is already embedded in the clickable URL. It is not necessary to show a second separate token field to the customer.
