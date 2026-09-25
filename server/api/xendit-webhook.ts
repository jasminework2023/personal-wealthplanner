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

function getCallbackToken(req: VercelRequest) {
  const value = req.headers["x-callback-token"];
  return Array.isArray(value) ? value[0] : value;
}

function isValidAmount(amount: number) {
  return [149000, 139000].includes(amount);
}

function productName(amount: number) {
  return amount === 139000 ? "Wealth Tracker AI" : "Wealthplanner Personal";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const callbackToken = getCallbackToken(req);
  const expected = process.env.XENDIT_WEBHOOK_TOKEN;
  if (!expected || !callbackToken || callbackToken !== expected) {
    return res.status(401).json({ error: "Unauthorized webhook" });
  }

  const body = req.body || {};
  let amount = 0;
  let referenceId = "";
  let payerEmail = "";
  let payerName = "";
  let paid = false;

  // Legacy Invoice webhook
  if (String(body.status || "").toUpperCase() === "PAID") {
    amount = Number(body.amount || body.paid_amount || 0);
    payerEmail = String(body.payer_email || "").trim().toLowerCase();
    payerName = String(body.payer_name || "").trim();
    referenceId = String(body.external_id || "").trim();
    paid = true;
  }

  // Payment Session webhook
  if (body.event === "payment_session.completed") {
    const data = body.data || {};
    amount = Number(data.amount || 0);
    referenceId = String(data.reference_id || "").trim();
    payerEmail = String(
      data.customer?.email ||
      data.customer_details?.email ||
      body.customer?.email ||
      "",
    ).trim().toLowerCase();
    payerName = String(
      data.customer?.individual_detail?.given_names ||
      data.customer?.name ||
      "",
    ).trim();
    paid = String(data.status || "COMPLETED").toUpperCase() === "COMPLETED";
  }

  if (!paid) return res.status(200).json({ received: true, ignored: true });
  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: "Webhook pembayaran tidak valid." });
  }
  if (!payerEmail && !referenceId) {
    return res.status(400).json({ error: "Identitas customer tidak ditemukan." });
  }

  try {
    const supabase = db();
    let user: any = null;

    // New Payment Session: dashboard token is the safest lookup.
    if (body.event === "payment_session.completed" && referenceId) {
      const result = await supabase
        .from("users")
        .select("user_id, username, email, dashboard_token, spreadsheet_id, is_active")
        .eq("dashboard_token", referenceId)
        .maybeSingle();
      if (!result.error && result.data) user = result.data;
    }

    // Legacy Invoice: map by payer email when an account already exists.
    if (!user && payerEmail) {
      const result = await supabase
        .from("users")
        .select("user_id, username, email, dashboard_token, spreadsheet_id, is_active")
        .eq("email", payerEmail)
        .limit(1)
        .maybeSingle();
      if (!result.error && result.data) user = result.data;
    }

    // If already active and the personal Sheet already exists, this webhook is a duplicate.
    // If the Sheet is missing, continue so a previous partial failure can be repaired.
    if (user && Number(user.is_active) === 1 && user.spreadsheet_id) {
      return res.status(200).json({ received: true, alreadyActive: true });
    }

    // Recovery for a legacy paid Invoice whose checkout was created before
    // the customer row was saved. The webhook is authenticated by Xendit's
    // callback token and the amount is validated above, so we can safely
    // create the missing access record instead of losing the payment.
    if (!user) {
      if (!payerEmail) {
        return res.status(400).json({ error: "Email customer tidak ditemukan." });
      }

      const dashboardToken = crypto.randomBytes(32).toString("hex");
      const username = payerName || payerEmail.split("@")[0] || "Customer";

      const insert = await supabase
        .from("users")
        .insert({
          user_id: crypto.randomUUID(),
          username,
          email: payerEmail,
          dashboard_token: dashboardToken,
          is_active: 0,
          spreadsheet_id: null,
        })
        .select("user_id, username, email, dashboard_token, spreadsheet_id, is_active")
        .single();

      if (insert.error || !insert.data) {
        throw new Error(insert.error?.message || "Gagal membuat akun customer.");
      }
      user = insert.data;
    }

    const customerEmail = payerEmail || user.email;
    const customerName = payerName || user.username;
    const dashboardUrl =
      `https://wealthplanner.id/dashboard?token=${encodeURIComponent(user.dashboard_token)}`;

    // Create one personal copy of the template, or reuse the existing Sheet.
    const spreadsheet = await createCustomerSpreadsheet({
      customerEmail,
      customerName,
      existingSpreadsheetId: user.spreadsheet_id,
    });

    const { error: sheetUpdateError } = await supabase
      .from("users")
      .update({ spreadsheet_id: spreadsheet.id })
      .eq("user_id", user.user_id);

    if (sheetUpdateError) throw new Error(sheetUpdateError.message);

    // Send email after the Sheet is ready. If Resend fails, Xendit can retry
    // and the existing spreadsheet_id will be reused instead of creating another copy.
    await sendActivationEmail({
      to: customerEmail,
      name: customerName,
      product: productName(amount),
      dashboardUrl,
      spreadsheetUrl: spreadsheet.url,
    });

    const { error: updateError } = await supabase
      .from("users")
      .update({ is_active: 1, email: customerEmail })
      .eq("user_id", user.user_id);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({
      received: true,
      activated: true,
      product: productName(amount),
      spreadsheetUrl: spreadsheet.url,
      recoveredMissingCustomer: !user.email,
    });
  } catch (error) {
    console.error("xendit-webhook activation/email error:", error);
    return res.status(500).json({
      error: "Aktivasi atau pengiriman email gagal; webhook akan dicoba lagi.",
    });
  }
}
