// api/dashboard.ts
// Dipanggil dari frontend (src/lib/useFinanceData.ts) untuk ambil data
// transaksi ASLI dari Google Sheets user, dicari lewat dashboard_token
// yang sudah ada di Supabase (dibuat lewat command /dashboard di bot).

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const SHEET_NAME = "Transaction";
const DATA_RANGE = `${SHEET_NAME}!B10:G`;

function parseRupiah(value: unknown): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, "").replace(/Rp/gi, "").trim();
  return parseFloat(cleaned) || 0;
}

async function getTransactions(spreadsheetId: string) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: DATA_RANGE,
  });

  const rows = res.data.values || [];
  const typeMap: Record<string, string> = { income: "Income", expense: "Expense", saving: "Saving" };

  // Kolom relatif ke B: [0]=Date, [1]=Month(skip), [2]=Type, [3]=Category,
  // [4]=Description, [5]=Total — HARUS sama dengan sheets_handler.py di bot.
  return rows
    .filter((row) => row && row.length >= 3 && row[2])
    .map((row) => ({
      date: row[0] || "",
      month: row[1] || "",
      type: typeMap[String(row[2]).trim().toLowerCase()] || "Expense",
      category: row[3] || "",
      description: row[4] || "",
      amount: parseRupiah(row[5]),
    }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({ error: "Token tidak ditemukan" });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_ANON_KEY as string);

    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, username, spreadsheet_id, is_active")
      .eq("dashboard_token", token)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: "Link tidak valid" });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: "Akun belum aktif" });
    }
    if (!user.spreadsheet_id) {
      return res.status(404).json({ error: "Data belum tersedia" });
    }

    const transactions = await getTransactions(user.spreadsheet_id);
    return res.status(200).json({ username: user.username, transactions });
  } catch (err) {
    console.error("Dashboard API error:", (err as Error).message);
    return res.status(500).json({ error: "Gagal memuat data" });
  }
}
