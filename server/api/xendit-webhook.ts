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

import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const PRICE = 139000;
const PRODUCT_NAME = "Wealth Tracker AI";

function db() {
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

  const { name, email, phone } = req.body || {};
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPhone = String(phone || "").trim();

  if (!cleanName || !cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Nama dan email wajib diisi dengan benar." });
  }

  try {
    const dashboardToken = crypto.randomBytes(32).toString("hex");

    const { error: insertError } = await db().from("users").insert({
      username: cleanName,
      dashboard_token: dashboardToken,
      is_active: false,
      spreadsheet_id: null,
    });

    if (insertError) {
      console.error("wealth-tracker user insert error:", insertError.message);
      return res.status(500).json({ error: "Gagal menyiapkan akses customer." });
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
        mobile_number: cleanPhone || undefined,
        individual_detail: { given_names: cleanName },
      },
      items: [{
        reference_id: "wealth-tracker-ai",
        name: PRODUCT_NAME,
        type: "DIGITAL_PRODUCT",
        category: "PERSONAL_FINANCE",
        description: "Wealth Tracker AI",
        net_unit_amount: PRICE,
        quantity: 1,
      }],
      description: PRODUCT_NAME,
      success_return_url: `https://wealthplanner.id/dashboard/welcome?ref=${encodeURIComponent(dashboardToken)}`,
      cancel_return_url: "https://wealthplanner.id/wealth-tracker-ai.html",
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

    if (!response.ok || !data?.payment_link_url) {
      console.error("Xendit Wealth Tracker session error:", data);
      await db().from("users").delete().eq("dashboard_token", dashboardToken);
      return res.status(502).json({ error: data?.message || "Gagal membuat checkout Xendit." });
    }

    return res.status(200).json({
      success: true,
      paymentLink: data.payment_link_url,
      referenceId: dashboardToken,
      paymentSessionId: data.payment_session_id,
    });
  } catch (error) {
    console.error("wealth-tracker payment error:", error);
    return res.status(500).json({ error: "Gagal membuat pembayaran." });
  }
}
