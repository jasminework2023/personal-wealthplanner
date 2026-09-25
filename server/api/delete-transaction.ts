import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function sheetsClient() {
  const c = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
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
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: u.spreadsheet_id,
      fields: "sheets.properties",
    });
    const transactionSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === "Transaction",
    );
    const sheetId = transactionSheet?.properties?.sheetId;

    if (sheetId === undefined || sheetId === null) {
      return res.status(404).json({ error: "Sheet Transaction tidak ditemukan" });
    }

    // Physically remove the row instead of merely clearing its cells.
    // This prevents the deleted transaction from remaining in the report and
    // keeps subsequent Transaction rows contiguous.
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: u.spreadsheet_id,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: row - 1,
                endIndex: row,
              },
            },
          },
        ],
      },
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("delete-transaction error:", e);
    return res.status(500).json({ error: "Gagal menghapus transaksi" });
  }
}
