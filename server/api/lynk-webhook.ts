import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import sendActivationEmail from "../lib/email.js";
import createCustomerSpreadsheet from "../lib/google-sheet.js";

function db() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
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

    // If already active and the personal Sheet already exists, this webhook is a duplicate.
    // If the Sheet is missing, continue so a previous partial failure can be repaired.
    if (Number(user.is_active) === 1 && user.spreadsheet_id) {
      return res.status(200).json({ received: true, alreadyActive: true });
    }

    const customerName = payerName || user.username;
    const dashboardUrl =
      `https://wealthplanner.id/dashboard?token=${encodeURIComponent(user.dashboard_token)}`;

    const spreadsheet = await createCustomerSpreadsheet({
      customerEmail: payerEmail,
      customerName,
      existingSpreadsheetId: user.spreadsheet_id,
    });

    const { error: sheetUpdateError } = await supabase
      .from("users")
      .update({ spreadsheet_id: spreadsheet.id })
      .eq("user_id", user.user_id);

    if (sheetUpdateError) throw new Error(sheetUpdateError.message);

    await sendActivationEmail({
      to: payerEmail,
      name: customerName,
      product: amount === 139000 ? "Wealth Tracker AI" : "Wealthplanner Personal",
      dashboardUrl,
      spreadsheetUrl: spreadsheet.url,
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
      spreadsheetUrl: spreadsheet.url,
      needsSpreadsheet: false,
    });
  } catch (error) {
    console.error("lynk-webhook activation/email error:", error);
    return res.status(500).json({
      error: "Aktivasi atau pengiriman email gagal; webhook akan dicoba lagi.",
    });
  }
}
