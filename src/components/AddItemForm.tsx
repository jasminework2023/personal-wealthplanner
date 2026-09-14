import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

export function AddItemForm({
  placeholder,
  onSubmit,
}: {
  placeholder: string;
  onSubmit: (name: string, amount: number) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const value = Number(amount.replace(/\D/g, ""));
    if (!name.trim() || isNaN(value) || value <= 0) {
      setError("Isi nama dan jumlah yang valid.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit(name.trim(), value);
      setName("");
      setAmount("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-charcoal/15 rounded px-2 py-1 text-[12px]"
      />
      <input
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        placeholder="Jumlah"
        className="w-24 border border-charcoal/15 rounded px-2 py-1 text-[12px]"
      />
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="bg-forest-600 text-white rounded p-1.5 hover:bg-forest-700 disabled:opacity-50"
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
      </button>
      {error && <span className="text-[11px] text-rose-600 ml-2">{error}</span>}
    </div>
  );
}
