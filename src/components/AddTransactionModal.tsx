import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "./Modal";
import type { Transaction, TransactionType } from "../data/types";

const categories = [
  "Gajian",
  "Freelance Income",
  "Business Income",
  "Dividend / Interest",
  "Utilities",
  "Internet & Phone",
  "Insurance Premium",
  "Food & Groceries",
  "Transport",
  "Entertainment",
  "Education",
  "Charity",
  "Mutual Funds",
  "Gold",
  "Deposito",
];

// Mock "AI" parser -- pola kata kunci sederhana, jadi placeholder sampai
// backend AI (bot Telegram yang sudah ada) beneran disambungkan ke sini.
function mockParseAI(text: string): Partial<Transaction> | null {
  const amountMatch = text.match(/(\d+)\s*(rb|ribu|k)?/i);
  if (!amountMatch) return null;
  let amount = parseInt(amountMatch[1], 10);
  if (/rb|ribu|k/i.test(amountMatch[2] ?? "")) amount *= 1000;

  const lower = text.toLowerCase();
  let category = "Food & Groceries";
  let type: TransactionType = "Expense";
  if (lower.includes("gaji")) {
    category = "Gajian";
    type = "Income";
  } else if (lower.includes("bensin") || lower.includes("ojek") || lower.includes("grab")) {
    category = "Transport";
  } else if (lower.includes("nonton") || lower.includes("main")) {
    category = "Entertainment";
  } else if (lower.includes("pulsa") || lower.includes("kuota") || lower.includes("internet")) {
    category = "Internet & Phone";
  }

  return {
    type,
    category,
    amount,
    description: text.replace(/\d+\s*(rb|ribu|k)?/i, "").trim() || category,
  };
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

  const [form, setForm] = useState({
    type: "Expense" as TransactionType,
    category: categories[7],
    description: "",
    amount: "",
  });
  const [formError, setFormError] = useState("");

  function reset() {
    setAiText("");
    setAiPreview(null);
    setAiError("");
    setFormError("");
    setForm({ type: "Expense", category: categories[7], description: "", amount: "" });
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleManualSubmit() {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setFormError("Masukkan jumlah yang valid.");
      return;
    }
    if (!form.description.trim()) {
      setFormError("Isi deskripsi transaksi dulu.");
      return;
    }
    const now = new Date();
    onAdd({
      date: now.toLocaleDateString("id-ID"),
      month: now.toLocaleString("en-US", { month: "long" }),
      type: form.type,
      category: form.category,
      description: form.description.trim(),
      amount: Number(form.amount),
    });
    handleClose();
  }

  function handleAiParse() {
    if (!aiText.trim()) {
      setAiError("Ketik dulu transaksinya, misalnya: Tadi beli makan 35 ribu");
      return;
    }
    const parsed = mockParseAI(aiText);
    if (!parsed) {
      setAiError("Nggak ketemu nominalnya. Coba sertakan angka, misal '35 ribu'.");
      return;
    }
    setAiError("");
    setAiPreview(parsed);
  }

  function handleAiConfirm() {
    if (!aiPreview) return;
    const now = new Date();
    onAdd({
      date: now.toLocaleDateString("id-ID"),
      month: now.toLocaleString("en-US", { month: "long" }),
      type: (aiPreview.type as TransactionType) ?? "Expense",
      category: aiPreview.category ?? "Food & Groceries",
      description: aiPreview.description ?? "Transaksi",
      amount: aiPreview.amount ?? 0,
    });
    handleClose();
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
                onClick={() => setForm((f) => ({ ...f, type: t }))}
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
            {categories.map((c) => (
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
                  onClick={handleAiConfirm}
                  className="flex-1 bg-forest-600 text-white rounded-lg py-2 text-[13px] font-medium hover:bg-forest-700"
                >
                  Konfirmasi & simpan
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
