import type { Transaction, TransactionType } from "../data/types";

export interface ParsedTransaction extends Partial<Transaction> {
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date?: string;
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
  const amount = parseAmount(text);
  if (amount === null || amount <= 0) return null;

  const lower = text.toLowerCase();
  const { type, category } = inferCategory(lower);
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
  };
}
