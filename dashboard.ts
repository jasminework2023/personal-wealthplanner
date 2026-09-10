import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/Rp/gi, "").replace(/\$/g, "").replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeType(value: unknown): "Income" | "Expense" | "Saving" {
  const v = String(value || "").trim().toLowerCase();
  if (v === "income") return "Income";
  if (v === "saving" || v === "savings") return "Saving";
  return "Expense";
}

async function getSheetsClient(readOnly = true) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      readOnly
        ? "https://www.googleapis.com/auth/spreadsheets.readonly"
        : "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
  return google.sheets({ version: "v4", auth });
}

async function getUser(token: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string,
  );
  const { data: user, error } = await supabase
    .from("users")
    .select("user_id, username, spreadsheet_id, is_active")
    .eq("dashboard_token", token)
    .single();

  if (error || !user) throw Object.assign(new Error("Link tidak valid"), { status: 404 });
  if (!user.is_active) throw Object.assign(new Error("Akun belum aktif"), { status: 403 });
  if (!user.spreadsheet_id) throw Object.assign(new Error("Data belum tersedia"), { status: 404 });
  return user;
}

async function getTransactions(sheets: any, spreadsheetId: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Transaction!B10:G",
  });
  return (res.data.values || [])
    .filter((row: unknown[]) => row?.[0] && row?.[2] && row?.[3])
    .map((row: unknown[]) => ({
      date: String(row[0] || ""),
      month: String(row[1] || ""),
      type: normalizeType(row[2]),
      category: String(row[3] || ""),
      description: String(row[4] || ""),
      amount: parseNumber(row[5]),
    }));
}

function parseDashboard(rows: unknown[][]) {
  const row = (n: number) => rows[n - 2] || [];
  const cell = (n: number, col: number) => row(n)[col] ?? "";
  const section = (start: number, end: number) => {
    const result: { category: string; allocation: number; realization: number; usage: number }[] = [];
    for (let r = start; r <= end; r++) {
      const category = String(cell(r, 0) || "").trim();
      if (!category || category.toLowerCase() === "total" || category.toLowerCase().startsWith("aktivasi")) continue;
      result.push({
        category,
        allocation: parseNumber(cell(r, 2)),
        realization: parseNumber(cell(r, 4)),
        usage: parseNumber(cell(r, 10)),
      });
    }
    return result;
  };

  return {
    year: parseNumber(cell(2, 9)),
    month: String(cell(3, 9) || ""),
    totalIncome: parseNumber(cell(8, 0)),
    budgetExpense: parseNumber(cell(8, 3)),
    totalSpending: parseNumber(cell(8, 6)),
    totalSaving: parseNumber(cell(8, 9)),
    income: section(12, 17),
    saving: section(21, 25),
    expense: section(29, 38),
  };
}

async function getDashboard(sheets: any, spreadsheetId: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Dashboard!B2:L39",
    valueRenderOption: "FORMATTED_VALUE",
  });
  return parseDashboard(res.data.values || []);
}

async function getSetupCategories(sheets: any, spreadsheetId: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "SET UP!B7:I40",
    valueRenderOption: "FORMATTED_VALUE",
  });
  const rows = res.data.values || [];
  const readGroup = (labelCol: number, statusCol: number) =>
    rows
      .filter((r: unknown[]) => String(r[labelCol] || "").trim() && String(r[statusCol] || "").toLowerCase() === "true")
      .map((r: unknown[]) => String(r[labelCol]).trim());
  return {
    income: readGroup(0, 1),
    expense: readGroup(3, 4),
    saving: readGroup(6, 7),
  };
}

