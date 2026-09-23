import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const PRICE = 139000;

function db() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
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
  const status = String(data.status || "");

  if (!referenceId || amount !== PRICE || status !== "COMPLETED") {
    return res.status(400).json({ error: "Webhook Wealth Tracker tidak valid." });
  }

  try {
    const { data: user, error: userError } = await db()
      .from("users")
      .select("user_id, username, spreadsheet_id, is_active")
      .eq("dashboard_token", referenceId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: "Customer Wealth Tracker tidak ditemukan." });
    }

    if (Number(user.is_active) === 1) {
      return res.status(200).json({ received: true, alreadyActive: true });
    }

    const { error: updateError } = await db()
      .from("users")
      .update({ is_active: 1 })
      .eq("dashboard_token", referenceId);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({
      received: true,
      activated: true,
      needsSpreadsheet: !user.spreadsheet_id,
    });
  } catch (error) {
    console.error("wealth-tracker-webhook activation error:", error);
    return res.status(500).json({ error: "Aktivasi gagal; webhook akan dicoba lagi." });
  }
}
