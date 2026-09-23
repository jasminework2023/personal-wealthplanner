import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const PRICE = 149000;
const PRODUCT_NAME = "Wealthplanner Personal — Lifetime Access";
const LYNK_CHECKOUT_URL = "https://lynk.id/jannatuljasmine_/ndwogm0rrg6z";

function supabase() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { name, email } = req.body || {};
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanName || !cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Nama dan email wajib diisi." });
  }

  try {
    const dashboardToken = crypto.randomBytes(32).toString("hex");

    // Store email so a legacy Xendit Invoice webhook can safely map
    // payer_email back to the pending Wealthplanner customer.
    const { error: insertError } = await supabase().from("users").insert({
  user_id: crypto.randomUUID(),
  username: cleanName,
  email: cleanEmail,
  dashboard_token: dashboardToken,
  is_active: false,
  spreadsheet_id: null,
});

    if (insertError) {
      console.error("create-payment user insert error:", insertError.message);
      return res.status(500).json({ error: "Gagal menyiapkan akun customer." });
    }

    return res.status(200).json({
      success: true,
      paymentLink: LYNK_CHECKOUT_URL,
      referenceId: dashboardToken,
      provider: "lynk",
    });
  } catch (error) {
    console.error("create-payment error:", error);
    return res.status(500).json({ error: "Gagal menyiapkan pembayaran." });
  }
}
