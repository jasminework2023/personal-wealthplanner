// api/update-asset.ts — Simpan angka value item Liquid/Investment Assets.
// Self-contained, nggak import dari file lain.

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const VALUE_COL_LETTER = "E";

function findRowIndex(rows: unknown[][], needle: string, from = 0): number {
  for (let i = from; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.some((c) => String(c || "").toLowerCase().includes(needle.toLowerCase()))) return i;
  }
  return -1;
}

async function getWriteClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { token, section, name, value } = req.body || {};
  if (!token || !section || !name || value === undefined) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }
  const sectionLabel = section === "liquid" ? "Liquid Assets" : "Investment Assets";

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

    const sheets = await getWriteClient();
    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: user.spreadsheet_id,
      range: "Asset Tracker!B1:N45",
    });
    const rows = read.data.values || [];

    const sectionIdx = findRowIndex(rows, sectionLabel);
    if (sectionIdx === -1) return res.status(404).json({ error: "Section tidak ditemukan" });
    const itemRowIdx = findRowIndex(rows, name, sectionIdx + 2);
    if (itemRowIdx === -1) return res.status(404).json({ error: "Item tidak ditemukan" });

    const cell = `Asset Tracker!${VALUE_COL_LETTER}${itemRowIdx + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: user.spreadsheet_id,
      range: cell,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[value]] },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("update-asset error:", (err as Error).message);
    return res.status(500).json({ error: "Gagal menyimpan" });
  }
}
