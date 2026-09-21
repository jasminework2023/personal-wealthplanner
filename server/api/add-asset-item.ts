// api/add-asset-item.ts — Tambah item baru ke Liquid/Investment Assets.
// Coba pakai baris kosong yang udah ada dulu; kalau penuh, sisipin baris baru.

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

    let totalIdx = -1;
    let blankRowIdx = -1;
    for (let i = sectionIdx + 2; i < rows.length; i++) {
      const label = String((rows[i] || [])[0] || "").trim();
      if (label.toLowerCase() === "total") {
        totalIdx = i;
        break;
      }
      if (!label && blankRowIdx === -1) blankRowIdx = i;
    }
    if (totalIdx === -1) return res.status(404).json({ error: "Baris Total tidak ditemukan" });

    let targetRowNumber: number;

    if (blankRowIdx !== -1) {
      // Pakai baris kosong yang udah ada
      targetRowNumber = blankRowIdx + 1;
    } else {
      // Nggak ada slot kosong -- sisipin baris baru sebelum Total
      const meta = await sheets.spreadsheets.get({ spreadsheetId: user.spreadsheet_id });
      const assetSheet = meta.data.sheets?.find((s) => s.properties?.title === "Asset Tracker");
      const sheetId = assetSheet?.properties?.sheetId;
      if (sheetId === undefined) return res.status(404).json({ error: "Tab Asset Tracker tidak ditemukan" });

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: user.spreadsheet_id,
        requestBody: {
          requests: [
            {
              insertDimension: {
                range: { sheetId, dimension: "ROWS", startIndex: totalIdx, endIndex: totalIdx + 1 },
                inheritFromBefore: true,
              },
            },
          ],
        },
      });
      targetRowNumber = totalIdx + 1;
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: user.spreadsheet_id,
      range: `Asset Tracker!B${targetRowNumber}:B${targetRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[name]] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: user.spreadsheet_id,
      range: `Asset Tracker!${VALUE_COL_LETTER}${targetRowNumber}:${VALUE_COL_LETTER}${targetRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[value]] },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("add-asset-item error:", (err as Error).message);
    return res.status(500).json({ error: "Gagal menambah item" });
  }
}
