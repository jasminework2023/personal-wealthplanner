# Deployment checklist — Personal Wealthplanner

## Required Vercel Environment Variables

Set these in **Project Settings → Environment Variables** for the environment you deploy:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_CREDENTIALS`
- `OPENAI_API_KEY` — required for receipt AI
- `OPENAI_RECEIPT_MODEL` — optional; defaults to `gpt-4.1-mini`

Payment features additionally need the Xendit variables used by the payment routes.

After changing environment variables, redeploy so the new values are available to Functions.

## Receipt AI

The receipt flow now:

1. Accepts an image from camera/gallery.
2. Resizes it to a maximum of 1800px.
3. Compresses it to JPEG and keeps the request payload around 3 MB or less.
4. Sends the image to `/api/receipt-ai`.
5. Uses OpenAI Responses API image input plus a strict JSON schema.
6. Shows the detected transaction for review.
7. Saves only after the user presses **Konfirmasi & simpan**.

This avoids sending the original full-resolution phone photo directly to a Vercel Function. Vercel documents a 4.5 MB request-payload limit for Functions.

## If Vercel still shows a red deployment

Open the failed deployment → **Deploy Logs** and capture the first red `Error` line. The Vite build itself can succeed while a later Function/deployment step fails, so the exact red line is needed for that remaining infrastructure issue.
