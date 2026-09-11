import { useState } from "react";
import { Check, Pencil, Loader2 } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { ChartCard } from "../components/Card";
import { BudgetProgressBar, StatusBadge } from "../components/ProgressBar";
import { formatRupiah, formatPercent } from "../lib/format";
import { usagePercentage, budgetStatus } from "../data/types";
import { useFinanceData, getStoredToken } from "../lib/useFinanceData";

function EditableBudgetCard({
  category,
  allocation,
  realization,
  month,
  isRealData,
  onSaved,
}: {
  category: string;
  allocation: number;
  realization: number;
  month: string;
  isRealData: boolean;
  onSaved: (category: string, amount: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(allocation || ""));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const pct = usagePercentage(realization, allocation);
  const status = budgetStatus(pct);

  async function handleSave() {
    const amount = Number(value.replace(/\D/g, ""));
    if (isNaN(amount) || amount < 0) {
      setErr("Masukkan angka yang valid.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${import.meta.env.BASE_URL}api/update-budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, category, month, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      onSaved(category, amount);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ChartCard title={category.toUpperCase()}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] text-charcoal/55">
          {formatRupiah(realization)} / {editing ? "" : formatRupiah(allocation)}
        </p>
        <StatusBadge status={status} />
      </div>

      {editing ? (
        <div className="flex items-center gap-2 mb-2">
          <input
            autoFocus
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            className="flex-1 border border-charcoal/15 rounded-lg px-2.5 py-1.5 text-[13px]"
            placeholder="Budget baru (Rp)"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-forest-600 text-white rounded-lg p-1.5 hover:bg-forest-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
        </div>
      ) : (
        <>
          <BudgetProgressBar usagePct={pct} />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[12px] text-charcoal/50">{formatPercent(pct)} terpakai</p>
            {isRealData && (
              <button
                onClick={() => {
                  setValue(String(allocation || ""));
                  setEditing(true);
                }}
                className="text-[12px] text-forest-700 flex items-center gap-1 hover:underline"
              >
                <Pencil size={11} /> Edit
              </button>
            )}
          </div>
        </>
      )}
      {err && <p className="text-[12px] text-rose-600 mt-1">{err}</p>}
    </ChartCard>
  );
}

export function MonthlyBudgeting() {
  const { isRealData, month, totalIncome, totalExpense, byCategory } = useFinanceData();
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const expenseRows = byCategory("Expense").map((c) => ({
    ...c,
    allocation: overrides[c.category] ?? c.allocation,
  }));
  const budgetExpensePlan = expenseRows.reduce((s, c) => s + c.allocation, 0);
  const remaining = budgetExpensePlan - totalExpense;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">Monthly Budgeting</h1>
          <p className="text-[14px] text-charcoal/60 mt-0.5">
            Pantau anggaran {month}mu per kategori.
            {isRealData && " Klik \u201cEdit\u201d buat ubah budget, otomatis update ke spreadsheet."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monthly Income" value={formatRupiah(totalIncome)} tone="forest" />
        <StatCard label="Budget" value={formatRupiah(budgetExpensePlan)} tone="neutral" />
        <StatCard label="Actual Spending" value={formatRupiah(totalExpense)} tone="rose" />
        <StatCard label="Remaining Budget" value={formatRupiah(remaining)} tone={remaining < 0 ? "rose" : "forest"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {expenseRows.map((c) => (
          <EditableBudgetCard
            key={c.category}
            category={c.category}
            allocation={c.allocation}
            realization={c.realization}
            month={month}
            isRealData={isRealData}
            onSaved={(category, amount) => setOverrides((o) => ({ ...o, [category]: amount }))}
          />
        ))}
      </div>
    </div>
  );
}
