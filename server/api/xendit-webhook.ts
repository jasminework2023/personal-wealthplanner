import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import sendActivationEmail from "../lib/email.js";

const USER_COLUMNS =
  "user_id, username, email, dashboard_token, spreadsheet_id, is_active, telegram_chat_id, telegram_link_code, telegram_link_expires_at, last_payment_id, welcome_email_sent_at";

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
  let paymentId = "";
  let payerEmail = "";
  let payerName = "";
  let paid = false;

  // Legacy Invoice webhook
  if (String(body.status || "").toUpperCase() === "PAID") {
    amount = Number(body.amount || body.paid_amount || 0);
    payerEmail = String(body.payer_email || body.customer?.email || "").trim().toLowerCase();
    payerName = String(body.payer_name || body.customer?.given_names || "").trim();
    referenceId = String(body.external_id || "").trim();
    // Invoice id is unique per invoice and identical across Xendit retries.
    paymentId = String(body.id || body.external_id || "").trim();
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
    paymentId = String(data.payment_session_id || data.id || body.id || data.reference_id || "").trim();
    paid = String(data.status || "COMPLETED").toUpperCase() === "COMPLETED";
  }

  if (!paid) return res.status(200).json({ received: true, ignored: true });
  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: "Webhook pembayaran tidak valid." });
  }
  if (!payerEmail && !referenceId) {
    return res.status(400).json({ error: "Identitas customer tidak ditemukan." });
  }
  if (!paymentId) {
    return res.status(400).json({ error: "ID pembayaran tidak ditemukan." });
  }

  const supabase = db();
  let claimedUserId: string | null = null;

  try {
    let user: any = null;

    // New Payment Session: dashboard token is the safest lookup.
    if (body.event === "payment_session.completed" && referenceId) {
      const result = await supabase
        .from("users")
        .select(USER_COLUMNS)
        .eq("dashboard_token", referenceId)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      if (result.data) user = result.data;
    }

    // Legacy Invoice: map by payer email when an account already exists.
    if (!user && payerEmail) {
      const result = await supabase
        .from("users")
        .select(USER_COLUMNS)
        .eq("email", payerEmail)
        .limit(1)
        .maybeSingle();
      if (result.error) throw new Error(result.error.message);
      if (result.data) user = result.data;
    }

    // Recovery for a legacy paid Invoice whose checkout was created before
    // the customer row was saved (wealthplanner.id/api/create-payment does not
    // create a users row). Webhook is authenticated by callback token and the
    // amount is validated above, so we create the missing record.
    let recoveredMissingCustomer = false;
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
          // Recording the payment id on insert lets the unique index on
          // last_payment_id reject a concurrent duplicate delivery of the same
          // payment instead of creating a second customer (and second email).
          last_payment_id: paymentId,
        })
        .select(USER_COLUMNS)
        .single();

      if (insert.data) {
        user = insert.data;
        recoveredMissingCustomer = true;
      } else {
        // Lost the race to another delivery of the same payment: use its row.
        const existing = await supabase
          .from("users")
          .select(USER_COLUMNS)
          .eq("last_payment_id", paymentId)
          .maybeSingle();
        if (!existing.data) {
          throw new Error(insert.error?.message || "Gagal membuat akun customer.");
        }
        user = existing.data;
      }
    }

    // Idempotency: this exact payment was already processed and its email sent.
    // (Replaces the old "is_active === 1" shortcut, which silently skipped the
    // email for any repeat payment by an already-active email address.)
    if (user.last_payment_id === paymentId && user.welcome_email_sent_at) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    // Atomic claim (compare-and-swap). Only one concurrent delivery of the same
    // payment can win this update; the rest get zero rows back and stop here.
    // The claim also records the payment and activates the account, so access is
    // never lost just because the email provider is temporarily down.
    const sentAt = new Date().toISOString();
    let claimQuery = supabase
      .from("users")
      .update({
        last_payment_id: paymentId,
        welcome_email_sent_at: sentAt,
        is_active: 1,
        email: payerEmail || user.email,
      })
      .eq("user_id", user.user_id);

    if (user.last_payment_id === paymentId) {
      // Retry after an earlier email failure (flag was cleared on rollback).
      claimQuery = claimQuery.eq("last_payment_id", paymentId).is("welcome_email_sent_at", null);
    } else if (user.last_payment_id) {
      claimQuery = claimQuery.eq("last_payment_id", user.last_payment_id);
    } else {
      claimQuery = claimQuery.is("last_payment_id", null);
    }

    const claim = await claimQuery.select("user_id");
    if (claim.error) throw new Error(claim.error.message);
    if (!claim.data || claim.data.length === 0) {
      return res.status(200).json({ received: true, duplicate: true, inProgress: true });
    }
    claimedUserId = user.user_id;

    // New customers land on the onboarding page first (Make a Copy -> Connect
    // Sheet flow) instead of the main dashboard.
    const dashboardUrl = `https://www.wealthplanner.id/dashboard/welcome?token=${encodeURIComponent(user.dashboard_token)}`;

    // Create a short-lived one-time Telegram linking code. (Unchanged behaviour.)
    let telegramUrl: string | null = null;
    if (user.telegram_chat_id) {
      telegramUrl = `https://t.me/${String(process.env.TELEGRAM_BOT_USERNAME || "wealthplannerAI").replace(/^@/, "")}`;
    } else {
      const now = Date.now();
      const existingExpiry = user.telegram_link_expires_at ? Date.parse(user.telegram_link_expires_at) : 0;
      const code = user.telegram_link_code && existingExpiry > now
        ? user.telegram_link_code
        : crypto.randomBytes(18).toString("base64url");
      const expiresAt = existingExpiry > now && user.telegram_link_code
        ? user.telegram_link_expires_at
        : new Date(now + 24 * 60 * 60 * 1000).toISOString();

      const { error: linkError } = await supabase
        .from("users")
        .update({ telegram_link_code: code, telegram_link_expires_at: expiresAt })
        .eq("user_id", user.user_id);
      if (linkError) throw new Error(linkError.message);
      telegramUrl = `https://t.me/${String(process.env.TELEGRAM_BOT_USERNAME || "wealthplannerAI").replace(/^@/, "")}?start=${encodeURIComponent(code)}`;
    }

    // Recipient = the email that paid. Sender comes from RESEND_FROM_EMAIL
    // (default: Wealthplanner <hello@wealthplanner.id>).
    await sendActivationEmail({
      to: payerEmail || user.email,
      name: payerName || user.username,
      product: productName(amount),
      dashboardUrl,
      telegramUrl,
      idempotencyKey: `welcome-${paymentId}`,
    });

    return res.status(200).json({
      received: true,
      activated: true,
      emailSent: true,
      product: productName(amount),
      needsSpreadsheet: !user.spreadsheet_id,
      recoveredMissingCustomer,
    });
  } catch (error) {
    console.error("xendit-webhook activation/email error:", error);

    // If we claimed the payment but the email did not go out, release the
    // "email sent" flag (keep is_active = 1) so Xendit's retry can send it.
    if (claimedUserId) {
      const { error: rollbackError } = await supabase
        .from("users")
        .update({ welcome_email_sent_at: null })
        .eq("user_id", claimedUserId)
        .eq("last_payment_id", paymentId);
      if (rollbackError) console.error("xendit-webhook rollback error:", rollbackError.message);
    }

    return res.status(500).json({
      error: "Aktivasi atau pengiriman email gagal; webhook akan dicoba lagi.",
    });
  }
}
