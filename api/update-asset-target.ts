import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function parseNumber(value: unknown): number {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function findTarget(rows: unknown[][]) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const c = row.findIndex((cell) => String(cell ?? "").trim().toLowerCase().includes("target"));
    if (c >= 0) return { row: r, col: c };
  }
  return null;
}

function colLetter(index: number) {
  let n = index + 2; // values range starts at column B
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { token, value } = req.body || {};
  const target = parseNumber(value);
  if (!token || target <= 0) return res.status(400).json({ error: "Target aset tidak valid" });

  try {
    const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string);
    const { data: user, error } = await supabase
      .from("users")
      .select("spreadsheet_id, is_active")
      .eq("dashboard_token", token)
      .single();

    if (error || !user || !user.is_active || !user.spreadsheet_id) {
      return res.status(404).json({ error: "Akun tidak ditemukan" });
    }

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: user.spreadsheet_id,
      range: "Asset Tracker!B1:N45",
    });
    const rows = read.data.values || [];
    const found = findTarget(rows);
    if (!found) return res.status(404).json({ error: "Kolom Target tidak ditemukan" });

    const cell = `Asset Tracker!${colLetter(found.col)}${found.row + 2}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: user.spreadsheet_id,
      range: cell,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[target]] },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("update-asset-target error:", (err as Error).message);
    return res.status(500).json({ error: "Gagal menyimpan target aset" });
  }
}
