import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function sheetsClient() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_CREDENTIALS belum dikonfigurasi");

  const c = JSON.parse(raw);
  const auth = new google.auth.JWT({
    email: c.client_email,
    key: c.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { token, sheetRow } = req.body || {};
  const row = Number(sheetRow);

  if (!token || !Number.isInteger(row) || row < 10) {
    return res.status(400).json({ error: "Data transaksi tidak valid" });
  }

  try {
    const sb = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    );

    const { data: u, error } = await sb
      .from("users")
      .select("spreadsheet_id,is_active")
      .eq("dashboard_token", token)
      .single();

    if (error || !u?.is_active || !u.spreadsheet_id) {
      return res.status(404).json({ error: "Akun tidak ditemukan" });
    }

    const sheets = sheetsClient();
    const range = `Transaction!B${row}:G${row}`;

    await sheets.spreadsheets.values.clear({
      spreadsheetId: u.spreadsheet_id,
      range,
    });

    // Verify the row is really empty before reporting success.
    const verify = await sheets.spreadsheets.values.get({
      spreadsheetId: u.spreadsheet_id,
      range,
    });
    const remaining = (verify.data.values?.[0] || []).some((v) => String(v ?? "").trim() !== "");

    if (remaining) {
      return res.status(500).json({ error: "Transaksi gagal dihapus dari Google Sheet" });
    }

    return res.status(200).json({ success: true, sheetRow: row });
  } catch (e) {
    console.error("delete-transaction error:", e);
    return res.status(500).json({
      error:
        "Gagal menghapus transaksi" +
        (e instanceof Error ? ` (${e.message.slice(0, 200)})` : ""),
    });
  }
}
