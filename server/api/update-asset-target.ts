import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getSheetsClient() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_CREDENTIALS belum diset");
  const credentials = JSON.parse(raw);
  const auth = new google.auth.JWT({ email: credentials.client_email, key: credentials.private_key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return google.sheets({ version: "v4", auth });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  const { token, value } = req.body || {};
  if (!token || value === undefined) return res.status(400).json({ error: "Data tidak lengkap" });
  try {
    const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string);
    const { data: user, error } = await supabase.from("users").select("spreadsheet_id, is_active").eq("dashboard_token", token).single();
    if (error || !user || !user.is_active || !user.spreadsheet_id) return res.status(404).json({ error: "Akun tidak ditemukan" });
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: user.spreadsheet_id, fields: "sheets.properties(sheetId,title)" });
    const sheet = (meta.data.sheets || []).find((x) => String(x.properties?.title || "").trim().toLowerCase().replace(/\s+/g, "") === "assettracker");
    if (!sheet?.properties?.title) return res.status(404).json({ error: "Tab Asset Tracker tidak ditemukan" });
    const title = String(sheet.properties.title).replace(/'/g, "''");
    const read = await sheets.spreadsheets.values.get({ spreadsheetId: user.spreadsheet_id, range: `'${title}'!B1:N45` });
    const rows = read.data.values || []; let targetRow = -1; let targetCol = -1;
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < (rows[r] || []).length; c++) if (String(rows[r][c] ?? "").trim().toLowerCase() === "target") { targetRow = r + 2; targetCol = c + 2; break; }
    if (targetRow < 0) return res.status(404).json({ error: "Target tidak ditemukan di Asset Tracker" });
    let n = targetCol, col = ""; while (n > 0) { const rem = (n - 1) % 26; col = String.fromCharCode(65 + rem) + col; n = Math.floor((n - 1) / 26); }
    await sheets.spreadsheets.values.update({ spreadsheetId: user.spreadsheet_id, range: `'${title}'!${col}${targetRow}`, valueInputOption: "USER_ENTERED", requestBody: { values: [[Number(value) || 0]] } });
    return res.status(200).json({ success: true });
  } catch (err) { console.error("update-asset-target error:", err); return res.status(500).json({ error: err instanceof Error ? err.message : "Gagal menyimpan target" }); }
}
