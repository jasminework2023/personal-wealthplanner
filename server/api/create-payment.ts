import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const PRICE = 149000;
const PRODUCT_NAME = "Wealthplanner Personal — Lifetime Access";

function supabase() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
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

  const xenditKey = process.env.XENDIT_SECRET_KEY;
  if (!xenditKey) {
    return res.status(500).json({ error: "XENDIT_SECRET_KEY belum diset." });
  }

  try {
    const dashboardToken = crypto.randomBytes(32).toString("hex");

    const { error: insertError } = await supabase().from("users").insert({
      user_id: crypto.randomUUID(),
      username: cleanName,
      email: cleanEmail,
      dashboard_token: dashboardToken,
      is_active: 0,
      spreadsheet_id: null,
    });

    if (insertError) {
      console.error("create-payment user insert error:", insertError.message);
      return res.status(500).json({ error: "Gagal menyiapkan akun customer." });
    }

    const invoiceRes = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${xenditKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: dashboardToken,
        amount: PRICE,
        payer_email: cleanEmail,
        description: PRODUCT_NAME,
        success_redirect_url: `https://wealthplanner.id/dashboard?token=${dashboardToken}`,
        failure_redirect_url: "https://wealthplanner.id/checkout?status=failed",
      }),
    });

    const invoice = await invoiceRes.json();

    if (!invoiceRes.ok) {
      console.error("Xendit invoice error:", invoice);
      return res.status(500).json({ error: "Gagal membuat invoice Xendit." });
    }

    return res.status(200).json({
      success: true,
      paymentLink: invoice.invoice_url,
      referenceId: dashboardToken,
      provider: "xendit",
    });
  } catch (error) {
    console.error("create-payment error:", error);
    return res.status(500).json({ error: "Gagal menyiapkan pembayaran." });
  }
}
