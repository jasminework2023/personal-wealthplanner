// api/dashboard.ts
// Dipanggil dari frontend (src/lib/useFinanceData.ts) untuk ambil data
// ASLI dari Google Sheets user: Transaction, Budgeting, dan Asset Tracker,
// dicari lewat dashboard_token yang sudah ada di Supabase.

import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseStockSections } from "../lib/stockSheet.js";

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

function isCreditCardWallet(name: string): boolean {
  const n = String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
  return /kartu kredit|credit card|creditcard|\bcc\b/.test(n);
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
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// One batchGet instead of 3 separate values.get calls: this alone cuts the
// Google Sheets API "read requests per minute" quota this endpoint consumes
// by roughly two thirds on every dashboard load / poll cycle.
async function fetchAllRanges(spreadsheetId: string, transactionsOnly = false) {
  const sheets = await getSheetsClient();

  // Do not let one optional tab (Budgeting / Asset Tracker) break the
  // entire dashboard. A batchGet fails as a whole when even one requested
  // range points to a missing/renamed tab, which previously made valid
  // Transaction data look like "Rp0" in the UI.
  async function readRange(range: string) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      return { rows: res.data.values || [], error: "" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Google Sheets range read error:", range, message);
      return { rows: [] as unknown[][], error: message };
    }
  }

  const transaction = await readRange("Transaction!B10:I");
  if (transaction.error) {
    throw new Error(
      `Google Sheet tidak bisa membaca tab Transaction. Pastikan spreadsheet_id benar dan service account punya akses Editor. Detail: ${transaction.error}`,
    );
  }

  if (transactionsOnly) {
    return {
      transactionRows: transaction.rows,
      budgetRows: [] as unknown[][],
      assetRows: [] as unknown[][],
    };
  }

  const [budget, assets] = await Promise.all([
    readRange("Budgeting!B1:N40"),
    readRange("Asset Tracker!A1:O1000"),
  ]);

  // Budgeting and Asset Tracker are optional for loading the core transaction
  // data. Returning their errors in logs makes the failure visible without
  // blanking the whole dashboard.
  if (budget.error) console.warn("Budgeting tab unavailable:", budget.error);
  if (assets.error) console.warn("Asset Tracker tab unavailable:", assets.error);

  return {
    transactionRows: transaction.rows,
    budgetRows: budget.rows,
    assetRows: assets.rows,
  };
}

// ---------- TRANSACTION ----------
const MONTH_NUMBER: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

