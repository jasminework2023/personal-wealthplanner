import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendWelcomeEmail } from "../lib/email";

function db() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const callbackToken = req.headers["x-callback-token"];
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected || callbackToken !== expected) {
    return res.status(401).json({ error: "Unauthorized webhook" });
  }

  const body = req.body || {};
  if (body.event !== "payment_session.completed") {
    return res.status(200).json({ received: true });
  }

  const data = body.data || {};
  const referenceId = String(data.reference_id || "");
  const amount = Number(data.amount || 0);

  if (!referenceId || ![149000, 139000].includes(amount) || data.status !== "COMPLETED") {
    return res.status(400).json({ error: "Webhook pembayaran tidak valid." });
  }

  try {
    const supabase = db();
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, username, email, dashboard_token, spreadsheet_id, is_active")
      .eq("dashboard_token", referenceId)
      .single();

    if (error || !user) return res.status(404).json({ error: "Customer tidak ditemukan." });

    // The email is saved at checkout time, so the webhook remains the source
    // of truth for payment completion without relying on the browser redirect.
    // Resend idempotency keeps webhook retries from sending duplicate emails.
    if (!user.is_active) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ is_active: true })
        .eq("dashboard_token", referenceId);

      if (updateError) throw new Error(updateError.message);
    }

    if (user.email) {
      try {
        await sendWelcomeEmail({
          to: user.email,
          name: user.username,
          dashboardToken: referenceId,
          referenceId,
        });
      } catch (emailError) {
        console.error("welcome email error:", emailError);
        // Return 500 so Xendit can retry the webhook. Resend requests use the
        // same reference-based idempotency key in the API layer when supported.
        return res.status(500).json({
          error: "Pembayaran sudah diterima, tetapi email welcome gagal dikirim. Webhook akan dicoba lagi.",
        });
      }
    } else {
      console.warn("welcome email skipped: users.email kosong", referenceId);
    }

    return res.status(200).json({
      received: true,
      activated: true,
      emailSent: Boolean(user.email),
      product: amount === 139000 ? "wealth-tracker-ai" : "wealthplanner-personal",
      needsSpreadsheet: !user.spreadsheet_id,
    });
  } catch (error) {
    console.error("xendit-webhook activation error:", error);
    return res.status(500).json({ error: "Aktivasi customer gagal; webhook akan dicoba lagi." });
  }
}
