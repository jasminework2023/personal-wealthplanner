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

async function removeLinkedAsset(sheets: any, spreadsheetId: string, txDescription: string) {
  const managed = txDescription.match(/\[asset-tx:([^\]]+)\]/);
  const real = txDescription.match(/\[real-asset:([^\]]+)\]/);
  if (!managed && !real) return;
  const rows = (await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Asset Tracker!A1:O2000",
  })).data.values || [];
  const sectionLabel = managed ? "Managed Investment Assets" : "Real Assets";
  const section = rows.findIndex((row: any[]) => String(row?.[0] || "").trim().toLowerCase() === sectionLabel.toLowerCase());
  const txid = (managed || real)?.[1] || "";
  if (section < 0 || !txid) return;
  const txCol = managed ? 10 : 7;
  for (let i = section + 2; i < rows.length; i++) {
    const row = rows[i] || [];
    const first = String(row[0] || "").trim().toLowerCase();
    if (["real assets","managed investment assets","target assets","indonesia stock","us stock"].includes(first) && first !== sectionLabel.toLowerCase()) break;
    if (String(row[txCol] || "").trim() === txid) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: managed ? `Asset Tracker!A${i + 1}:N${i + 1}` : `Asset Tracker!A${i + 1}:I${i + 1}`,
      });
      return;
    }
  }
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

    if (error || !u) {
      return res.status(404).json({ error: `Akun tidak ditemukan (token tidak cocok di database) [debug: len=${token.length}, awal=${token.slice(0,4)}, akhir=${token.slice(-4)}]` });
    }
    if (!u.is_active) {
      return res.status(403).json({ error: "Akun belum aktif" });
    }
    if (!u.spreadsheet_id) {
      return res.status(404).json({ error: "Spreadsheet belum terhubung ke akun ini" });
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

    const txRead = await sheets.spreadsheets.values.get({ spreadsheetId: u.spreadsheet_id, range: `Transaction!B${row}:I${row}` });
    const txDescription = String(txRead.data.values?.[0]?.[4] || "");
    await removeLinkedAsset(sheets, u.spreadsheet_id, txDescription);

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
    return res.status(500).json({ error: "Gagal menghapus transaksi" + (e instanceof Error ? " (" + e.message.slice(0, 200) + ")" : "") });
  }
}
