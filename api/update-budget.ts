// api/update-budget.ts — Simpan angka budget kategori bulan tertentu,
// nulis balik ke sel yang sesuai di tab "Budgeting".
// Self-contained (semua helper inline, nggak import dari file lain)
// biar nggak ada masalah path pas upload manual ke GitHub.

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function colLetter(idx: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[idx + 1];
}

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

  const { token, category, month, amount } = req.body || {};
  if (!token || !category || !month || amount === undefined) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

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
      range: "Budgeting!B1:N40",
    });
    const rows = read.data.values || [];

    const headerIdx = findRowIndex(rows, month);
    if (headerIdx === -1) return res.status(404).json({ error: "Bulan tidak ditemukan di sheet" });
    const header = rows[headerIdx] || [];
    const colIdx = header.findIndex((c) => String(c || "").trim().toLowerCase() === String(month).toLowerCase());
    if (colIdx === -1) return res.status(404).json({ error: "Kolom bulan tidak ditemukan" });

    const rowIdx = findRowIndex(rows, category, headerIdx + 1);
    if (rowIdx === -1) return res.status(404).json({ error: "Kategori tidak ditemukan" });

    const cell = `Budgeting!${colLetter(colIdx)}${rowIdx + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: user.spreadsheet_id,
      range: cell,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[amount]] },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("update-budget error:", (err as Error).message);
    return res.status(500).json({ error: "Gagal menyimpan" });
  }
}
