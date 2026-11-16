import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Loader2, Sparkles, Camera, Upload } from "lucide-react";
import { Modal } from "./Modal";
import type { Transaction, TransactionType } from "../data/types";
import { getStoredToken, useFinanceData } from "../lib/useFinanceData";
import { useWallets } from "../lib/useWallets";
import { parseTransactionText } from "../lib/transactionParser";
import { formatAmountInput, parseAmountInput } from "../lib/format";
import { apiUrl } from "../lib/apiBase";

function inferStockTicker(text: string): string {
  const lower = text.toLowerCase();
  const aliases: Record<string, string[]> = {
    TLKM: ["telkom", "telkom indonesia", "tlkm"],
    BBCA: ["bca", "bank central asia", "bbca"],
    BBRI: ["bri", "bank rakyat indonesia", "bbri"],
    BMRI: ["mandiri", "bank mandiri", "bmri"],
    BBNI: ["bni", "bank negara indonesia", "bbni"],
    ASII: ["astra", "astra international", "asii"],
    ANTM: ["antam", "pt antam", "antm"],
    GOTO: ["goto", "gojek", "goto gojek tokopedia"],
    ICBP: ["indofood", "icbp"],
    INDF: ["indofood sukses makmur", "indf"],
    UNVR: ["unilever", "unvr"],
  };
  const explicit = text.match(/\b([A-Z]{4})\b/);
  if (explicit && aliases[explicit[1]]) return explicit[1];
  for (const [ticker, names] of Object.entries(aliases)) {
    if (names.some((name) => lower.includes(name))) return ticker;
  }
  return "";
}

function inferStockDetails(text: string) {
  const ticker = inferStockTicker(text);
  if (!ticker) return { ticker: "", quantity: "", price: "", market: "ID" as "ID" | "US", sourceAccount: "" };
  const lower = text.toLowerCase();
  const market = /\b(saham\s*(us|as|amerika)|us\s*stock|american stock)\b/i.test(lower)
    ? "US" as const
    : ["AAPL","TSLA","MSFT","AMZN","NVDA","META","GOOGL","GOOG","VOO","SPY","QQQ"].includes(ticker)
      ? "US" as const : "ID" as const;
  const lotMatch = text.match(/(\d+(?:[.,]\d+)?)\s*lot\b/i);
  const shareMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:lembar|saham|share|shares)\b/i);
  const priceMatch = text.match(/(?:@|harga(?:\s+beli)?(?:nya)?\s*)\s*(?:usd\s*)?(\d+(?:[.,]\d+)?)/i);
  const sourceMatch = text.match(/\b(?:dari|from)\s+([A-Za-z0-9 ._-]+?)(?=\s+(?:dengan|@|harga|rp|\d)|$)/i);
  return {
    ticker,
    quantity: (lotMatch?.[1] || shareMatch?.[1] || "").replace(",", "."),
    price: priceMatch ? priceMatch[1].replace(",", ".") : "",
    market,
    sourceAccount: sourceMatch ? sourceMatch[1].trim() : "",
  };
}

const fallbackCategories = [
  "Gajian", "Freelance Income", "Business Income", "Commission", "Dividend / Interest", "Side Hustle",
  "Utilities", "Internet & Phone", "Insurance Premium", "Food & Groceries", "Transport", "Entertainment", "Education", "Charity",
  "Mutual Funds", "Bonds", "Gold", "Deposito",
];

const MAX_RECEIPT_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_RECEIPT_UPLOAD_BYTES = 2.2 * 1024 * 1024;
const MAX_RECEIPT_DIMENSION = 1500;

async function compressReceiptImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File yang dipilih bukan gambar.");
  }
  if (file.size > MAX_RECEIPT_SOURCE_BYTES) {
    throw new Error("Foto terlalu besar. Pilih foto di bawah 12 MB.");
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Foto tidak bisa dibaca. Coba foto ulang dengan kamera biasa."));
      img.src = sourceUrl;
    });

    const scale = Math.min(1, MAX_RECEIPT_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung pemrosesan foto.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    // JPEG keeps receipt text sharp enough while making phone-camera payloads
    // small enough for a Vercel Function request.
    const qualities = [0.82, 0.72, 0.62, 0.52];
    for (const quality of qualities) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64Length = dataUrl.split(",")[1]?.length ?? 0;
      const estimatedBytes = Math.ceil(base64Length * 3 / 4);
      if (estimatedBytes <= MAX_RECEIPT_UPLOAD_BYTES) return dataUrl;
    }

    throw new Error("Foto masih terlalu besar setelah dikompres. Coba foto struk lebih dekat dengan pencahayaan yang cukup.");
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