async function getAssetTracker(sheets: any, spreadsheetId: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Asset Tracker!B1:N45",
    valueRenderOption: "FORMATTED_VALUE",
  });
  const rows: unknown[][] = res.data.values || [];
  const num = (v: unknown) => parseNumber(v);
  const parseStockBlock = (headerRow: number, startRow: number, endRow: number) => {
    const stocks: { ticker: string; currentPrice: number; shares: number; avgPrice: number; value: number; pl: number }[] = [];
    for (let r = startRow; r <= endRow; r++) {
      const row = rows[r - 1] || [];
      const ticker = String(row[7] || "").trim(); // I column; range starts at B
      if (!ticker || ticker.toLowerCase().includes("subtotal") || ticker.toLowerCase() === "total") continue;
      stocks.push({
        ticker,
        currentPrice: num(row[8]), // J
        shares: num(row[9]),       // K
        avgPrice: num(row[10]),    // L
        value: num(row[11]),       // M
        pl: num(row[12]),          // N
      });
    }
    return stocks;
  };
  const liquidAssets: { name: string; value: number }[] = [];
  for (let r = 20; r <= 26; r++) {
    const row = rows[r - 1] || [];
    const name = String(row[0] || "").trim();
    const value = num(row[3]); // E
    if (name && value) liquidAssets.push({ name, value });
  }
  const investmentAssets: { name: string; value: number }[] = [];
  for (let r = 31; r <= 40; r++) {
    const row = rows[r - 1] || [];
    const name = String(row[0] || "").trim();
    const value = num(row[3]);
    if (name && value) investmentAssets.push({ name, value });
  }
  return {
    totalAssets: num(rows[5]?.[1]), // C6: Total Assets Value
    target: num(rows[4]?.[2]),      // D5
    liquidAssets,
    investmentAssets,
    stocksID: parseStockBlock(3, 4, 8),
    stocksUS: parseStockBlock(10, 11, 15),
  };
}

async function appendTransaction(spreadsheetId: string, body: any) {
  const sheets = await getSheetsClient(false);
  const date = String(body.date || "").trim();
  const type = normalizeType(body.type);
  const category = String(body.category || "").trim();
  const description = String(body.description || "").trim();
  const amount = parseNumber(body.amount);
  if (!date || !category || !description || amount <= 0) throw Object.assign(new Error("Data transaksi tidak lengkap"), { status: 400 });
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) throw Object.assign(new Error("Tanggal tidak valid"), { status: 400 });
  const month = parsedDate.toLocaleString("en-US", { month: "long" });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Transaction!B:G",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[date, month, type === "Saving" ? "Savings" : type, category, description, amount]] },
  });
}

async function updateBudget(spreadsheetId: string, body: any) {
  const month = String(body.month || "").trim();
  const category = String(body.category || "").trim();
  const amount = parseNumber(body.amount);
  if (!month || !category || amount < 0) throw Object.assign(new Error("Data budget tidak lengkap"), { status: 400 });
  const sheets = await getSheetsClient(false);
  const [headerRes, categoryRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Budgeting!B2:N2", valueRenderOption: "FORMATTED_VALUE" }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: "Budgeting!B1:B40", valueRenderOption: "FORMATTED_VALUE" }),
  ]);
  const headers = headerRes.data.values?.[0] || [];
  const col = headers.findIndex((v: unknown) => String(v || "").trim().toLowerCase() === month.toLowerCase());
  const categoryRows = categoryRes.data.values || [];
  const row = categoryRows.findIndex((r: unknown[]) => String(r?.[0] || "").trim().toLowerCase() === category.toLowerCase());
  if (col < 1) throw Object.assign(new Error("Bulan tidak ditemukan di Budgeting"), { status: 400 });
  if (row < 0) throw Object.assign(new Error("Kategori tidak ditemukan di Budgeting"), { status: 400 });
  const columnLetter = String.fromCharCode(66 + col);
  const sheetRow = row + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Budgeting!${columnLetter}${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[amount]] },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = String(req.query.token || "");
  if (!token) return res.status(400).json({ error: "Token tidak ditemukan" });
  try {
    const user = await getUser(token);
    if (req.method === "POST") {
      const action = String(req.body?.action || "");
      if (action === "transaction") await appendTransaction(user.spreadsheet_id, req.body);
      else if (action === "budget") await updateBudget(user.spreadsheet_id, req.body);
      else return res.status(400).json({ error: "Action tidak dikenali" });
      return res.status(200).json({ ok: true });
    }
    if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

    const sheets = await getSheetsClient(true);
    const [transactions, dashboard, categories, assets] = await Promise.all([
      getTransactions(sheets, user.spreadsheet_id),
      getDashboard(sheets, user.spreadsheet_id),
      getSetupCategories(sheets, user.spreadsheet_id),
      getAssetTracker(sheets, user.spreadsheet_id).catch(() => null),
    ]);
    return res.status(200).json({ username: user.username, transactions, dashboard, categories, assets });
  } catch (err) {
    const e = err as Error & { status?: number };
    console.error("Dashboard API error:", e.message);
    return res.status(e.status || 500).json({ error: e.message || "Gagal memuat data" });
  }
}
