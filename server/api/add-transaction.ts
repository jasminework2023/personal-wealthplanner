import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

const TYPE_MAP: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  saving: "Saving",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { token, transaction } = req.body || {};
  if (!token || !transaction) return res.status(400).json({ error: "Data transaksi tidak lengkap" });

  const type = TYPE_MAP[String(transaction.type || "").trim().toLowerCase()];
  const amount = Number(transaction.amount);
  const date = String(transaction.date || "").trim();
  const month = String(transaction.month || "").trim();
  const category = String(transaction.category || "").trim();
  const description = String(transaction.description || "").trim();

  if (!type || !date || !month || !category || !description || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Data transaksi tidak valid" });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
    const { data: user, error } = await supabase
      .from("users")
      .select("spreadsheet_id, is_active")
      .eq("dashboard_token", token)
      .single();

    if (error || !user || !user.is_active || !user.spreadsheet_id) {
      return res.status(404).json({ error: "Akun tidak ditemukan" });
    }

    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: user.spreadsheet_id,
      range: "Transaction!B10:G",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[date, month, type, category, description, amount]],
      },
    });

    return res.status(200).json({
      success: true,
      transaction: { date, month, type, category, description, amount },
    });
  } catch (err) {
    console.error("add-transaction error:", (err as Error).message);
    return res.status(500).json({ error: "Gagal menyimpan transaksi" });
  }
}
