import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const SHEET = "Net Worth History";
const HEADERS = ["Period", "Total Assets", "Total Liabilities", "Net Worth", "Updated At"];
const money = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
function sheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}
async function authorize(token: string) {
  const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
  const { data, error } = await supabase.from("users").select("spreadsheet_id,is_active").eq("dashboard_token", token).single();
  if (error || !data) throw Object.assign(new Error("Akun tidak ditemukan"), { status: 404 });
  if (!data.is_active) throw Object.assign(new Error("Akun belum aktif"), { status: 403 });
  if (!data.spreadsheet_id) throw Object.assign(new Error("Spreadsheet belum tersedia"), { status: 404 });
  return data;
}
async function ensureSheet(sheets: any, spreadsheetId: string) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties" });
  const exists = (meta.data.sheets || []).some((item: any) => item.properties?.title === SHEET);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title: SHEET } } }] } });
  }
  const header = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'" + SHEET + "'!A1:E1" });
  if (!header.data.values?.[0]?.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: "'" + SHEET + "'!A1:E1", valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }
}
async function readHistory(sheets: any, spreadsheetId: string) {
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'" + SHEET + "'!A2:E1000" });
  return (result.data.values || []).map((row: any[], index: number) => ({
    period: String(row[0] || ""),
    totalAssets: money(row[1]),
    totalLiabilities: money(row[2]),
    netWorth: money(row[3]),
    updatedAt: String(row[4] || ""),
    sheetRow: index + 2,
  })).filter((item: any) => /^\d{4}-\d{2}$/.test(item.period)).sort((a: any, b: any) => a.period.localeCompare(b.period));
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(req.method === "GET" ? req.query.token || "" : req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan" });
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  try {
    const user = await authorize(token);
    const sheets = sheetsClient();
    await ensureSheet(sheets, user.spreadsheet_id);
    if (req.method === "POST") {
      const totalAssets = money(req.body?.totalAssets);
      const totalLiabilities = money(req.body?.totalLiabilities);
      if (totalAssets < 0 || totalLiabilities < 0) return res.status(400).json({ error: "Nilai aset dan kewajiban tidak valid" });
      const now = new Date();
      const period = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
      const history = await readHistory(sheets, user.spreadsheet_id);
      const existing = history.find((item: any) => item.period === period);
      const row = [period, totalAssets, totalLiabilities, totalAssets - totalLiabilities, now.toISOString()];
      if (existing) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: user.spreadsheet_id, range: "'" + SHEET + "'!A" + existing.sheetRow + ":E" + existing.sheetRow,
          valueInputOption: "USER_ENTERED", requestBody: { values: [row] },
        });
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: user.spreadsheet_id, range: "'" + SHEET + "'!A2:E",
          valueInputOption: "USER_ENTERED", insertDataOption: "INSERT_ROWS", requestBody: { values: [row] },
        });
      }
    }
    const history = await readHistory(sheets, user.spreadsheet_id);
    return res.status(200).json({ history });
  } catch (error) {
    const e = error as Error & { status?: number };
    return res.status(e.status || 500).json({ error: e.message || "Gagal memuat riwayat net worth" });
  }
}
