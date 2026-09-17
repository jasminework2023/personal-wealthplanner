import { useEffect, useMemo, useState } from "react";
const API_BASE = "/api";
import { Loader2, Sparkles } from "lucide-react";
import { Modal } from "./Modal";
import type { Transaction, TransactionType } from "../data/types";
import { getStoredToken, useFinanceData } from "../lib/useFinanceData";
import { parseTransactionText } from "../lib/transactionParser";

const fallbackCategories = [
  "Gajian", "Freelance Income", "Business Income", "Commission", "Dividend / Interest", "Side Hustle",
  "Utilities", "Internet & Phone", "Insurance Premium", "Food & Groceries", "Transport", "Entertainment", "Education", "Charity",
  "Mutual Funds", "Bonds", "Gold", "Deposito",
];

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
  const [saving, setSaving] = useState(false);
  const { setup } = useFinanceData();
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
    setAiPreview(parsed);
  }

  async function handleAiConfirm() {
    if (!aiPreview) return;
    const now = new Date();
    const type = (aiPreview.type as TransactionType) ?? "Expense";
    const parsedDate = aiPreview.date || now.toLocaleDateString("id-ID");
    const [day, monthNumber, year] = parsedDate.split("/").map(Number);
    const parsed = day && monthNumber && year ? new Date(year, monthNumber - 1, day) : now;
    await persistTransaction({
      date: parsedDate,
      month: parsed.toLocaleString("en-US", { month: "long" }),
      year: parsed.getFullYear(),
      type,
      category: resolveCategory(type, aiPreview.category ?? fallbackCategories[9]),
      description: aiPreview.description ?? "Transaksi",
      amount: aiPreview.amount ?? 0,
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
          {aiError && <p className="text-[13px] text-rose-600">{aiError}</p>}

          {!aiPreview ? (
            <button
              onClick={handleAiParse}
              className="w-full bg-rose-600 text-white rounded-lg py-2.5 text-[14px] font-medium hover:bg-rose-700 flex items-center justify-center gap-1.5"
            >
              <Sparkles size={14} /> Proses dengan AI
            </button>
          ) : (
            <div className="border border-forest-100 bg-forest-50 rounded-lg p-3 text-[13px] flex flex-col gap-1">
              <p className="font-medium text-forest-800 mb-1">Hasil deteksi AI:</p>
              <p>
                Type: <span className="font-medium">{aiPreview.type}</span>
              </p>
              <p>
                Category: <span className="font-medium">{aiPreview.category}</span>
              </p>
              <p>
                Amount: <span className="font-medium">Rp{aiPreview.amount?.toLocaleString("id-ID")}</span>
              </p>
              <p>
                Description: <span className="font-medium">{aiPreview.description}</span>
              </p>
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
