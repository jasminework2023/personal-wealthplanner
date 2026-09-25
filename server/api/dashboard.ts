// api/dashboard.ts
// Dipanggil dari frontend (src/lib/useFinanceData.ts) untuk ambil data
// ASLI dari Google Sheets user: Transaction, Budgeting, dan Asset Tracker,
// dicari lewat dashboard_token yang sudah ada di Supabase.

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function parseRupiah(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  let cleaned = String(value)
    .replace(/Rp/gi, "")
    .replace(/IDR/gi, "")
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!cleaned) return 0;

  // Google Sheets can return formatted values using either Indonesian
  // separators (1.234.567,89) or US separators (1,234,567.89).
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // 1.234,56 -> 1234.56
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 -> 1234.56
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const decimals = cleaned.length - lastComma - 1;
    cleaned = decimals === 3 ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  } else if (lastDot !== -1) {
    const decimals = cleaned.length - lastDot - 1;
    cleaned = decimals === 3 ? cleaned.replace(/\./g, "") : cleaned;
  }

  const n = Number(cleaned.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function rowContains(row: unknown[], needle: string): boolean {
  return row.some((cell) => String(cell || "").toLowerCase().includes(needle.toLowerCase()));
}

function findRowIndex(rows: unknown[][], needle: string, from = 0): number {
  for (let i = from; i < rows.length; i++) {
    if (rowContains(rows[i] || [], needle)) return i;
  }
  return -1;
}

// Ambil angka Rupiah TERAKHIR yang valid (>0) di sebuah baris -- dipakai
// karena kita nggak 100% yakin index kolom "Value" persis di sheet asli,
// tapi kolom nominal biasanya yang paling kanan di antara isian baris itu.
function lastNumericValue(row: unknown[]): number {
  for (let i = row.length - 1; i >= 0; i--) {
    const n = parseRupiah(row[i]);
    if (n > 0) return n;
  }
  return 0;
}

async function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS as string);
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

// One batchGet instead of 3 separate values.get calls: this alone cuts the
// Google Sheets API "read requests per minute" quota this endpoint consumes
// by roughly two thirds on every dashboard load / poll cycle.
async function fetchAllRanges(spreadsheetId: string) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ["Transaction!B10:G", "Budgeting!B1:N40", "Asset Tracker!B1:N45"],
  });
  const [transactionRows, budgetRows, assetRows] = (res.data.valueRanges || []).map(
    (r) => r.values || []
  );
  return {
    transactionRows: transactionRows || [],
    budgetRows: budgetRows || [],
    assetRows: assetRows || [],
  };
}

// ---------- TRANSACTION ----------
function getTransactions(rows: unknown[][], year?: number) {
  const typeMap: Record<string, string> = { income: "Income", expense: "Expense", saving: "Saving" };

  return rows
    .map((row, index) => ({ row, sheetRow: index + 10 }))
    .filter(({ row }) => {
      if (!row || row.length < 3 || !row[2]) return false;
      if (!year) return true;
      const rowYear = Number(String(row[0] || "").split("/").pop());
      return !rowYear || rowYear === year;
    })
    .map(({ row, sheetRow }) => ({
      date: row[0] || "",
      month: row[1] || "",
      type: typeMap[String(row[2]).trim().toLowerCase()] || "Expense",
      category: row[3] || "",
      description: row[4] || "",
      amount: parseRupiah(row[5]),
      year: Number(String(row[0] || "").split("/").pop()) || undefined,
      sheetRow,
    }));
}

// ---------- BUDGETING ----------
function getBudgetByCategory(rows: unknown[][], monthName: string): Record<string, number> {
  const headerIdx = findRowIndex(rows, monthName);
  if (headerIdx === -1) return {};
  const header = rows[headerIdx] || [];
  const colIdx = header.findIndex((c) => String(c || "").trim().toLowerCase() === monthName.toLowerCase());
  if (colIdx === -1) return {};

  const result: Record<string, number> = {};
  const skipLabels = ["total", "grand total", "income", "savings", "expense", "allocation", "remains"];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const label = String(row[0] || "").trim();
    if (!label || skipLabels.includes(label.toLowerCase())) continue;
    if (label.toLowerCase().startsWith("aktivasi")) continue;
    result[label] = parseRupiah(row[colIdx]);
  }
  return result;
}

// ---------- ASSET TRACKER ----------
const SECTION_LABELS = ["liquid assets", "investment assets", "indonesia stock", "us stock"];