// Normalize dates from Sheets to YYYY-MM-DD. The Month column resolves
// locale-dependent values such as 04/11/2026 (4 Nov or 11 Apr).
function normalizeSheetDate(value: unknown, monthValue: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return date.toISOString().slice(0, 10);
  }

  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T|\s)/);
  if (iso) {
    const y = Number(iso[1]), m = Number(iso[2]), day = Number(iso[3]);
    const check = new Date(Date.UTC(y, m - 1, day));
    return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === day
      ? String(y) + "-" + String(m).padStart(2, "0") + "-" + String(day).padStart(2, "0")
      : "";
  }

  const parts = raw.match(/^(\d{1,2})[\/. -](\d{1,2})[\/. -](\d{2,4})$/);
  if (parts) {
    const first = Number(parts[1]), second = Number(parts[2]);
    let year = Number(parts[3]), day = first, month = second;
    const expectedMonth = MONTH_NUMBER[String(monthValue ?? "").trim().toLowerCase()];
    if (expectedMonth && first === expectedMonth && second !== expectedMonth) {
      month = first; day = second;
    } else if (expectedMonth && second === expectedMonth && first !== expectedMonth) {
      day = first; month = second;
    } else if (first <= 12 && second > 12) {
      day = second; month = first;
    }
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const check = new Date(Date.UTC(year, month - 1, day));
    if (month < 1 || month > 12 || day < 1 || day > 31 ||
      check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return "";
    return String(year) + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function getTransactions(rows: unknown[][], year?: number) {
  const typeMap: Record<string, string> = { income: "Income", expense: "Expense", saving: "Saving", transfer: "Transfer", debtreceived: "DebtReceived", debtpayment: "DebtPayment", debtcardpayment: "DebtCardPayment" };

  return rows
    .map((row, index) => ({ row, sheetRow: index + 10 }))
    .filter(({ row }) => row && row.length >= 3 && Boolean(row[2]))
    .map(({ row, sheetRow }) => {
      const date = normalizeSheetDate(row[0], row[1]);
      const transactionYear = date ? Number(date.slice(0, 4)) : undefined;
      return {
        date,
        month: row[1] || "",
        type: typeMap[String(row[2]).trim().toLowerCase()] || "Expense",
        category: row[3] || "",
        description: row[4] || "",
        amount: parseRupiah(row[5]),
        wallet: row[6] || "",
        toWallet: row[7] || "",
        year: transactionYear,
        sheetRow,
      };
    })
    .filter((transaction) => !year || !transaction.year || transaction.year === year);
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
const SECTION_LABELS = ["liquid assets", "investment assets", "managed investment assets", "real assets", "indonesia stock", "us stock", "target assets"];

function parseAssetSection(rows: unknown[][], sectionLabel: string, excludedNames = new Set<string>()) {
  const startIdx = findRowIndex(rows, sectionLabel);
  if (startIdx === -1) return { items: [] as { name: string; value: number; sheetRow: number }[], total: 0, excludedNames: [] as string[] };

  const items: { name: string; value: number; sheetRow: number }[] = [];
  const excluded: string[] = [];
  let total = 0;

  for (let i = startIdx + 2; i < rows.length; i++) {
    const row = rows[i] || [];
    const label = String(row[0] || "").trim();
    if (!label) continue;
    const lower = label.toLowerCase();
    if (lower === "total") {
      total = items.reduce((sum, item) => sum + item.value, 0);
      break;
    }
    if (SECTION_LABELS.includes(lower) && lower !== sectionLabel.toLowerCase()) break; // kena section lain, stop
    if (excludedNames.has(lower)) {
      excluded.push(label);
      continue;
    }
    const value = lastNumericValue(row);
    if (value > 0) items.push({ name: label, value, sheetRow: i + 1 });
  }

  // Recalculate from the visible items so excluded/legacy rows cannot be
  // accidentally included in the aggregate.
  if (lowerSection(sectionLabel) === "investment assets") {
    total = items.reduce((sum, item) => sum + item.value, 0);
  }

  return { items, total, excludedNames: excluded };
}

function lowerSection(value: string) {
  return String(value || "").trim().toLowerCase();
}

function yearsHeld(date: string) {
  const start = new Date(date + "T00:00:00Z").getTime();
  return Number.isFinite(start) ? Math.max(0, (Date.now() - start) / (365.2425 * 86400000)) : 0;
}
function parseManagedInvestmentAssets(rows: unknown[][]) {
  const startIdx = findRowIndex(rows, "Managed Investment Assets");
  const items: any[] = [];
  if (startIdx === -1) return items;
  for (let i = startIdx + 2; i < rows.length; i++) {
    const row = rows[i] || [];
    if (!String(row[0] || "").trim()) continue;
    const lower = String(row[0] || "").trim().toLowerCase();
    if (["real assets", "target assets"].includes(lower)) break;
    const quantity = parseRupiah(row[3]);
    const buyPrice = parseRupiah(row[5]);
    const currentPrice = parseRupiah(row[6]);
    const currency = String(row[11] || "").trim().toUpperCase() === "USD" ? "USD" : "IDR";
    const fxRate = parseRupiah(row[12]) || 1;
    const currentValue = quantity * currentPrice * fxRate;
    const costBasis = parseRupiah(row[13]) || quantity * buyPrice * fxRate;
    items.push({
      id: String(row[0] || "").trim(),
      name: String(row[1] || "").trim(),
      category: String(row[2] || "").trim() || "Lainnya",
      quantity, unit: String(row[4] || "").trim() || "unit",
      buyPrice, currentPrice,
      sourceAccount: String(row[7] || "").trim(),
      purchaseDate: normalizeSheetDate(row[8], ""),
      note: String(row[9] || "").trim(),
      transactionId: String(row[10] || "").trim(),
      currency, fxRate, costBasis, value: currentValue,
    });
  }
  return items.filter((x) => x.name && x.value > 0);
}
function parseRealAssets(rows: unknown[][]) {
  const startIdx = findRowIndex(rows, "Real Assets");
  const items: any[] = [];
  if (startIdx === -1) return items;
  for (let i = startIdx + 2; i < rows.length; i++) {
    const row = rows[i] || [];
    if (!String(row[0] || "").trim()) continue;
    const lower = String(row[0] || "").trim().toLowerCase();
    if (["target assets","managed investment assets"].includes(lower)) break;
    const initialValue = parseRupiah(row[2]);
    const acquisitionDate = normalizeSheetDate(row[3], "");
    const annualChangePercent = parseRupiah(row[4]);
    const elapsedYears = yearsHeld(acquisitionDate);
    const currentValue = initialValue * Math.pow(1 + annualChangePercent / 100, elapsedYears);
    items.push({
      id: String(row[0] || "").trim(),
      name: String(row[1] || "").trim(),
      initialValue,
      acquisitionDate,
      annualChangePercent,
      note: String(row[5] || "").trim(),
      currentValue,
      changeValue: currentValue - initialValue,
      sourceAccount: String(row[6] || "").trim(),
      transactionId: String(row[7] || "").trim(),
      fundingMode: String(row[8] || "").trim().toLowerCase() === "purchase" ? "purchase" : "owned",
    });
  }
  return items.filter((x) => x.name && x.initialValue >= 0);
}

function parseAssetTargets(rows: unknown[][]) {
  const targets: {
    id: string;
    name: string;
    targetAmount: number;
    targetDate: string;
    currentValueSource: string;
  }[] = [];

  const sectionIdx = findRowIndex(rows, "Target Assets");
  const sectionIdxId = sectionIdx === -1 ? findRowIndex(rows, "Target Aset") : sectionIdx;

  if (sectionIdxId !== -1) {
    for (let i = sectionIdxId + 2; i < rows.length; i++) {
      const row = rows[i] || [];
      const id = String(row[0] ?? "").trim();
      const name = String(row[1] ?? "").trim();
      if (!id || !name) continue;
      targets.push({
        id,
        name,
        targetAmount: parseRupiah(row[2]),
        targetDate: String(row[3] ?? "").trim(),
        currentValueSource: String(row[4] ?? "Asset Tracker").trim() || "Asset Tracker",
      });
    }
    return targets;
  }

  // Backward compatibility for the old single "Target Aset" value.
  const targetLabels = ["target aset", "target asset", "target"];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (!targetLabels.includes(String(row[c] ?? "").trim().toLowerCase())) continue;
      const candidates = [row[c + 1], row[c + 2], (rows[r + 1] || [])[c], (rows[r + 1] || [])[c + 1]];
      for (const candidate of candidates) {
        const raw = String(candidate ?? "").trim();
        if (!raw || !/(?:\d|rp|idr|\$)/i.test(raw)) continue;
        const amount = parseRupiah(candidate);
        if (amount > 0) {
          targets.push({
            id: "legacy-target",
            name: "Target Aset",
            targetAmount: amount,
            targetDate: "",
            currentValueSource: "Asset Tracker",
          });
          return targets;
        }
      }
    }
  }
  return targets;
}

async function getUsdIdrRate(): Promise<number> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { Accept: "application/json" },
    });
    const data: any = await response.json();
    const rate = Number(data?.rates?.IDR);
    if (response.ok && Number.isFinite(rate) && rate > 0) return rate;
  } catch {}
  return 16300;
}

