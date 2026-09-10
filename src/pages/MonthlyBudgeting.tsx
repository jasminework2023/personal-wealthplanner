import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { ChartCard } from "../components/Card";
import { BudgetProgressBar, StatusBadge } from "../components/ProgressBar";
import { formatRupiah, formatCompact, formatPercent } from "../lib/format";
import { usagePercentage, budgetStatus } from "../data/types";
import { expenseCategories, totalIncome, totalExpense, budgetExpensePlan } from "../data/budgets";

const months = ["January", "February", "March", "April", "May", "June 2026", "July", "August"];

export function MonthlyBudgeting() {
  const [month, setMonth] = useState("June 2026");
  const remaining = budgetExpensePlan - totalExpense;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">Monthly Budgeting</h1>
          <p className="text-[14px] text-charcoal/60 mt-0.5">Pantau anggaran bulananmu per kategori.</p>
        </div>
        <div className="relative">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="appearance-none border border-charcoal/15 bg-white rounded-lg pl-3.5 pr-9 py-2 text-[14px] font-medium"
          >
            {months.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/40" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monthly Income" value={formatRupiah(totalIncome)} tone="forest" />
        <StatCard label="Budget" value={formatRupiah(budgetExpensePlan)} tone="neutral" />
        <StatCard label="Actual Spending" value={formatRupiah(totalExpense)} tone="rose" />
        <StatCard label="Remaining Budget" value={formatRupiah(remaining)} tone={remaining < 0 ? "rose" : "forest"} />
      </div>

      <ChartCard title="Pengeluaran per kategori" subtitle={month}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={expenseCategories.map((c) => ({ name: c.category, value: c.realization }))}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b6b6b" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11, fill: "#6b6b6b" }} axisLine={false} tickLine={false} width={50} />
            <Tooltip formatter={(v: number) => formatRupiah(v)} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#285C49" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {expenseCategories.map((c) => {
          const pct = usagePercentage(c.realization, c.allocation);
          const status = budgetStatus(pct);
          return (
            <ChartCard key={c.category} title={c.category.toUpperCase()}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] text-charcoal/55">
                  {formatRupiah(c.realization)} / {formatRupiah(c.allocation)}
                </p>
                <StatusBadge status={status} />
              </div>
              <BudgetProgressBar usagePct={pct} />
              <p className="text-[12px] text-charcoal/50 mt-1.5">{formatPercent(pct)} terpakai</p>
            </ChartCard>
          );
        })}
      </div>
    </div>
  );
}
