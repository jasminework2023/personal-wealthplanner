// api/add-budget-category.ts — Tambah kategori BARU ke tab Budgeting
// (nyisipin baris baru tepat sebelum baris "Total" section terkait).

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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

const SECTION_LABEL: Record<string, string> = {
  income: "Income",
  saving: "Savings",
  expense: "Expense",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { token, section, category, month, amount } = req.body || {};
  if (!token || !section || !category || !month || amount === undefined) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }
  const sectionLabel = SECTION_LABEL[String(section).toLowerCase()];
  if (!sectionLabel) return res.status(400).json({ error: "Tipe tidak valid" });

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

    const sheets = await getWriteClient();

    // Cari sheetId (gid) numerik buat tab "Budgeting", dibutuhkan buat insertDimension
    const meta = await sheets.spreadsheets.get({ spreadsheetId: user.spreadsheet_id });
    const budgetingSheet = meta.data.sheets?.find((s) => s.properties?.title === "Budgeting");
    const sheetId = budgetingSheet?.properties?.sheetId;
    if (sheetId === undefined) return res.status(404).json({ error: "Tab Budgeting tidak ditemukan" });

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: user.spreadsheet_id,
      range: "Budgeting!B1:N40",
    });
    const rows = read.data.values || [];

    // Cari kolom bulan
    const headerIdx = findRowIndex(rows, month);
    if (headerIdx === -1) return res.status(404).json({ error: "Bulan tidak ditemukan di sheet" });
    const header = rows[headerIdx] || [];
    const monthColIdx = header.findIndex((c) => String(c || "").trim().toLowerCase() === String(month).toLowerCase());
    if (monthColIdx === -1) return res.status(404).json({ error: "Kolom bulan tidak ditemukan" });

    // Cari baris section, lalu baris "Total" pertama SETELAH section itu
    const sectionIdx = findRowIndex(rows, sectionLabel, headerIdx + 1);
    if (sectionIdx === -1) return res.status(404).json({ error: "Section tidak ditemukan" });
    let totalIdx = -1;
    for (let i = sectionIdx + 1; i < rows.length; i++) {
      const label = String((rows[i] || [])[0] || "").trim().toLowerCase();
      if (label === "total") {
        totalIdx = i;
        break;
      }
    }
    if (totalIdx === -1) return res.status(404).json({ error: "Baris Total tidak ditemukan" });

    // Insert baris baru TEPAT sebelum baris Total (index sheet asli = totalIdx, 0-based)
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

    // Tulis nama kategori (kolom B) & nominal bulan ini (kolom sesuai month)
    const monthColLetter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[monthColIdx + 1];
    const newRowNumber = totalIdx + 1; // baris baru nempatin posisi Total lama (1-indexed)

    await sheets.spreadsheets.values.update({
      spreadsheetId: user.spreadsheet_id,
      range: `Budgeting!B${newRowNumber}:B${newRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[category]] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: user.spreadsheet_id,
      range: `Budgeting!${monthColLetter}${newRowNumber}:${monthColLetter}${newRowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[amount]] },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("add-budget-category error:", (err as Error).message);
    return res.status(500).json({ error: "Gagal menambah kategori" });
  }
}
