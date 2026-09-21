import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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

  // Existing Wealthplanner Personal remains Rp149.000.
  // Wealth Tracker AI uses Rp139.000. Both activate the same customer access
  // record, while the product-specific checkout is created by its own endpoint.
  if (!referenceId || ![149000, 139000].includes(amount) || data.status !== "COMPLETED") {
    return res.status(400).json({ error: "Webhook pembayaran tidak valid." });
  }

  try {
    const supabase = db();
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, username, spreadsheet_id, is_active")
      .eq("dashboard_token", referenceId)
      .single();

    if (error || !user) return res.status(404).json({ error: "Customer tidak ditemukan." });

    if (user.is_active) {
      return res.status(200).json({ received: true, alreadyActive: true });
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ is_active: true })
      .eq("dashboard_token", referenceId);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({
      received: true,
      activated: true,
      product: amount === 139000 ? "wealth-tracker-ai" : "wealthplanner-personal",
      needsSpreadsheet: !user.spreadsheet_id,
    });
  } catch (error) {
    console.error("xendit-webhook activation error:", error);
    return res.status(500).json({ error: "Aktivasi customer gagal; webhook akan dicoba lagi." });
  }
}
