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
      process.env.SUPABASE_ANON_KEY as string,
    );

    const { data: user, error } = await supabase
      .from("users")
      .select("username, dashboard_token, spreadsheet_id, is_active")
      .eq("dashboard_token", ref)
      .single();

    if (error || !user) return res.status(404).json({ error: "Customer tidak ditemukan." });

    let serviceAccountEmail = "";
    try { serviceAccountEmail = String(getGoogleCredentials().client_email || ""); } catch { /* optional for onboarding */ }

    return res.status(200).json({
      ready: Boolean(user.is_active && user.spreadsheet_id),
      paymentActive: Boolean(user.is_active),
      username: user.username,
      dashboardUrl: `https://wealthplanner.id/dashboard?token=${encodeURIComponent(user.dashboard_token)}`,
      spreadsheetUrl: user.spreadsheet_id
        ? `https://docs.google.com/spreadsheets/d/${user.spreadsheet_id}/edit`
        : null,
      templateUrl: process.env.GOOGLE_TEMPLATE_URL || null,
      serviceAccountEmail,
    });
  } catch (error) {
    console.error("access error:", error);
    return res.status(500).json({ error: "Gagal mengecek akses." });
  }
}
