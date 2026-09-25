import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getGoogleCredentials() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_CREDENTIALS belum diset");
  return JSON.parse(raw);
}

function getSheetsClient() {
  const credentials = getGoogleCredentials();
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
  const ref = typeof req.query.ref === "string" ? req.query.ref.trim() : "";
  if (!ref) return res.status(400).json({ error: "Reference tidak ditemukan." });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    );

    const { data: user, error } = await supabase
      .from("users")
      .select("username, dashboard_token, spreadsheet_id, is_active")
      .eq("dashboard_token", ref)
      .single();

    if (error || !user) return res.status(404).json({ error: "Customer tidak ditemukan." });

    let serviceAccountEmail = "";
    try { serviceAccountEmail = String(getGoogleCredentials().client_email || ""); } catch { /* optional for onboarding */ }

    const paymentActive = Number(user.is_active) === 1;
    const ready = Boolean(paymentActive && user.spreadsheet_id);

    const templateSource = process.env.GOOGLE_TEMPLATE_URL || "https://docs.google.com/spreadsheets/d/1N-IJSv76LwaBv-RNmf-fPtI5oCBsa2cM0VYZWAI1apo";
    const templateMatch = templateSource.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const templateUrl = templateMatch
      ? `https://docs.google.com/spreadsheets/d/${templateMatch[1]}/copy`
      : templateSource;

    return res.status(200).json({
      ready,
      paymentActive,
      activationStatus: paymentActive ? "active" : "waiting_payment_confirmation",
      activationMessage: paymentActive
        ? "Pembayaran sudah terkonfirmasi. Akses dashboard aktif."
        : "Pembayaran belum terkonfirmasi. Sistem akan mengaktifkan akses otomatis setelah webhook pembayaran diterima.",
      username: user.username,
      dashboardUrl: `https://wealthplanner.id/dashboard/welcome?token=${encodeURIComponent(user.dashboard_token)}`,
      spreadsheetUrl: user.spreadsheet_id
        ? `https://docs.google.com/spreadsheets/d/${user.spreadsheet_id}/edit`
        : null,
      templateUrl,
      serviceAccountEmail,
    });
  } catch (error) {
    console.error("access error:", error);
    return res.status(500).json({ error: "Gagal mengecek akses." });
  }
}
