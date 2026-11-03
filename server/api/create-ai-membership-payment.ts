import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";

const PLANS = {
  ai_pro_monthly: { amount: 20000, description: "Wealthplanner AI PRO+ — 30 Hari" },
  ai_pro_annual: { amount: 199000, description: "Wealthplanner AI PRO+ — 12 Bulan" },
} as const;

type Plan = keyof typeof PLANS;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  const plan = req.body?.plan as Plan;
  if (!token || token.length > 512 || !Object.prototype.hasOwnProperty.call(PLANS, plan)) {
    return res.status(400).json({ error: "Sesi atau pilihan membership tidak valid." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const xenditKey = process.env.XENDIT_SECRET_KEY;
  if (!supabaseUrl || !serviceRoleKey || !xenditKey) {
    return res.status(503).json({ error: "Pembayaran AI PRO+ belum dikonfigurasi." });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, email, is_active")
      .eq("dashboard_token", token)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
    if (Number(user.is_active) !== 1) return res.status(403).json({ error: "Aktifkan akun Personal terlebih dahulu." });
    if (!user.email) return res.status(400).json({ error: "Email akun belum tersedia. Hubungi support." });

    const selected = PLANS[plan];
    // Opaque provider reference. The dashboard bearer token never leaves our server.
    const externalId = `ai-pro-${randomUUID()}`;
    const { error: intentError } = await supabase.from("ai_payment_intents").insert({
      external_id: externalId,
      user_id: String(user.user_id),
      plan,
      amount_idr: selected.amount,
      status: "pending",
    });
    if (intentError) throw intentError;

    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${xenditKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: externalId,
        amount: selected.amount,
        payer_email: user.email,
        description: selected.description,
        success_redirect_url: "https://wealthplanner.id/dashboard?membership=success",
        failure_redirect_url: "https://wealthplanner.id/dashboard?membership=failed",
      }),
    });

    const invoice = await response.json().catch(() => ({}));
    if (!response.ok || !invoice.invoice_url) {
      console.error("AI PRO+ Xendit invoice error:", invoice);
      await supabase.from("ai_payment_intents").update({ status: "failed" }).eq("external_id", externalId);
      return res.status(502).json({ error: "Gagal membuat invoice AI PRO+." });
    }

    return res.status(200).json({
      success: true,
      paymentLink: invoice.invoice_url,
      plan,
      amount: selected.amount,
      provider: "xendit",
    });
  } catch (error) {
    console.error("create-ai-membership-payment error:", error);
    return res.status(500).json({ error: "Gagal menyiapkan pembayaran AI PRO+." });
  }
}
