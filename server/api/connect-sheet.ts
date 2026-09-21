import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getSheetsClient() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_CREDENTIALS belum diset");
  const credentials = JSON.parse(raw);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

function extractSpreadsheetId(input: string) {
  const value = String(input || "").trim();
  if (!value) return "";
  const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const token = String(req.body?.token || "").trim();
  const spreadsheetId = extractSpreadsheetId(req.body?.spreadsheetId || req.body?.spreadsheetUrl || "");
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan." });
  if (!spreadsheetId) return res.status(400).json({ error: "Link atau Spreadsheet ID belum diisi." });

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_ANON_KEY as string,
    );

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("username, is_active")
      .eq("dashboard_token", token)
      .single();

    if (userError || !user) return res.status(404).json({ error: "Akun tidak ditemukan." });
    if (!user.is_active) return res.status(403).json({ error: "Pembayaran belum terkonfirmasi." });

    // Verify that the system account can access the customer's copied Sheet.
    // The customer keeps ownership of the copy; the system only needs access to run the dashboard/bot.
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "spreadsheetId,properties(title)",
    });

    if (!meta.data.spreadsheetId) throw new Error("Spreadsheet tidak ditemukan.");

    const { error: updateError } = await supabase
      .from("users")
      .update({ spreadsheet_id: spreadsheetId })
      .eq("dashboard_token", token);

    if (updateError) throw new Error(updateError.message);

    return res.status(200).json({
      success: true,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      title: meta.data.properties?.title || "Google Sheet",
      dashboardUrl: `https://wealthplanner.id/dashboard?token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    console.error("connect-sheet error:", error);
    return res.status(400).json({
      error: "Sheet belum bisa diakses sistem. Pastikan kamu sudah Make a copy dari template lalu share Sheet tersebut dengan email sistem yang ditampilkan di halaman ini.",
    });
  }
}
