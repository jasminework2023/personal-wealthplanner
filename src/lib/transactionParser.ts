import type { Transaction, TransactionType } from "../data/types";

export interface ParsedStockPurchase {
  ticker: string;
  market: "ID" | "US";
  quantity: number;
  unit: "lot" | "share";
  sourceAccount: string;
  buyPrice?: number;
}
export interface ParsedRealPurchase {
  assetName: string;
  sourceAccount: string;
}
export interface ParsedTransaction extends Partial<Transaction> {
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date?: string;
  stockPurchase?: ParsedStockPurchase;
  realPurchase?: ParsedRealPurchase;
}

function normalizeNumber(raw: string): number | null {
  const value = raw.trim().replace(/\s/g, "");
  if (!value) return null;

  // Indonesian grouping: 15.000.000 / 15,000,000 -> 15000000.
  if (/^\d{1,3}([.,]\d{3})+$/.test(value)) {
    const n = Number(value.replace(/[.,]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  // Decimal form: 15,5 or 15.5.
  const n = Number(value.replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}

export function parseAmount(text: string): number | null {
  // Prefer the longest numeric token so "gajian 15.000.000" never becomes Rp15.
  const match = text.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(miliar|milyar|juta|jt|j|ribu|rb|k|m)?\b/i);
  if (!match) return null;

  const raw = normalizeNumber(match[1]);
  if (raw === null) return null;

  const unit = (match[2] || "").toLowerCase();
  if (["miliar", "milyar", "m"].includes(unit)) return Math.round(raw * 1_000_000_000);
  if (["juta", "jt", "j"].includes(unit)) return Math.round(raw * 1_000_000);
  if (["ribu", "rb", "k"].includes(unit)) return Math.round(raw * 1_000);
  return Math.round(raw);
}

function parseDate(text: string): Date {
  const now = new Date();
  const lower = text.toLowerCase();
  if (/\b(kemarin|kemaren|yesterday)\b/.test(lower)) {
    now.setDate(now.getDate() - 1);
    return now;
  }

  const explicit = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (explicit) {
    const day = Number(explicit[1]);
    const month = Number(explicit[2]) - 1;
    const year = explicit[3] ? (Number(explicit[3]) < 100 ? 2000 + Number(explicit[3]) : Number(explicit[3])) : now.getFullYear();
    const date = new Date(year, month, day);
    if (date.getMonth() === month && date.getDate() === day) return date;
  }
  return now;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID");
}
function inferStockPurchase(text: string): ParsedStockPurchase | undefined {
  const lower = text.toLowerCase();
  const stockIntent = /\b(beli|buy|membeli|beliin)\b/.test(lower) && /\b(saham|stock|idx|bei)\b/.test(lower);
  const directTickerIntent = /\b(beli|buy|membeli|beliin)\b/.test(lower);
  if (!stockIntent && !directTickerIntent) return undefined;

  const idTickers = ["BBCA","BBRI","BMRI","BBNI","TLKM","ASII","ANTM","GOTO","ICBP","INDF","UNVR","PTBA","ADRO","MDKA","BUKA","KLBF","JPFA","SMGR","PGAS","EMTK"];
  const usTickers = ["AAPL","TSLA","MSFT","AMZN","NVDA","META","GOOGL","GOOG","VOO","SPY","QQQ","AMD","NFLX","COST","AVGO","BRK.B"];
  const aliases: Record<string,string> = {
    telkom:"TLKM", bbca:"BBCA", bca:"BBCA", bbri:"BBRI", bri:"BBRI", bmri:"BMRI", mandiri:"BMRI",
    bbni:"BBNI", bni:"BBNI", antam:"ANTM", asii:"ASII", goto:"GOTO", icbp:"ICBP", indf:"INDF", unvr:"UNVR",
    apple:"AAPL", tesla:"TSLA", microsoft:"MSFT", amazon:"AMZN", nvidia:"NVDA", meta:"META",
  };
  const explicit = text.match(/\b([A-Z]{1,5}(?:\.[A-Z])?)\b/);
  let ticker = "";
  if (explicit && (idTickers.includes(explicit[1]) || usTickers.includes(explicit[1]))) ticker = explicit[1];
  if (!ticker) {
    for (const [name, value] of Object.entries(aliases)) if (lower.includes(name)) { ticker = value; break; }
  }
  if (!ticker) return undefined;

  const market: "ID"|"US" =
    /\b(saham\s*(us|as|amerika)|us\s*stock|american stock)\b/i.test(lower) || usTickers.includes(ticker)
      ? "US" : "ID";
  const lot = text.match(/(\d+(?:[.,]\d+)?)\s*lot\b/i);
  const share = text.match(/(\d+(?:[.,]\d+)?)\s*(?:lembar|saham|share|shares)\b/i);
  const quantity = Number((lot?.[1] || share?.[1] || "").replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0) return undefined;
  const sourceMatch = text.match(/\b(?:dari|from)\s+([A-Za-z0-9 ._-]+?)(?=\s+(?:dengan|@|harga|rp|\d)|$)/i);
  const sourceAccount = sourceMatch ? sourceMatch[1].trim() : "";
  const priceMatch = text.match(/(?:@|harga(?:\s+beli)?(?:nya)?\s*)\s*(?:usd\s*)?(\d+(?:[.,]\d+)?)/i);
  return {
    ticker,
    market,
    quantity,
    unit: market === "ID" ? "lot" : "share",
    sourceAccount,
    buyPrice: priceMatch ? Number(priceMatch[1].replace(",", ".")) : undefined,
  };
}


function inferRealPurchase(text: string): ParsedRealPurchase | undefined {
  const lower = text.toLowerCase();
  const buyIntent = /\b(beli|buy|membeli|beliin|purchase)\b/.test(lower);
  if (!buyIntent) return undefined;

  const realWords = [
    "mobil","motor","kendaraan","rumah","tanah","properti","property","apartemen",
    "ruko","gedung","bangunan","villa","kos","gudang","lahan","emas batangan",
    "batangan emas","physical gold","perhiasan emas"
  ];
  const matched = realWords.find((word) => lower.includes(word));
  if (!matched) return undefined;

  const sourceMatch = text.match(/\b(?:dari|from)\s+([A-Za-z0-9 ._-]+?)(?=\s+(?:dengan|@|harga|rp|\d)|$)/i);
  let assetName = matched;
  const nameMatch = text.match(/\b(?:beli|buy|membeli|beliin|purchase)\s+(.+?)(?=\s+(?:rp\.?\s*)?\d|\s+\d+(?:[.,]\d+)?\s*(?:juta|jt|miliar|milyar|ribu|rb|k|\b)|\s+(?:dari|from)\b|$)/i);
  if (nameMatch?.[1]) {
    const cleaned = nameMatch[1].replace(/\b(saham|stock)\b/ig, "").trim();
    if (cleaned) assetName = cleaned;
  }
  return { assetName: assetName.trim(), sourceAccount: sourceMatch ? sourceMatch[1].trim() : "" };
}

function inferCategory(lower: string): { type: TransactionType; category: string } {
  if (/\b(gaji|gajian|salary|honor|fee|freelance|pendapatan|income|dividen|bunga|interest|komisi|commission|bonus)\b/i.test(lower)) {
    if (/\b(freelance|honor|fee)\b/i.test(lower)) return { type: "Income", category: "Freelance Income" };
    if (/\b(bisnis|business|jualan|omzet|usaha)\b/i.test(lower)) return { type: "Income", category: "Business Income" };
    if (/\b(dividen|bunga|interest)\b/i.test(lower)) return { type: "Income", category: "Dividend / Interest" };
    if (/\b(komisi|commission)\b/i.test(lower)) return { type: "Income", category: "Commission" };
    return { type: "Income", category: "Gajian" };
  }

  if (/\b(nabung|tabungan|saving|savings|emas|gold|deposito|reksadana|mutual fund|investasi|saham|obligasi|bond)\b/i.test(lower)) {
    if (/\b(emas|gold)\b/i.test(lower)) return { type: "Saving", category: "Gold" };
    if (/\b(deposito)\b/i.test(lower)) return { type: "Saving", category: "Deposito" };
    if (/\b(reksadana|mutual fund)\b/i.test(lower)) return { type: "Saving", category: "Mutual Funds" };
    if (/\b(obligasi|bond)\b/i.test(lower)) return { type: "Saving", category: "Bonds" };
    return { type: "Saving", category: "Deposito" };
  }

  if (/\b(bensin|tol|ojek|grab|gojek|transport|parkir|bus|kereta)\b/i.test(lower)) return { type: "Expense", category: "Transport" };
  if (/\b(nonton|bioskop|hiburan|entertainment|main|game)\b/i.test(lower)) return { type: "Expense", category: "Entertainment" };
  if (/\b(pulsa|kuota|internet|wifi|phone|telepon)\b/i.test(lower)) return { type: "Expense", category: "Internet & Phone" };
  if (/\b(listrik|air|pln|utilitas|utilities)\b/i.test(lower)) return { type: "Expense", category: "Utilities" };
  if (/\b(asuransi|premi)\b/i.test(lower)) return { type: "Expense", category: "Insurance Premium" };
  if (/\b(sekolah|kuliah|pendidikan|education|kursus)\b/i.test(lower)) return { type: "Expense", category: "Education" };
  if (/\b(zakat|sedekah|donasi|charity|wakaf)\b/i.test(lower)) return { type: "Expense", category: "Charity" };
  return { type: "Expense", category: "Food & Groceries" };
}

export function parseTransactionText(text: string): ParsedTransaction | null {
  const lower = text.toLowerCase();
  const stockPurchase = inferStockPurchase(text);
  const realPurchase = stockPurchase ? undefined : inferRealPurchase(text);
  const amount = parseAmount(text);
  if ((amount === null || amount <= 0) && !stockPurchase) return null;

  const { type: inferredType, category: inferredCategory } = inferCategory(lower);
  const type = stockPurchase || realPurchase ? "Saving" : inferredType;
  const category = stockPurchase ? "Stocks" : realPurchase ? "Real Assets" : inferredCategory;
  const date = parseDate(text);
  const description = text
    .replace(/(?:rp\.?\s*)?(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(miliar|milyar|juta|jt|j|ribu|rb|k|m)?\b/i, "")
    .replace(/\b(kemarin|kemaren|yesterday|hari ini|today)\b/ig, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    type,
    category,
    amount,
    description: description || category,
    date: formatDate(date),
    month: date.toLocaleString("en-US", { month: "long" }),
    stockPurchase,
    realPurchase,
  };
}