// "D/M/YYYY" <-> "YYYY-MM-DD" untuk <input type="date">
function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}
function toIsoDate(d?: string) {
  const [day, month, year] = String(d || "").split("/").map(Number);
  if (!day || !month || !year || year < 2000) return todayIso();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function fromIsoDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}/${m}/${y}`;
}

export function AddTransactionModal({
  open,
  onClose,
  onAdd,
  initialMode = "manual",
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (t: Transaction) => void;
  initialMode?: "manual" | "ai";
}) {
  const [mode, setMode] = useState<"manual" | "ai">(initialMode);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);
  const [aiText, setAiText] = useState("");
  const [aiPreview, setAiPreview] = useState<Partial<Transaction> | null>(null);
  const [aiError, setAiError] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { setup } = useFinanceData();
  const { wallets } = useWallets();
  const [wallet, setWallet] = useState("");
  const [toWallet, setToWallet] = useState("");
  const [stockPurchase, setStockPurchase] = useState(false);
  const [realPurchase, setRealPurchase] = useState(false);
  const [realAssetName, setRealAssetName] = useState("");
  const [stockMarket, setStockMarket] = useState<"ID" | "US">("ID");
  const [stockTicker, setStockTicker] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockBuyPrice, setStockBuyPrice] = useState("");
  const [stockAmountAuto, setStockAmountAuto] = useState(true);
  const [pendingStockPurchase, setPendingStockPurchase] = useState<{
    ticker: string;
    market: "ID" | "US";
    shares: number;
    avgPrice: number;
    account: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    };
  }, [receiptPreview]);
  const activeCategories = useMemo<Record<string, string[]>>(() => ({
    Income: setup.income.filter((x) => x.active && x.name.trim()).map((x) => x.name),
    Expense: setup.expense.filter((x) => x.active && x.name.trim()).map((x) => x.name),
    Saving: setup.saving.filter((x) => x.active && x.name.trim()).map((x) => x.name),
  }), [setup]);

  function resolveCategory(type: TransactionType, parsedCategory: string) {
    const options = activeCategories[type] ?? [];
    if (!options.length) return parsedCategory;
    const exact = options.find((c) => c.toLowerCase() === parsedCategory.toLowerCase());
    if (exact) return exact;
    const aliases: Record<string, string[]> = {
      "Gajian": ["gaji", "gajian", "salary"],
      "Freelance Income": ["freelance", "honor", "fee"],
      "Business Income": ["business", "bisnis", "usaha", "jualan"],
      "Dividend / Interest": ["dividen", "interest", "bunga"],
      "Mutual Funds": ["reksadana", "mutual"],
      "Bonds": ["bond", "obligasi"],
      "Gold": ["emas", "gold"],
      "Deposito": ["deposito"],
    };
    const keys = aliases[parsedCategory] || [];
    const matched = options.find((c) => keys.some((k) => c.toLowerCase().includes(k)));
    return matched || options[0];
  }

  const [form, setForm] = useState({
    type: "Expense" as TransactionType,
    category: fallbackCategories[9],
    description: "",
    amount: "",
  });
  const [formError, setFormError] = useState("");

  // If a manual saving transaction clearly says "beli saham ...", automatically
  // open the stock fields and prefill a known Indonesian ticker.
  useEffect(() => {
    if (form.type !== "Saving" || stockPurchase) return;
    if (!/\b(beli|buy|membeli|beliin)\b.*\b(saham|stock)\b/i.test(form.description)) return;
    const inferred = inferStockDetails(form.description);
    if (!inferred.ticker) return;
    setStockPurchase(true);
    setStockTicker(inferred.ticker);
    if (inferred.quantity) setStockQuantity(inferred.quantity);
    if (inferred.price) setStockBuyPrice(inferred.price);
    setFormError("");
  }, [form.type, form.description, stockPurchase]);

  useEffect(() => {
    if (!stockPurchase || stockMarket !== "ID" || !stockAmountAuto) return;
    const qty = Number(stockQuantity);
    const price = Number(stockBuyPrice);
    if (qty > 0 && price >= 0) {
      setForm((f) => ({ ...f, amount: formatAmountInput(String(Math.round(qty * 100 * price))) }));
    }
  }, [stockPurchase, stockMarket, stockAmountAuto, stockQuantity, stockBuyPrice]);

  useEffect(() => {
    const options = activeCategories[form.type];
    if (options.length && !options.includes(form.category)) {
      setForm((f) => ({ ...f, category: options[0] }));
    }
  }, [activeCategories, form.type, form.category]);

  function reset() {
    setAiText("");
    setAiPreview(null);
    setAiError("");
    setReceiptFile(null);
    setReceiptPreview("");
    setReceiptLoading(false);
    setFormError("");
    setWallet(""); setToWallet("");
    setStockPurchase(false);
    setRealPurchase(false);
    setRealAssetName("");
    setStockMarket("ID");
    setStockTicker("");
    setStockQuantity("");
    setStockBuyPrice("");
    setStockAmountAuto(true);
    setPendingStockPurchase(null);
    setForm({ type: "Expense", category: activeCategories.Expense[0] || fallbackCategories[9], description: "", amount: "" });
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function persistTransaction(
    transaction: Transaction,
    stockToAdd?: { ticker: string; market: "ID" | "US"; shares: number; avgPrice: number; account: string },
  ) {
    const token = getStoredToken();
    setSaving(true);
    setFormError("");
    setAiError("");
    try {
      if (!token) {
        throw new Error("Sesi akun tidak ditemukan. Buka kembali dashboard dari link akunmu, lalu coba simpan transaksi lagi.");
      }

      const response = await fetch(`${API_BASE}/add-transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, transaction }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Transaksi belum berhasil disimpan. Coba lagi.");
      }

      // The transaction is saved exactly once. From here on, only the optional
      // stock-portfolio step may be retried.
      onAdd(transaction);
      window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added", { detail: transaction }));

      if (stockToAdd) {
        try {
          const stockResponse = await fetch(`${API_BASE}/asset-tracker-stocks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, ...stockToAdd, mode: "buy" }),
          });
          const stockData = await stockResponse.json().catch(() => ({}));
          if (!stockResponse.ok || stockData.success !== true) {
            throw new Error(stockData.error || "Portfolio belum diperbarui.");
          }
          setPendingStockPurchase(null);
          window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
        } catch (stockError) {
          setPendingStockPurchase(stockToAdd);
          setFormError("Transaksi tersimpan, tapi portfolio belum diperbarui.");
          setAiError(stockError instanceof Error ? stockError.message : "Portfolio belum diperbarui.");
          return;
        }
      }

      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan transaksi";
      setFormError(message);
      setAiError(message);
    } finally {
      setSaving(false);
    }
  }

  async function persistRealPurchase(assetName: string, amount: number, account: string) {
    const token = getStoredToken();
    if (!token) {
      setFormError("Sesi akun tidak ditemukan. Buka kembali dashboard dari link akunmu, lalu coba simpan transaksi lagi.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const response = await fetch(`${API_BASE}/managed-assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, kind: "real", action: "create",
          name: assetName.trim(), initialValue: amount, acquisitionDate: todayIso(),
          annualChangePercent: 0, note: "", sourceAccount: account, fundingMode: "purchase",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) throw new Error(data.error || "Aset riil belum berhasil disimpan.");
      window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added"));
      window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan pembelian aset riil.");
    } finally {
      setSaving(false);
    }
  }

  async function retryStockPurchase() {
    const token = getStoredToken();
    if (!token || !pendingStockPurchase) return;
    setSaving(true);
    setFormError("");
    setAiError("");
    try {
      const response = await fetch(`${API_BASE}/asset-tracker-stocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...pendingStockPurchase, mode: "buy" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        throw new Error(data.error || "Portfolio belum diperbarui.");
      }
      setPendingStockPurchase(null);
      window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
      handleClose();
    } catch (err) {
      setFormError("Transaksi tersimpan, tapi portfolio belum diperbarui.");
      setAiError(err instanceof Error ? err.message : "Portfolio belum diperbarui.");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSubmit() {
    if (!form.amount || parseAmountInput(form.amount) <= 0) {
      setFormError("Masukkan jumlah yang valid.");
      return;
    }
    if (form.type === "Transfer" && (!wallet || !toWallet || wallet.trim().toLowerCase() === toWallet.trim().toLowerCase())) {
      setFormError("Pilih wallet asal dan tujuan yang berbeda untuk transfer.");
      return;
    }
    if (form.type === "Saving" && toWallet && (!wallet || wallet.trim().toLowerCase() === toWallet.trim().toLowerCase())) {
      setFormError("Pilih wallet asal dan tujuan yang berbeda.");
      return;
    }
    if (!form.description.trim()) {
      setFormError("Isi deskripsi transaksi dulu.");
      return;
    }

    if (form.type === "Saving" && realPurchase) {
      const selectedWallet = wallets.find((item) => item.name === wallet);
      if (!wallet || !selectedWallet) {
        setFormError("Pilih rekening sumber dana, misalnya BCA atau BSI.");
        return;
      }
      const parsedReal = parseTransactionText(form.description)?.realPurchase;
      const assetName = parsedReal?.assetName || realAssetName || form.description.trim();
      await persistRealPurchase(assetName, parseAmountInput(form.amount), wallet);
      return;
    }

    let stockToAdd: { ticker: string; market: "ID" | "US"; shares: number; avgPrice: number; account: string } | undefined;
    if (form.type === "Saving" && stockPurchase) {
      const enteredQuantity = Number(stockQuantity);
      const buyPrice = Number(stockBuyPrice);
      const shares = stockMarket === "ID" ? enteredQuantity * 100 : enteredQuantity;
      const selectedWallet = wallets.find((item) => item.name === wallet);

      if (!wallet || selectedWallet?.type !== "investment") {
        setFormError("Pilih wallet investment, misalnya RDN Stockbit.");
        return;
      }
      if (!stockTicker.trim() || enteredQuantity <= 0 || !Number.isFinite(buyPrice) || buyPrice < 0) {
        setFormError("Ticker, jumlah, dan harga beli wajib diisi.");
        return;
      }

      stockToAdd = {
        ticker: stockTicker.trim().toUpperCase(),
        market: stockMarket,
        shares,
        avgPrice: buyPrice,
        account: wallet,
      };
    }

    const now = new Date();
    const isoDate = todayIso();
    await persistTransaction({
      date: isoDate,
      month: now.toLocaleString("en-US", { month: "long" }),
      year: now.getFullYear(),
      type: form.type,
      category: form.type === "Transfer" ? "Transfer" : form.category,
      description: form.description.trim(),
      amount: parseAmountInput(form.amount),
      ...(wallet ? { wallet } : {}),
      ...(form.type === "Transfer" || (form.type === "Saving" && toWallet) ? { toWallet } : {}),
    }, stockToAdd);
  }

  function handleReceiptPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAiError("Pilih file gambar untuk struk.");
      return;
    }
    if (file.size > MAX_RECEIPT_SOURCE_BYTES) {
      setAiError("Foto terlalu besar. Pilih foto di bawah 12 MB.");
      return;
    }
    setAiPreview(null);
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setAiError("");
  }

  async function persistDebtTextPayment(debtName: string, amount: number, sourceAccount: string) {
    const token = getStoredToken();
    if (!token) { setAiError("Sesi akun tidak ditemukan."); return; }
    if (!sourceAccount) { setAiError("Rekening sumber belum disebutkan. Coba: bayar cicilan motor 1,2 juta dari BCA."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/debt-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "textPayment", debtName, amount, wallet: sourceAccount }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Pembayaran utang belum berhasil disimpan.");
      window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added"));
      window.dispatchEvent(new CustomEvent("wealthplanner:debt-updated"));
      handleClose();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Gagal menyimpan pembayaran utang.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAiParse() {
    if (!aiText.trim()) {
      setAiError("Ketik dulu transaksinya, misalnya: Tadi beli makan 35 ribu");
      return;
    }
    const stockIntent = /\b(beli|buy|membeli|beliin)\b/i.test(aiText) && /\b(saham|stock|idx|bei)\b/i.test(aiText);
    const parsed = parseTransactionText(aiText);
    if (parsed?.debtPayment) {
      const debt = parsed.debtPayment;
      await persistDebtTextPayment(debt.debtName, parsed.amount, debt.sourceAccount);
      return;
    }
    if (parsed?.realPurchase && !stockIntent) {
      const real = parsed.realPurchase;
      setMode("manual");
      setForm((f) => ({ ...f, type: "Saving", category: "Real Assets", description: aiText.trim(), amount: parsed.amount ? formatAmountInput(String(parsed.amount)) : "" }));
      setRealPurchase(true);
      setRealAssetName(real.assetName);
      setWallet(real.sourceAccount || "");
      if (!real.sourceAccount) setFormError("Pilih rekening sumber dana untuk pembelian aset riil.");
      setAiError("");
      return;
    }
    if (stockIntent) {
      const stock = parsed?.stockPurchase;
      if (!stock) {
        setAiError("Saham belum dikenali. Coba: beli saham BBCA 10 lot dari Stockbit atau beli saham AAPL 2 lembar dari Stockbit.");
        return;
      }
      setMode("manual");
      setForm((f) => ({ ...f, type: "Saving", category: "Stocks", description: aiText.trim(), amount: "" }));
      setStockPurchase(true);
      setStockMarket(stock.market);
      setStockTicker(stock.ticker);
      setStockQuantity(String(stock.quantity));
      setStockBuyPrice(stock.buyPrice ? String(stock.buyPrice) : "");
      setWallet(stock.sourceAccount || "");
      setStockAmountAuto(Boolean(stock.buyPrice && stock.market === "ID"));
      if (stock.market === "ID" && stock.buyPrice) {
        setForm((f) => ({ ...f, amount: formatAmountInput(String(Math.round(stock.quantity * 100 * (stock.buyPrice ?? 0)))) }));
      }
      if (stock.market === "US" && stock.buyPrice) {
        try {
          const fxResponse = await fetch("/api/exchange-rate?from=USD&to=IDR", { cache: "no-store" });
          const fxData = await fxResponse.json().catch(() => ({}));
          const fx = Number(fxData.rate);
          if (!fxResponse.ok || !Number.isFinite(fx) || fx <= 0) {
            setAiError("Kurs USD/IDR belum tersedia. Isi kurs USD/IDR secara manual.");
            return;
          }
          setForm((f) => ({ ...f, amount: formatAmountInput(String(Math.round(stock.quantity * stock.buyPrice! * fx))) }));
        } catch {
          setAiError("Kurs USD/IDR belum tersedia. Isi kurs USD/IDR secara manual.");
          return;
        }
      }
      if (!stock.sourceAccount) setFormError("Pilih rekening sumber dana, misalnya Stockbit.");
      if (!stock.buyPrice) setFormError(stock.market === "US" ? "Masukkan harga beli dalam USD agar nilai Rupiah dan kurs transaksi bisa dihitung." : "Masukkan harga beli per saham agar nominal transaksi bisa dihitung.");
      setAiError("");
      return;
    }
    if (!parsed) {
      if (/\b(beli|buy|membeli|beliin|purchase)\b/i.test(aiText)) {
        setAiError("Pembelian belum dikenali. Coba format: beli mobil 150 juta dari BCA. Untuk investasi, gunakan nama aset investasinya.");
      } else {
        setAiError("Nggak ketemu nominalnya. Coba sertakan angka, misal '35 ribu'.");
      }
      return;
    }
    setAiError("");
    setAiPreview({ ...parsed, category: resolveCategory(parsed.type, parsed.category) });
  }

  async function handleAiConfirm() {
    if (!aiPreview) return;
    const now = new Date();
    const type = (aiPreview.type as TransactionType) ?? "Expense";
    const amount = Math.round(Number(aiPreview.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      setAiError("Nominal harus lebih dari 0.");
      return;
    }
    if (!String(aiPreview.description || "").trim()) {
      setAiError("Deskripsi tidak boleh kosong.");
      return;
    }
    const parsedDate = aiPreview.date || now.toLocaleDateString("id-ID");
    const [day, monthNumber, year] = parsedDate.split("/").map(Number);
    const parsed = day && monthNumber && year && year >= 2000 ? new Date(year, monthNumber - 1, day) : now;
    await persistTransaction({
      date: parsed === now ? now.toLocaleDateString("id-ID") : parsedDate,
      month: parsed.toLocaleString("en-US", { month: "long" }),
      year: parsed.getFullYear(),
      type,
      category: aiPreview.category ?? resolveCategory(type, fallbackCategories[9]),
      description: String(aiPreview.description).trim(),
      amount,
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Tambah transaksi">
      <div className="flex gap-1 mb-4 bg-charcoal/[0.06] rounded-full p-1">
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 text-[13px] font-semibold py-2 rounded-full transition-colors ${
            mode === "manual" ? "bg-white shadow-sm font-medium text-forest-800" : "text-charcoal/60"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setMode("ai")}
          className={`flex-1 text-[13px] font-semibold py-2 rounded-full transition-colors flex items-center justify-center gap-1 ${
            mode === "ai" ? "bg-white shadow-sm font-medium text-rose-700" : "text-charcoal/60"
          }`}
        >
          <Sparkles size={13} /> Catat dengan AI
        </button>
      </div>

      {mode === "manual" ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {(["Income", "Expense", "Saving", "Transfer"] as TransactionType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setForm((f) => ({ ...f, type: t, category: t === "Transfer" ? "Transfer" : activeCategories[t][0] || f.category }));
                  if (t !== "Saving") {
                    setStockPurchase(false);
                    setRealPurchase(false);
                    setRealAssetName("");
                    setPendingStockPurchase(null);
                  }
                }}
                className={`flex-1 text-[13px] font-semibold py-2.5 rounded-xl border ${
                  form.type === t
                    ? "border-forest-600 bg-forest-50 text-forest-700 font-medium"
                    : "border-charcoal/15 text-charcoal/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs">Dari wallet<select value={wallet} onChange={e=>setWallet(e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-sm"><option value="">Tidak ditentukan</option>{wallets.map(w=><option key={w.id} value={w.name}>{w.name}</option>)}</select></label>{(form.type==="Transfer" || form.type==="Saving") && <label className="text-xs">Ke wallet<select value={toWallet} onChange={e=>setToWallet(e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-3 text-sm"><option value="">Tidak ditentukan</option>{wallets.map(w=><option key={w.id} value={w.name}>{w.name}</option>)}</select></label>}</div>{wallets.length===0 && <p className="text-xs text-amber-700">Belum ada wallet aktif. Tambahkan rekening/dompet di Pengaturan agar bisa memilih wallet dan melakukan transfer.</p>}
          {form.type === "Saving" && (
            <div className="rounded-xl border border-forest-100 bg-forest-50/50 p-3">
              <label className="flex items-center justify-between gap-3 text-[12px] font-semibold text-forest-900">
                <span>Ini pembelian saham</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={stockPurchase}
                  onClick={() => {
                    const next = !stockPurchase;
                    setStockPurchase(next);
                    setFormError("");
                    if (next) {
                      setStockAmountAuto(true);
                      const lotsOrShares = Number(stockQuantity);
                      const buyPrice = Number(stockBuyPrice);
                      if (stockMarket === "ID" && lotsOrShares > 0 && buyPrice >= 0) {
                        setForm((f) => ({ ...f, amount: formatAmountInput(String(Math.round(lotsOrShares * 100 * buyPrice))) }));
                      }
                    }
                  }}
                  className={`relative h-6 w-11 rounded-full transition-colors ${stockPurchase ? "bg-forest-600" : "bg-charcoal/20"}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${stockPurchase ? "left-6" : "left-1"}`} />
                </button>
              </label>

              {stockPurchase && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-[11px] text-charcoal/60">
                    Market
                    <select
                      value={stockMarket}
                      onChange={(e) => {
                        const next = e.target.value as "ID" | "US";
                        setStockMarket(next);
                        setStockAmountAuto(next === "ID");
                        if (next === "US") setForm((f) => ({ ...f, amount: "" }));
                      }}
                      className="mt-1 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-[13px]"
                    >
                      <option value="ID">Indonesia (IDX)</option>
                      <option value="US">US</option>
                    </select>
                  </label>

                  <label className="text-[11px] text-charcoal/60">
                    Ticker
                    <input
                      value={stockTicker}
                      onChange={(e) => setStockTicker(e.target.value.toUpperCase())}
                      placeholder={stockMarket === "ID" ? "BBCA" : "AAPL"}
                      className="mt-1 w-full rounded-lg border border-charcoal/15 px-3 py-2.5 text-[13px] uppercase"
                    />
                  </label>

                  <label className="text-[11px] text-charcoal/60">
                    Jumlah ({stockMarket === "ID" ? "lot" : "saham"})
                    <input
                      inputMode="decimal"
                      value={stockQuantity}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, "");
                        setStockQuantity(value);
                        if (stockAmountAuto && stockMarket === "ID") {
                          const qty = Number(value);
                          const price = Number(stockBuyPrice);
                          if (qty > 0 && price >= 0) setForm((f) => ({ ...f, amount: formatAmountInput(String(Math.round(qty * 100 * price))) }));
                        }
                      }}
                      placeholder={stockMarket === "ID" ? "5" : "10"}
                      className="mt-1 w-full rounded-lg border border-charcoal/15 px-3 py-2.5 text-[13px]"
                    />
                  </label>

                  <label className="text-[11px] text-charcoal/60">
                    Harga beli per saham ({stockMarket === "ID" ? "Rp" : "USD"})
                    <input
                      inputMode="decimal"
                      value={stockBuyPrice}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, "");
                        setStockBuyPrice(value);
                        if (stockAmountAuto && stockMarket === "ID") {
                          const qty = Number(stockQuantity);
                          const price = Number(value);
                          if (qty > 0 && price >= 0) setForm((f) => ({ ...f, amount: formatAmountInput(String(Math.round(qty * 100 * price))) }));
                        }
                      }}
                      placeholder={stockMarket === "ID" ? "9200" : "195.20"}
                      className="mt-1 w-full rounded-lg border border-charcoal/15 px-3 py-2.5 text-[13px]"
                    />
                  </label>

                  <p className="sm:col-span-2 text-[10px] text-charcoal/45">
                    Akun investment mengikuti wallet yang dipilih di atas. Untuk IDX, 1 lot = 100 saham.
                  </p>
                </div>
              )}
            </div>
          )}
          {realPurchase ? (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 px-3 py-3">
              <p className="text-[12px] font-semibold text-cyan-900">Pembelian Aset Riil</p>
              <p className="mt-1 text-[11px] text-cyan-800">Pembelian ini akan otomatis membuat aset di Asset Tracker dan mengurangi saldo rekening sumber. Tidak perlu input transaksi kedua.</p>
              <p className="mt-1 text-[11px] text-cyan-700">Contoh: beli mobil 150 juta dari BCA.</p>
            </div>
          ) : <select
            value={form.type === "Transfer" ? "Transfer" : form.category}
            disabled={form.type === "Transfer"}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full border border-charcoal/15 rounded-xl px-3.5 py-3 text-[14px] bg-white"
          >
            {(form.type === "Transfer" ? ["Transfer"] : (activeCategories[form.type].length ? activeCategories[form.type] : fallbackCategories)).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>}
          <input
            placeholder="Deskripsi (misal: Makan siang)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-charcoal/15 rounded-xl px-3.5 py-3 text-[14px]"
          />
          <input
            placeholder={form.type === "Saving" && stockPurchase && stockMarket === "US" ? "Jumlah transaksi (Rp)" : "Jumlah (Rp)"}
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => {
              setStockAmountAuto(false);
              setForm((f) => ({ ...f, amount: formatAmountInput(e.target.value) }));
            }}
            className="w-full border border-charcoal/15 rounded-xl px-3.5 py-3 text-[14px]"
          />
          {formError && <p className="text-[13px] text-rose-600">{formError}</p>}
          {pendingStockPurchase && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[12px] font-semibold text-amber-800">Transaksi tersimpan, tapi portfolio belum diperbarui</p>
              <p className="mt-1 text-[11px] text-amber-700">Coba ulangi update portfolio. Transaksi tidak akan disimpan lagi.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" disabled={saving} onClick={() => void retryStockPurchase()} className="rounded-full bg-[#0B4D38] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50">
                  {saving ? "Mencoba…" : "Coba lagi"}
                </button>
                <a href="#stock-portfolio" onClick={handleClose} className="text-[11px] font-semibold text-forest-700 underline">
                  Tambah manual di Stock Portfolio
                </a>
              </div>
            </div>
          )}
          <button
            disabled={saving || !!pendingStockPurchase}
            onClick={handleManualSubmit}
            className="w-full bg-[#123524] text-white rounded-full py-3.5 text-[14px] font-semibold hover:bg-forest-800 disabled:opacity-50"
          >
            Simpan transaksi
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-charcoal/60">
            Ketik transaksimu dalam bahasa sehari-hari, sama seperti ngobrol ke bot Telegram.
          </p>
          <input
            placeholder="Tadi beli makan 35 ribu"
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            className="w-full border border-charcoal/15 rounded-xl px-3.5 py-3 text-[14px]"
          />
          <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 p-3">
            <div className="flex items-center justify-between gap-2"><div><p className="text-[13px] font-semibold text-rose-700">Foto struk dengan AI</p><p className="text-[11px] text-charcoal/55 mt-0.5">Upload/foto struk, review hasilnya, lalu simpan.</p></div><Camera size={18} className="text-rose-600"/></div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[12px] font-semibold text-rose-700"><Camera size={14}/> Foto Struk<input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptPick}/></label>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[12px] font-semibold text-rose-700"><Upload size={14}/> Pilih dari Galeri<input type="file" accept="image/*" className="hidden" onChange={handleReceiptPick}/></label>
            </div>
            {receiptPreview&&<img src={receiptPreview} alt="Preview struk" className="mt-2 max-h-40 w-full rounded-lg object-contain bg-white"/>}
            {receiptFile&&<button type="button" disabled={receiptLoading} onClick={async()=>{
  setReceiptLoading(true);
  setAiError("");
  try{
    const dataUrl=await compressReceiptImage(receiptFile);
    const r=await fetch(`${API_BASE}/receipt-ai`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({image:dataUrl,token:getStoredToken()}),
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||`Gagal membaca struk (HTTP ${r.status})`);
    if(!j.transaction) throw new Error("AI tidak mengembalikan data transaksi. Coba foto ulang.");
    const rt = j.transaction as Partial<Transaction>;
    setAiPreview({
      ...rt,
      type: "Expense",
      category: resolveCategory("Expense", rt.category ?? "Other"),
      date: fromIsoDate(toIsoDate(rt.date)),
    });
  }catch(e){
    setAiError(e instanceof Error?e.message:"Gagal membaca struk");
  }finally{
    setReceiptLoading(false);
  }
}} className="mt-2 w-full rounded-lg bg-rose-600 py-2 text-[12px] font-semibold text-white disabled:opacity-50">{receiptLoading?"Mengompres & membaca…":"Baca struk dengan AI"}</button>}
          </div>
          {aiError && <p className="text-[13px] text-rose-600">{aiError}</p>}

          {!aiPreview ? (
            !receiptFile && (
              <button
                onClick={handleAiParse}
                className="w-full bg-rose-600 text-white rounded-lg py-2.5 text-[14px] font-medium hover:bg-rose-700 flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} /> Proses teks dengan AI
              </button>
            )
          ) : (
            <div className="border border-forest-100 bg-forest-50 rounded-lg p-3 text-[13px] flex flex-col gap-1">
              <p className="font-medium text-forest-800 mb-1">Hasil deteksi AI (bisa diedit):</p>
              <label className="text-[11px] text-charcoal/60">Tanggal
                <input type="date" value={toIsoDate(aiPreview.date)} onChange={(e) => e.target.value && setAiPreview({ ...aiPreview, date: fromIsoDate(e.target.value) })}
                  className="mt-0.5 w-full border border-charcoal/15 rounded-lg px-2 py-1.5 text-[13px] bg-white" />
              </label>
              <label className="text-[11px] text-charcoal/60">Kategori
                <select value={aiPreview.category ?? ""} onChange={(e) => setAiPreview({ ...aiPreview, category: e.target.value })}
                  className="mt-0.5 w-full border border-charcoal/15 rounded-lg px-2 py-1.5 text-[13px] bg-white">
                  {Array.from(new Set([aiPreview.category ?? "", ...(activeCategories[(aiPreview.type as TransactionType) ?? "Expense"].length ? activeCategories[(aiPreview.type as TransactionType) ?? "Expense"] : fallbackCategories)])).filter(Boolean).map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-[11px] text-charcoal/60">Deskripsi
                <input value={aiPreview.description ?? ""} onChange={(e) => setAiPreview({ ...aiPreview, description: e.target.value })}
                  className="mt-0.5 w-full border border-charcoal/15 rounded-lg px-2 py-1.5 text-[13px] bg-white" />
              </label>
              <label className="text-[11px] text-charcoal/60">Jumlah (Rp)
                <input inputMode="numeric" value={aiPreview.amount ?? ""} onChange={(e) => setAiPreview({ ...aiPreview, amount: Number(e.target.value.replace(/\D/g, "")) })}
                  className="mt-0.5 w-full border border-charcoal/15 rounded-lg px-2 py-1.5 text-[13px] bg-white" />
              </label>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setAiPreview(null)}
                  className="flex-1 border border-charcoal/15 rounded-lg py-2 text-[13px]"
                >
                  Ulangi
                </button>
                <button
                  disabled={saving}
                  onClick={handleAiConfirm}
                  className="flex-1 bg-forest-600 text-white rounded-lg py-2 text-[13px] font-medium hover:bg-forest-700"
                >
                  {saving ? <><Loader2 size={14} className="inline animate-spin" /> Menyimpan...</> : "Konfirmasi & simpan"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