async function getAssetTracker(rows: unknown[][], walletRows: any[] = [], transactions: any[] = []) {
  // Liquid Assets are the user's actual wallet balances. This keeps the
  // Asset Tracker from maintaining a second, potentially stale cash total.
  // Wallets represent cash accounts (including bank accounts/RDN); the
  // investment itself is tracked separately under Investment Assets.
  const walletSums = new Map<string, { inflow: number; outflow: number }>();
  for (const tx of transactions) {
    const type = String(tx.type || "").trim().toLowerCase();
    const amount = Number(tx.amount) || 0;
    const from = String(tx.wallet || "").trim().toLowerCase();
    const to = String(tx.toWallet || "").trim().toLowerCase();
    const add = (key: string, field: "inflow" | "outflow") => {
      if (!key) return;
      const current = walletSums.get(key) || { inflow: 0, outflow: 0 };
      current[field] += amount;
      walletSums.set(key, current);
    };
    if (type === "income") add(from, "inflow");
    if (type === "expense") add(from, "outflow");
    if (type === "transfer") {
      add(from, "outflow");
      add(to, "inflow");
    }
    if (type === "saving" && from) {
      add(from, "outflow");
      if (to) add(to, "inflow");
    }
  }

  const liquid = {
    items: walletRows
      .filter((wallet: any) => {
        const name = String(wallet.name || "");
        const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
        const isInvestmentWallet = /saham|stock|reksa|invest|obligasi|emas|crypto|gotrade|go trade/.test(normalized);
        return !isCreditCardWallet(name) && !isInvestmentWallet;
      })
      .map((wallet: any) => {
        const key = String(wallet.name_key || wallet.name || "").trim().toLowerCase();
        const sums = walletSums.get(key) || { inflow: 0, outflow: 0 };
        const balance = (Number(wallet.opening_balance) || 0) + sums.inflow - sums.outflow;
        return { name: String(wallet.name || "").trim(), value: balance };
      })
      .filter((item: any) => item.name && Number.isFinite(item.value)),
    total: 0,
  };
  liquid.total = liquid.items.reduce((sum: number, item: any) => sum + item.value, 0);

  const legacyInvestment = parseAssetSection(rows, "Investment Assets", new Set(["saham", "stocks", "stock"]));
  const managedInvestment = parseManagedInvestmentAssets(rows);
  const investmentItems = [
    ...legacyInvestment.items,
    ...managedInvestment.map((item) => ({ name: item.name, value: item.value, sheetRow: 0 })),
  ];
  const investment = {
    items: investmentItems,
    total: investmentItems.reduce((sum, item) => sum + item.value, 0),
    excludedNames: legacyInvestment.excludedNames,
  };
  const realAssets = parseRealAssets(rows);
  // The shared resolver has already selected the single authoritative stock tab.
  const stockSections = parseStockSections(rows);
  const stocksID = stockSections.id;
  const stocksUS = stockSections.us;

  // Target Asset: cari label target secara eksplisit, lalu baca nilai pada
  // cell yang sama/berdekatan. Format sheet bisa berupa label + nilai dalam
  // satu baris atau label diikuti nilai pada baris berikutnya.
  const targets = parseAssetTargets(rows);
  const target = targets[0]?.targetAmount || 0;

  const usdIdrRate = await getUsdIdrRate();
  const stocksTotal = stocksID.subtotalValue + stocksUS.subtotalValue * usdIdrRate;
  const realAssetsTotal = realAssets.reduce((sum, item) => sum + item.currentValue, 0);
  const totalAssets = liquid.total + investment.total + stocksTotal + realAssetsTotal;

  return {
    totalAssets,
    stocksTotal,
    target,
    targets: targets.map((item) => ({ ...item, currentValueSource: "Asset Tracker" })),
    liquidAssets: liquid.items,
    investmentAssets: investment.items,
    investmentDetails: managedInvestment,
    realAssets,
    realAssetsTotal,
    excludedInvestmentNames: investment.excludedNames,
    stocksID: stocksID.stocks,
    stocksUS: stocksUS.stocks,
  };
}

