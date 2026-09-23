import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const PRICE = 139000;
const PRODUCT_NAME = "Wealth Tracker AI";

function db() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  );
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^0-9+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  if (digits.startsWith("62")) return `+${digits}`;
  return digits;
}

function xenditAuthHeader() {
  const key = process.env.XENDIT_SECRET_KEY;
  if (!key) throw new Error("XENDIT_SECRET_KEY belum diset");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const phone = normalizePhone(String(req.body?.phone || "").trim());

  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Nama dan email wajib diisi dengan benar." });
  }

  try {
    const dashboardToken = crypto.randomBytes(32).toString("hex");

    const { error: insertError } = await db().from("users").insert({
      user_id: crypto.randomUUID(),
      username: name,
      dashboard_token: dashboardToken,
      is_active: 0,
      spreadsheet_id: null,
    });

    if (insertError) {
      console.error("wealth-tracker user insert error:", insertError.message);
      return res.status(500).json({ error: "Gagal menyiapkan akses customer." });
    }

    const payload: Record<string, any> = {
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
        email,
        ...(phone ? { mobile_number: phone } : {}),
        individual_detail: { given_names: name },
      },
      items: [
        {
          reference_id: "wealth-tracker-ai",
          name: PRODUCT_NAME,
          description: "Wealth Tracker AI — Excel + Google Sheets",
          type: "DIGITAL_PRODUCT",
          category: "PERSONAL_FINANCE",
          net_unit_amount: PRICE,
          quantity: 1,
          currency: "IDR",
        },
      ],
      description: `${PRODUCT_NAME} — Lifetime Access`,
      success_return_url: `https://wealthplanner.id/dashboard/welcome?ref=${encodeURIComponent(dashboardToken)}`,
      cancel_return_url: "https://wealthplanner.id/wealth-tracker-ai.html?payment=cancelled",
    };

    const response = await fetch("https://api.xendit.co/sessions", {
      method: "POST",
      headers: {
        Authorization: xenditAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.payment_link_url) {
      console.error("Xendit Wealth Tracker session error:", data);
      await db().from("users").delete().eq("dashboard_token", dashboardToken);
      return res.status(502).json({ error: data?.message || "Gagal membuat checkout Xendit." });
    }

    return res.status(200).json({
      success: true,
      paymentLink: data.payment_link_url,
      dashboardToken,
      paymentSessionId: data.payment_session_id,
    });
  } catch (error) {
    console.error("wealth-tracker-payment error:", error);
    return res.status(500).json({ error: "Gagal membuat pembayaran. Coba lagi." });
  }
}
