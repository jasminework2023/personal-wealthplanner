import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const PRICE = 149000;
const PRODUCT_NAME = "Wealthplanner Personal — Lifetime Access";

function supabase() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
  );
}

function xenditAuthHeader() {
  const key = process.env.XENDIT_SECRET_KEY;
  if (!key) throw new Error("XENDIT_SECRET_KEY belum diset");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
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

    const payload = {
      reference_id: dashboardToken,
      session_type: "PAY",
      mode: "PAYMENT_LINK",
      amount: PRICE,
      currency: "IDR",
      country: "ID",
      locale: "id",
      customer: {
        reference_id: `cust_${crypto.randomBytes(10).toString("hex")}`,
        type: "INDIVIDUAL",
        email: cleanEmail,
        individual_detail: { given_names: cleanName },
      },
      items: [
        {
          reference_id: "wealthplanner-lifetime",
          name: PRODUCT_NAME,
          type: "DIGITAL_PRODUCT",
          category: "PERSONAL_FINANCE",
          description: "Lifetime access to Wealthplanner Personal Finance Dashboard",
          net_unit_amount: PRICE,
          quantity: 1,
        },
      ],
      description: PRODUCT_NAME,
      success_return_url: `https://wealthplanner.id/dashboard/welcome?ref=${encodeURIComponent(dashboardToken)}`,
      cancel_return_url: "https://wealthplanner.id/wealth-tracker-ai.html#pricing",
    };

    const response = await fetch("https://api.xendit.co/sessions", {
      method: "POST",
      headers: {
        Authorization: xenditAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Xendit create session error:", data);
      await supabase().from("users").delete().eq("dashboard_token", dashboardToken);
      return res.status(502).json({ error: data?.message || "Gagal membuat checkout Xendit." });
    }

    return res.status(200).json({
      success: true,
      paymentLink: data.payment_link_url,
      referenceId: dashboardToken,
      paymentSessionId: data.payment_session_id,
    });
  } catch (error) {
    console.error("create-payment error:", error);
    return res.status(500).json({ error: "Gagal membuat pembayaran." });
  }
}
