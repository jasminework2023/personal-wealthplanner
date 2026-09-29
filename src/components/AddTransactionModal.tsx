import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Loader2, Sparkles, Camera, Upload } from "lucide-react";
import { Modal } from "./Modal";
import type { Transaction, TransactionType } from "../data/types";
import { getStoredToken, useFinanceData } from "../lib/useFinanceData";
import { parseTransactionText } from "../lib/transactionParser";

const API_BASE = "/api";

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
  const [aiText, setAiText] = useState("");
  const [aiPreview, setAiPreview] = useState<Partial<Transaction> | null>(null);
  const [aiError, setAiError] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { setup } = useFinanceData();

  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    };
  }, [receiptPreview]);
  const activeCategories = useMemo(() => ({
    Income: setup.income.filter((x) => x.active && x.name.trim()).map((x) => x.name),
    Expense: setup.expense.filter((x) => x.active && x.name.trim()).map((x) => x.name),
    Saving: setup.saving.filter((x) => x.active && x.name.trim()).map((x) => x.name),
  }), [setup]);

  function resolveCategory(type: TransactionType, parsedCategory: string) {
    const options = activeCategories[type];
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
    setForm({ type: "Expense", category: activeCategories.Expense[0] || fallbackCategories[9], description: "", amount: "" });
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function persistTransaction(transaction: Transaction) {
    const token = getStoredToken();
    setSaving(true);
    setFormError("");
    setAiError("");
    try {
      if (token) {
        const response = await fetch(`${API_BASE}/add-transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, transaction }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Gagal menyimpan transaksi");
      }
      onAdd(transaction);
      window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added", { detail: transaction }));
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added")), 2500);
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan transaksi";
      setFormError(message);
      setAiError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSubmit() {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setFormError("Masukkan jumlah yang valid.");
      return;
    }
    if (!form.description.trim()) {
      setFormError("Isi deskripsi transaksi dulu.");
      return;
    }
    const now = new Date();
    await persistTransaction({
      date: now.toLocaleDateString("id-ID"),
      month: now.toLocaleString("en-US", { month: "long" }),
      year: now.getFullYear(),
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
    });
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

  function handleAiParse() {
    if (!aiText.trim()) {
      setAiError("Ketik dulu transaksinya, misalnya: Tadi beli makan 35 ribu");
      return;
    }
    const parsed = parseTransactionText(aiText);
    if (!parsed) {
      setAiError("Nggak ketemu nominalnya. Coba sertakan angka, misal '35 ribu'.");
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
      <div className="flex gap-1 mb-4 bg-charcoal/5 rounded-lg p-1">
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 text-[13px] py-1.5 rounded-md transition-colors ${
            mode === "manual" ? "bg-white shadow-sm font-medium text-forest-800" : "text-charcoal/60"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => setMode("ai")}
          className={`flex-1 text-[13px] py-1.5 rounded-md transition-colors flex items-center justify-center gap-1 ${
            mode === "ai" ? "bg-white shadow-sm font-medium text-rose-700" : "text-charcoal/60"
          }`}
        >
          <Sparkles size={13} /> Catat dengan AI
        </button>
      </div>

      {mode === "manual" ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {(["Income", "Expense", "Saving"] as TransactionType[]).map((t) => (
              <button
                key={t}
                onClick={() => setForm((f) => ({ ...f, type: t, category: activeCategories[t][0] || f.category }))}
                className={`flex-1 text-[13px] py-1.5 rounded-lg border ${
                  form.type === t
                    ? "border-forest-600 bg-forest-50 text-forest-700 font-medium"
                    : "border-charcoal/15 text-charcoal/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full border border-charcoal/15 rounded-lg px-3 py-2 text-[14px] bg-white"
          >
            {(activeCategories[form.type].length ? activeCategories[form.type] : fallbackCategories).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            placeholder="Deskripsi (misal: Makan siang)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full border border-charcoal/15 rounded-lg px-3 py-2 text-[14px]"
          />
          <input
            placeholder="Jumlah (Rp)"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/\D/g, "") }))}
            className="w-full border border-charcoal/15 rounded-lg px-3 py-2 text-[14px]"
          />
          {formError && <p className="text-[13px] text-rose-600">{formError}</p>}
          <button
            onClick={handleManualSubmit}
            className="w-full bg-forest-600 text-white rounded-lg py-2.5 text-[14px] font-medium hover:bg-forest-700"
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
            className="w-full border border-charcoal/15 rounded-lg px-3 py-2 text-[14px]"
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
      body:JSON.stringify({image:dataUrl}),
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