function parseAssetSection(rows: unknown[][], sectionLabel: string) {
  const startIdx = findRowIndex(rows, sectionLabel);
  if (startIdx === -1) return { items: [] as { name: string; value: number }[], total: 0 };

  const items: { name: string; value: number; sheetRow: number }[] = [];
  let total = 0;

  for (let i = startIdx + 2; i < rows.length; i++) {
    const row = rows[i] || [];
    const label = String(row[0] || "").trim();
    if (!label) continue;
    const lower = label.toLowerCase();
    if (lower === "total") {
      total = lastNumericValue(row);
      break;
    }
    if (SECTION_LABELS.includes(lower) && lower !== sectionLabel.toLowerCase()) break; // kena section lain, stop
    const value = lastNumericValue(row);
    if (value > 0) items.push({ name: label, value, sheetRow: i + 1 });
  }
  return { items, total };
}

function parseStockSection(rows: unknown[][], sectionLabel: string) {
  const startIdx = findRowIndex(rows, sectionLabel);
  if (startIdx === -1) return { stocks: [] as any[], subtotalValue: 0 };

  const stocks: { ticker: string; currentPrice: number; shares: number; avgPrice: number; value: number; pl: number }[] = [];
  let subtotalValue = 0;

  // Beda dari asset table: baris label section INI JUGA baris header kolom,
  // jadi data mulai langsung di baris berikutnya (+1, bukan +2).
  for (let i = startIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const ticker = String(row[0] || "").trim();
    if (!ticker) continue;
    const lowerTicker = ticker.toLowerCase();
    if (lowerTicker.includes("subtotal") || lowerTicker === "total") {
      const nums = row.map((c) => parseRupiah(c)).filter((n) => n > 0);
      subtotalValue = nums[nums.length - 2] ?? nums[nums.length - 1] ?? 0;
      break;
    }
    if (SECTION_LABELS.includes(lowerTicker) && lowerTicker !== sectionLabel.toLowerCase()) break;
    const nums = row.slice(1).map((c) => parseRupiah(c));
    stocks.push({
      ticker,
      currentPrice: nums[0] || 0,
      shares: nums[1] || 0,
      avgPrice: nums[2] || 0,
      value: nums[3] || 0,
      pl: nums[4] || 0,
    });
  }
  return { stocks, subtotalValue };
}

function getAssetTracker(rows: unknown[][]) {
  const liquid = parseAssetSection(rows, "Liquid Assets");
  const investment = parseAssetSection(rows, "Investment Assets");
  const stocksID = parseStockSection(rows, "Indonesia Stock");
  const stocksUS = parseStockSection(rows, "US Stock");

  // Target: cari baris yang ada kata "Target", ambil angka di baris SETELAHNYA
  // pada kolom yang sama (mengikuti pola header lalu isi di sheet aslinya).
  let target = 0;
  const targetHeaderIdx = findRowIndex(rows, "target");
  if (targetHeaderIdx !== -1) {
    const header = rows[targetHeaderIdx] || [];
    const colIdx = header.findIndex((c) => String(c || "").toLowerCase().includes("target"));
    const valueRow = rows[targetHeaderIdx + 1] || [];
    target = parseRupiah(valueRow[colIdx] ?? lastNumericValue(valueRow));
  }

  const totalAssets = liquid.total + investment.total;

  return {
    totalAssets,
    target,
    liquidAssets: liquid.items,
    investmentAssets: investment.items,
    stocksID: stocksID.stocks,
    stocksUS: stocksUS.stocks,
  };
}

// ---------- HANDLER ----------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({ error: "Token tidak ditemukan" });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

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

    const requestedMonth = typeof req.query.month === "string" && req.query.month
      ? req.query.month
      : new Date().toLocaleString("en-US", { month: "long" });
    const requestedYear = Number(req.query.year) || new Date().getFullYear();
    const allYears = String(req.query.allYears || "") === "1";

    const { transactionRows, budgetRows, assetRows } = await fetchAllRanges(user.spreadsheet_id);

    const transactions = getTransactions(transactionRows, allYears ? undefined : requestedYear);
    let budgetByCategory: Record<string, number> = {};
    try {
      budgetByCategory = getBudgetByCategory(budgetRows, requestedMonth);
    } catch {
      budgetByCategory = {};
    }
    let assets = null as ReturnType<typeof getAssetTracker> | null;
    try {
      assets = getAssetTracker(assetRows);
    } catch {
      assets = null;
    }

    return res.status(200).json({
      username: user.username,
      transactions,
      budgetByCategory,
      assets,
      month: requestedMonth,
      year: requestedYear,
    });
  } catch (err) {
    console.error("Dashboard API error:", (err as Error).message);
    return res.status(500).json({ error: "Gagal memuat data" });
  }
}
