import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";

const LINK_TTL_MS = 24 * 60 * 60 * 1000;

function botUsername() {
  return String(process.env.TELEGRAM_BOT_USERNAME || "wealthplannerAI").replace(/^@/, "").trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const token = String(req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan." });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    );

    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, username, is_active, telegram_chat_id, telegram_link_code, telegram_link_expires_at")
      .eq("dashboard_token", token)
      .single();

    if (error || !user) return res.status(404).json({ error: "Akun tidak ditemukan." });
    if (!user.is_active) return res.status(403).json({ error: "Pembayaran belum terkonfirmasi." });

    if (user.telegram_chat_id) {
      return res.status(200).json({
        connected: true,
        telegramUrl: `https://t.me/${botUsername()}`,
      });
    }

    const now = Date.now();
    const existingExpiry = user.telegram_link_expires_at ? Date.parse(user.telegram_link_expires_at) : 0;
    const code = user.telegram_link_code && existingExpiry > now
      ? user.telegram_link_code
      : crypto.randomBytes(18).toString("base64url");
    const expiresAt = existingExpiry > now && user.telegram_link_code
      ? user.telegram_link_expires_at
      : new Date(now + LINK_TTL_MS).toISOString();

    const { error: updateError } = await supabase
      .from("users")
      .update({ telegram_link_code: code, telegram_link_expires_at: expiresAt })
      .eq("user_id", user.user_id);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({
      connected: false,
      telegramUrl: `https://t.me/${botUsername()}?start=${encodeURIComponent(code)}`,
      expiresAt,
    });
  } catch (error) {
    console.error("telegram-link error:", error);
    return res.status(500).json({ error: "Gagal menyiapkan link Telegram." });
  }
}
