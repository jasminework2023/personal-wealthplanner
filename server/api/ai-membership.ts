import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
  if (!token || token.length > 512) {
    return res.status(401).json({ error: "Sesi tidak valid." });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(503).json({ error: "Layanan membership belum tersedia." });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: user, error } = await supabase
      .from("users")
      .select([
        "user_id",
        "is_active",
        "lifetime_pro_status",
        "ai_trial_started_at",
        "ai_trial_expires_at",
        "ai_membership_plan",
        "ai_membership_started_at",
        "ai_membership_expires_at",
        "ai_credits_remaining",
        "ai_credit_period_started_at",
        "ai_credit_period_expires_at",
      ].join(", "))
      .eq("dashboard_token", token)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(401).json({ error: "Sesi tidak valid." });
    if (!user.is_active) return res.status(403).json({ error: "Akun belum aktif." });

    const now = Date.now();
    const trialExpiry = user.ai_trial_expires_at ? Date.parse(user.ai_trial_expires_at) : 0;
    const membershipExpiry = user.ai_membership_expires_at ? Date.parse(user.ai_membership_expires_at) : 0;
    const trialActive = trialExpiry > now;
    const membershipActive = membershipExpiry > now;
    const aiActive = trialActive || membershipActive;
    const creditPeriodExpiry = user.ai_credit_period_expires_at
      ? Date.parse(user.ai_credit_period_expires_at)
      : 0;
    const creditPeriodExpired = !creditPeriodExpiry || creditPeriodExpiry <= now;

    return res.status(200).json({
      accountActive: true,
      lifetimePro: Boolean(user.lifetime_pro_status),
      aiAccess: aiActive ? "active" : "expired",
      aiAccessSource: membershipActive ? "ai_pro" : trialActive ? "lifetime_trial" : null,
      aiTrialStartedAt: user.ai_trial_started_at,
      aiTrialExpiresAt: user.ai_trial_expires_at,
      aiMembershipPlan: user.ai_membership_plan,
      aiMembershipStartedAt: user.ai_membership_started_at,
      aiMembershipExpiresAt: user.ai_membership_expires_at,
      creditsRemaining: aiActive
        ? (creditPeriodExpired ? 300 : Number(user.ai_credits_remaining) || 0)
        : 0,
      creditPeriodStartedAt: creditPeriodExpired ? null : user.ai_credit_period_started_at,
      creditPeriodExpiresAt: creditPeriodExpired ? null : user.ai_credit_period_expires_at,
      nextCreditRefreshAt: creditPeriodExpired ? now : creditPeriodExpiry,
    });
  } catch (error) {
    console.error("ai-membership error:", error);
    return res.status(500).json({ error: "Gagal memuat status membership AI." });
  }
}