// ---------- HANDLER ----------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

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
    const transactionsOnly = String(req.query.transactionsOnly || "") === "1";

    const { transactionRows, budgetRows, assetRows } = await fetchAllRanges(user.spreadsheet_id, transactionsOnly);

    const transactions = getTransactions(transactionRows, allYears ? undefined : requestedYear);
    const walletTransactions = getTransactions(transactionRows);
    let walletRows: any[] = [];
    try {
      const { data: wallets, error: walletError } = await supabase
        .from("wallets")
        .select("name,name_key,opening_balance")
        .eq("username", user.username)
        .is("archived_at", null)
        .order("sort_order")
        .order("created_at");
      if (walletError) throw walletError;
      walletRows = wallets || [];
    } catch (walletError) {
      console.error("Dashboard wallet read error:", (walletError as Error).message);
    }
    let budgetByCategory: Record<string, number> = {};
    try {
      budgetByCategory = getBudgetByCategory(budgetRows, requestedMonth);
    } catch {
      budgetByCategory = {};
    }
    let assets = null as Awaited<ReturnType<typeof getAssetTracker>> | null;
    try {
      assets = await getAssetTracker(assetRows, walletRows, walletTransactions);
    } catch {
      assets = null;
    }

    return res.status(200).json({
      user_id: user.user_id,
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
