import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const PLAN_DAYS: Record<string, number> = {
  ai_pro_monthly: 30,
  ai_pro_annual: 365,
};

function addDays(iso: string, days: number) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const callbackToken = process.env.XENDIT_CALLBACK_TOKEN;
  const suppliedToken = String(req.headers["x-callback-token"] || "").trim();
  if (!callbackToken || suppliedToken !== callbackToken) {
    return res.status(401).json({ error: "Callback tidak valid." });
  }

  const payload = req.body || {};
  const externalId = String(payload.external_id || "").trim();
  const status = String(payload.status || "").trim().toUpperCase();
  if (!externalId) return res.status(400).json({ error: "external_id tidak ditemukan." });

  // Only activate on a confirmed successful payment. Pending/expired/failed
  // notifications must never grant AI access.
  if (status !== "PAID" && status !== "SETTLED") {
    return res.status(200).json({ received: true, activated: false, status });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: "Database membership belum dikonfigurasi." });
  }

  try {
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: intent, error: intentError } = await db
      .from("ai_payment_intents")
      .select("external_id, user_id, plan, status")
      .eq("external_id", externalId)
      .maybeSingle();

    if (intentError) throw intentError;
    if (!intent) return res.status(404).json({ error: "Payment intent tidak ditemukan." });

    // Xendit can retry webhook delivery. Do not extend the membership twice.
    if (String(intent.status).toLowerCase() === "paid") {
      return res.status(200).json({ received: true, activated: true, duplicate: true });
    }

    const plan = String(intent.plan || "");
    const durationDays = PLAN_DAYS[plan];
    if (!durationDays) return res.status(400).json({ error: "Plan membership tidak valid." });

    const paidAtRaw = payload.paid_at || payload.created || new Date().toISOString();
    const paidAt = new Date(paidAtRaw);
    const activationAt = Number.isNaN(paidAt.getTime()) ? new Date().toISOString() : paidAt.toISOString();

    const { data: user, error: userError } = await db
      .from("users")
      .select("user_id, ai_membership_expires_at")
      .eq("user_id", String(intent.user_id))
      .maybeSingle();

    if (userError) throw userError;
    if (!user) return res.status(404).json({ error: "User membership tidak ditemukan." });

    const currentExpiry = user.ai_membership_expires_at
      ? Date.parse(user.ai_membership_expires_at)
      : 0;
    const baseDate = currentExpiry > Date.parse(activationAt)
      ? new Date(currentExpiry).toISOString()
      : activationAt;
    const expiresAt = addDays(baseDate, durationDays);

    const creditExpiry = addDays(activationAt, 30);
    const { error: updateUserError } = await db
      .from("users")
      .update({
        ai_membership_plan: plan,
        ai_membership_started_at: activationAt,
        ai_membership_expires_at: expiresAt,
        ai_credits_remaining: 300,
        ai_credit_period_started_at: activationAt,
        ai_credit_period_expires_at: creditExpiry,
      })
      .eq("user_id", String(intent.user_id));

    if (updateUserError) throw updateUserError;

    const { error: updateIntentError } = await db
      .from("ai_payment_intents")
      .update({ status: "paid" })
      .eq("external_id", externalId);

    if (updateIntentError) throw updateIntentError;

    return res.status(200).json({
      received: true,
      activated: true,
      plan,
      startedAt: activationAt,
      expiresAt,
    });
  } catch (error) {
    console.error("xendit-ai-webhook error:", error);
    return res.status(500).json({ error: "Gagal mengaktifkan membership AI." });
  }
}
