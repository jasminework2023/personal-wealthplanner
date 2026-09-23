import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import sendActivationEmail from "../lib/email.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
  );
}

function getSignature(req: VercelRequest) {
  const value = req.headers["x-lynk-signature"];
  return Array.isArray(value) ? value[0] : value;
}

function validSignature(refId: string, amount: number, messageId: string, received: string | undefined) {
  const secret = process.env.LYNK_MERCHANT_KEY;
  if (!secret || !received) return false;

  const raw = `${amount}${refId}${messageId}${secret}`;
  const calculated = crypto.createHash("sha256").update(raw).digest("hex");
  const a = Buffer.from(calculated, "utf8");
  const b = Buffer.from(String(received), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isValidAmount(amount: number) {
  return [149000, 139000].includes(amount);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const body = req.body || {};
  if (body.event !== "payment.received") {
    return res.status(200).json({ received: true, ignored: true });
  }

  const data = body.data || {};
  const messageData = data.message_data || {};
  const customer = messageData.customer || {};
  const amount = Number(messageData.totals?.grandTotal || 0);
  const refId = String(messageData.refId || "").trim();
  const messageId = String(data.message_id || "").trim();
  const signature = getSignature(req);
  const payerEmail = String(customer.email || "").trim().toLowerCase();
  const payerName = String(customer.name || "").trim();

  if (!refId || !messageId || !isValidAmount(amount)) {
    return res.status(400).json({ error: "Webhook pembayaran Lynk tidak valid." });
  }

  if (!validSignature(refId, amount, messageId, signature)) {
    return res.status(401).json({ error: "Unauthorized webhook" });
  }

  if (!payerEmail) {
    return res.status(400).json({ error: "Email customer tidak ditemukan." });
  }

  try {
    const supabase = db();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, username, email, dashboard_token, spreadsheet_id, is_active")
      .eq("email", payerEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userError || !user) {
      console.error("lynk-webhook customer not found", { payerEmail, refId, amount });
      return res.status(404).json({ error: "Customer tidak ditemukan." });
    }

    // Idempotent: Lynk may retry the same successful event. is_active is INTEGER 0/1.
    if (Number(user.is_active) === 1) {
      return res.status(200).json({ received: true, alreadyActive: true });
    }

    const dashboardUrl =
      `https://wealthplanner.id/dashboard?token=${encodeURIComponent(user.dashboard_token)}`;

    await sendActivationEmail({
      to: payerEmail,
      name: payerName || user.username,
      product: amount === 139000 ? "Wealth Tracker AI" : "Wealthplanner Personal",
      dashboardUrl,
    });

    const { error: updateError } = await supabase
      .from("users")
      .update({ is_active: 1, email: payerEmail })
      .eq("user_id", user.user_id);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({
      received: true,
      activated: true,
      dashboardUrl,
      spreadsheetUrl: user.spreadsheet_id
        ? `https://docs.google.com/spreadsheets/d/${user.spreadsheet_id}/edit`
        : null,
      needsSpreadsheet: !user.spreadsheet_id,
    });
  } catch (error) {
    console.error("lynk-webhook activation/email error:", error);
    return res.status(500).json({
      error: "Aktivasi atau pengiriman email gagal; webhook akan dicoba lagi.",
    });
  }
}
