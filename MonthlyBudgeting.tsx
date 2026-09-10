import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { ChartCard } from "../components/Card";
import { BudgetProgressBar, StatusBadge } from "../components/ProgressBar";
import { formatRupiah, formatCompact, formatPercent } from "../lib/format";
import { usagePercentage, budgetStatus } from "../data/types";
import { useFinanceData } from "../lib/useFinanceData";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function MonthlyBudgeting() {
  const { loading, error, isRealData, month: currentMonth, totalIncome, totalExpense, budgetExpense, byCategory, updateBudget, saving } = useFinanceData();
  const [month, setMonth] = useState(currentMonth || "June");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const expenseRows = useMemo(() => byCategory("Expense"), [byCategory]);
  const selectedRows = month === currentMonth ? expenseRows : expenseRows.map(r => ({ ...r, allocation: 0, realization: 0, usage: 0 }));
  const remaining = budgetExpense - totalExpense;

  async function saveBudget(category: string) {
    const value = Number(draft);
    if (!Number.isFinite(value) || value < 0) return;
    await updateBudget(category, month, value);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">Monthly Budgeting</h1>
          <p className="text-[14px] text-charcoal/60 mt-0.5">Budget diambil langsung dari sheet Budgeting.</p>
        </div>
        <div className="relative">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="appearance-none border border-charcoal/15 bg-white rounded-lg pl-3.5 pr-9 py-2 text-[14px] font-medium">
            {months.map((m) => <option key={m}>{m}</option>)}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/40" />
        </div>
      </div>

      {error && <p className="text-[13px] text-rose-600">{error}</p>}
      {!isRealData && !loading && <p className="text-[12px] text-charcoal/50">Preview mode: hubungkan token dashboard untuk memakai Google Sheets.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monthly Income" value={formatRupiah(totalIncome)} tone="forest" />
        <StatCard label="Budget" value={formatRupiah(budgetExpense)} tone="neutral" />
        <StatCard label="Actual Spending" value={formatRupiah(totalExpense)} tone="rose" />
        <StatCard label="Remaining Budget" value={formatRupiah(remaining)} tone={remaining < 0 ? "rose" : "forest"} />
      </div>

      <ChartCard title="Pengeluaran per kategori" subtitle={month}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={selectedRows.map(c => ({ name: c.category, value: c.realization }))}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip formatter={(v: number) => formatRupiah(v)} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#285C49" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedRows.map((c) => {
          const pct = usagePercentage(c.realization, c.allocation);
          const status = budgetStatus(pct);
          return (
            <ChartCard key={c.category} title={c.category.toUpperCase()}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] text-charcoal/55">{formatRupiah(c.realization)} / {formatRupiah(c.allocation)}</p>
                <StatusBadge status={status} />
              </div>
              <BudgetProgressBar usagePct={pct} />
              <p className="text-[12px] text-charcoal/50 mt-1.5">{formatPercent(pct)} terpakai</p>
              {month === currentMonth && (
                <div className="mt-3 flex gap-2">
                  {editing === c.category ? (
                    <>
                      <input autoFocus inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value.replace(/\D/g, ""))} className="flex-1 border rounded-lg px-2 py-1.5 text-[13px]" />
                      <button disabled={saving} onClick={() => saveBudget(c.category)} className="px-3 py-1.5 rounded-lg bg-forest-600 text-white text-[12px]">Simpan</button>
                    </>
                  ) : (
                    <button onClick={() => { setEditing(c.category); setDraft(String(c.allocation || "")); }} className="text-[12px] border rounded-lg px-3 py-1.5">Edit budget</button>
                  )}
                </div>
              )}
            </ChartCard>
          );
        })}
      </div>
    </div>
  );
}
