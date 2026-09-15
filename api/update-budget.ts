import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function colLetter(idx: number): string {
  let n = idx + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function findRowIndex(rows: unknown[][], needle: string, from = 0): number {
  const target = needle.toLowerCase();
  for (let i = from; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.some((c) => String(c || "").trim().toLowerCase() === target)) return i;
  }
  return -1;
}

function findSectionIndex(rows: unknown[][], type: string): number {
  const aliases = type === "Income" ? ["income"] : type === "Saving" ? ["saving", "savings"] : ["expense", "expenses"];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const text = row.map((c) => String(c || "").trim().toLowerCase()).join(" ");
    if (aliases.some((alias) => text === alias || text.includes(` ${alias} `) || text.startsWith(`${alias} `))) return i;
  }
  return -1;
}

function getSheetsClient() {
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

  const { token, type, category, month, amount } = req.body || {};
  if (!token || !type || !category || !month || amount === undefined) return res.status(400).json({ error: "Data tidak lengkap" });
  if (!["Income", "Expense", "Saving"].includes(type)) return res.status(400).json({ error: "Tipe budget tidak valid" });

  try {
    const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string);
    const { data: user, error } = await supabase.from("users").select("spreadsheet_id, is_active").eq("dashboard_token", token).single();
    if (error || !user || !user.is_active || !user.spreadsheet_id) return res.status(404).json({ error: "Akun tidak ditemukan" });

    const sheets = getSheetsClient();
    const read = await sheets.spreadsheets.values.get({ spreadsheetId: user.spreadsheet_id, range: "Budgeting!B1:N80" });
    const rows = read.data.values || [];
    const headerIdx = findRowIndex(rows, month);
    if (headerIdx === -1) return res.status(404).json({ error: "Bulan tidak ditemukan di sheet" });
    const header = rows[headerIdx] || [];
    const colIdx = header.findIndex((c) => String(c || "").trim().toLowerCase() === String(month).toLowerCase());
    if (colIdx === -1) return res.status(404).json({ error: "Kolom bulan tidak ditemukan" });

    const sectionIdx = findSectionIndex(rows, type);
    const nextSections = ["Income", "Saving", "Expense"]
      .map((t) => findSectionIndex(rows, t))
      .filter((i) => i >= 0 && i > sectionIdx);
    const endIdx = sectionIdx >= 0 && nextSections.length ? Math.min(...nextSections) : rows.length;
    const startSearch = sectionIdx >= 0 ? Math.max(sectionIdx + 1, headerIdx + 1) : headerIdx + 1;
    let rowIdx = -1;
    for (let i = startSearch; i < endIdx; i++) {
      const label = String(rows[i]?.[0] || "").trim().toLowerCase();
      if (label === String(category).trim().toLowerCase()) { rowIdx = i; break; }
    }
    if (rowIdx === -1) return res.status(404).json({ error: `Kategori ${category} tidak ditemukan di section ${type}` });

    const cell = `Budgeting!${colLetter(colIdx)}${rowIdx + 1}`;
    await sheets.spreadsheets.values.update({ spreadsheetId: user.spreadsheet_id, range: cell, valueInputOption: "USER_ENTERED", requestBody: { values: [[Number(amount)]] } });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("update-budget error:", (err as Error).message);
    return res.status(500).json({ error: "Gagal menyimpan" });
  }
}
