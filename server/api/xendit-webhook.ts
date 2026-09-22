import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import sendActivationEmail from "../lib/email";

function db() {
  return createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
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

  /*
   * This endpoint supports both:
   * 1) Legacy Invoice webhook: status === "PAID"
   * 2) Payment Session webhook: event === "payment_session.completed"
   *
   * Xendit documents these as different webhook models; legacy invoices
   * send paid-invoice notifications, while Payment Sessions use their own
   * lifecycle event. See Xendit's webhook docs.
   */

  let amount = 0;
  let referenceId = "";
  let payerEmail = "";
  let payerName = "";
  let paid = false;

  // Legacy Invoice payload, e.g.:
  // { status: "PAID", amount: 149000, payer_email: "...", external_id: "WP-..." }
  if (body.status === "PAID") {
    amount = Number(body.amount || body.paid_amount || 0);
    payerEmail = String(body.payer_email || "").trim().toLowerCase();
    payerName = String(body.payer_name || "").trim();
    referenceId = String(body.external_id || "").trim();
    paid = true;
  }

  // Payment Session payload.
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

  // Ignore unrelated webhook events with a successful acknowledgement.
  if (!paid) {
    return res.status(200).json({ received: true, ignored: true });
  }

  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: "Webhook pembayaran tidak valid." });
  }

  if (!payerEmail && !referenceId) {
    return res.status(400).json({ error: "Identitas customer tidak ditemukan." });
  }

  try {
    const supabase = db();

    /*
     * New checkout records store the customer's email.
     * Payment Session records can also be found directly by dashboard_token.
     * Legacy Invoice payloads do not contain dashboard_token, so email is the
     * safe bridge between the invoice and the pending customer record.
     */
    let user: {
      user_id: string;
      username: string;
      email: string | null;
      dashboard_token: string;
      spreadsheet_id: string | null;
      is_active: boolean;
    } | null = null;

    if (body.event === "payment_session.completed" && referenceId) {
      const result = await supabase
        .from("users")
        .select("user_id, username, email, dashboard_token, spreadsheet_id, is_active")
        .eq("dashboard_token", referenceId)
        .single();

      if (!result.error) user = result.data;
    }

    if (!user && payerEmail) {
      const result = await supabase
        .from("users")
        .select("user_id, username, email, dashboard_token, spreadsheet_id, is_active")
        .eq("email", payerEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!result.error && result.data) user = result.data;
    }

    if (!user) {
      console.error("xendit-webhook customer not found", {
        payerEmail,
        referenceId,
        amount,
      });
      return res.status(404).json({ error: "Customer tidak ditemukan." });
    }

    if (user.is_active) {
      return res.status(200).json({
        received: true,
        alreadyActive: true,
      });
    }

    const dashboardUrl =
      `https://wealthplanner.id/dashboard?token=${encodeURIComponent(user.dashboard_token)}`;

    /*
     * Send the email before marking the account active. If Resend fails,
     * return 500 so Xendit retries instead of activating silently.
     */
    if (payerEmail) {
      await sendActivationEmail({
        to: payerEmail,
        name: payerName || user.username,
        product: productName(amount),
        dashboardUrl,
      });
    } else {
      return res.status(400).json({ error: "Email customer tidak ditemukan." });
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_active: true,
        email: payerEmail,
      })
      .eq("user_id", user.user_id);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({
      received: true,
      activated: true,
      product: productName(amount),
      needsSpreadsheet: !user.spreadsheet_id,
    });
  } catch (error) {
    console.error("xendit-webhook activation/email error:", error);
    return res.status(500).json({
      error: "Aktivasi atau pengiriman email gagal; webhook akan dicoba lagi.",
    });
  }
}
