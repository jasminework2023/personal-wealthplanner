import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, PiggyBank, Landmark } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { ChartCard, Card } from "../components/Card";
import { BudgetProgressBar, StatusBadge } from "../components/ProgressBar";
import { DataStatusBanner } from "../components/DataStatusBanner";
import { formatRupiah, formatCompact, formatPercent } from "../lib/format";
import { usagePercentage, budgetStatus } from "../data/types";
import { useFinanceData } from "../lib/useFinanceData";
import {
  incomeCategories as mockIncomeCategories,
  expenseCategories as mockExpenseCategories,
  savingCategories as mockSavingCategories,
  budgetExpensePlan,
} from "../data/budgets";
import { assetGroups, totalAssets, assetTarget, usdRate, stocksID, stocksUS, stockValue, stockPL } from "../data/assets";

const PIE_COLORS = ["#285C49", "#4C8570", "#D44F76", "#E17E9B", "#B58900"];

function BudgetRow({
  category,
  allocation,
  realization,
  hasBudget = true,
}: {
  category: string;
  allocation: number;
  realization: number;
  hasBudget?: boolean;
}) {
  const pct = usagePercentage(realization, allocation);
  const status = budgetStatus(pct);
  const overBy = pct > 100 ? pct - 100 : 0;
  return (
    <div className="py-3 border-b border-charcoal/8 last:border-0">
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <p className="text-[14px] font-medium">{category}</p>
        {hasBudget ? (
          <StatusBadge status={status} />
        ) : (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-charcoal/5 text-charcoal/50">
            Belum ada budget
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-[12px] text-charcoal/55 mb-1.5">
        <span>
          {formatRupiah(realization)}
          {hasBudget ? ` / ${allocation ? formatRupiah(allocation) : "tanpa budget"}` : ""}
        </span>
        {hasBudget && <span className="font-medium">{formatPercent(pct)}</span>}
      </div>
      {hasBudget && (
        <>
          <BudgetProgressBar usagePct={pct} />
          {overBy > 0 && (
            <p className="text-[12px] text-rose-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={12} /> {category} sudah melebihi budget sebesar {formatPercent(Math.round(overBy * 10) / 10)}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function DashboardFinance() {
  const { loading, error, isRealData, username, totalIncome, totalExpense, totalSaving, byCategory } = useFinanceData();
  const assetProgress = (totalAssets / assetTarget) * 100;

  const idValue = stocksID.reduce((s, x) => s + stockValue(x), 0);
  const usValueIDR = stocksUS.reduce((s, x) => s + stockValue(x), 0) * usdRate;
  const totalPortfolio = idValue + usValueIDR;

  const assetChartData = assetGroups.flatMap((g) => g.items.map((i) => ({ name: i.name, value: i.value, group: g.group })));

  // Kalau data asli sudah tersambung, pakai realisasi asli TAPI tanpa
  // angka budget/target (bot belum pernah nyatet itu) -- daripada nampilin
  // budget contoh yang bukan angka beneran. Kalau masih demo, pakai contoh
  // dari data/budgets.ts biar halamannya tetap kelihatan lengkap.
  const incomeRows = isRealData
    ? byCategory("Income").map((c) => ({ ...c, allocation: 0 }))
    : mockIncomeCategories.filter((c) => c.allocation > 0 || c.realization > 0);
  const savingRows = isRealData ? byCategory("Saving").map((c) => ({ ...c, allocation: 0 })) : mockSavingCategories;
  const expenseRows = isRealData ? byCategory("Expense").map((c) => ({ ...c, allocation: 0 })) : mockExpenseCategories;

  return (
    <div className="flex flex-col gap-6">
      <DataStatusBanner isRealData={isRealData} username={username} error={error} />

      <div>
        <h1 className="text-2xl font-semibold text-forest-900">Dashboard Finance</h1>
        <p className="text-[14px] text-charcoal/60 mt-0.5">Ringkasan lengkap kondisi keuanganmu.</p>
      </div>

      {/* A. Ringkasan Bulanan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Income" value={formatRupiah(totalIncome)} icon={TrendingUp} tone="forest" />
        <StatCard
          label="Budget Expense"
          value={isRealData ? "Belum diatur" : formatRupiah(budgetExpensePlan)}
          icon={Landmark}
          tone="neutral"
        />
        <StatCard label="Total Spending" value={formatRupiah(totalExpense)} icon={TrendingDown} tone="rose" />
        <StatCard label="Monthly Savings" value={formatRupiah(totalSaving)} icon={PiggyBank} tone="forest" />
      </div>

      {/* B. Income Overview */}
      <ChartCard title="Income Overview" subtitle={isRealData ? "Realisasi pendapatan per kategori (budget belum diatur)" : "Realisasi pendapatan per kategori"}>
        <div>
          {incomeRows.map((c) => (
            <BudgetRow key={c.category} category={c.category} allocation={c.allocation} realization={c.realization} hasBudget={!isRealData} />
          ))}
        </div>
      </ChartCard>

      {/* C. Savings Overview */}
      <ChartCard title="Savings Overview" subtitle={`Total savings ${formatRupiah(totalSaving)}`}>
        <div>
          {savingRows.map((c) => (
            <BudgetRow key={c.category} category={c.category} allocation={c.allocation} realization={c.realization} hasBudget={!isRealData} />
          ))}
        </div>
      </ChartCard>

      {/* D. Expense Overview */}
      <ChartCard title="Expense Overview" subtitle={isRealData ? "Realisasi per kategori (budget belum diatur)" : "Kategori yang melebihi budget ditandai jelas"}>
        <div>
          {expenseRows.map((c) => (
            <BudgetRow key={c.category} category={c.category} allocation={c.allocation} realization={c.realization} hasBudget={!isRealData} />
          ))}
        </div>
      </ChartCard>

      {/* E. Asset Tracker */}
      <ChartCard title="Asset Tracker" subtitle={`Target ${formatRupiah(assetTarget)} (contoh — belum ada fitur pencatatan aset)`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[12px] text-charcoal/55">Total Assets</p>
                <p className="text-[18px] font-semibold text-forest-900">{formatRupiah(totalAssets)}</p>
              </div>
              <div>
                <p className="text-[12px] text-charcoal/55">Equivalent USD</p>
                <p className="text-[18px] font-semibold text-forest-900">
                  ${Math.round(totalAssets / usdRate).toLocaleString("en-US")}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[12px] text-charcoal/55 mb-1.5">
              <span>Progress ke target</span>
              <span className="font-medium text-forest-700">{formatPercent(assetProgress)}</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-charcoal/8 overflow-hidden mb-5">
              <div className="h-full bg-forest-600 rounded-full" style={{ width: `${Math.min(assetProgress, 100)}%` }} />
            </div>

            {assetGroups.map((g) => (
              <div key={g.group} className="mb-3">
                <p className="text-[12px] font-medium text-charcoal/60 uppercase tracking-wide mb-1.5">{g.group}</p>
                {g.items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-[13px] py-1">
                    <span className="text-charcoal/70">{item.name}</span>
                    <span className="font-medium">{formatRupiah(item.value)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={assetChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {assetChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatRupiah(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartCard>

      {/* F. Stock Net Worth */}
      <ChartCard title="Stock Net Worth" subtitle="Contoh — belum ada fitur pencatatan saham">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={[...stocksID, ...stocksUS].map((s) => ({ ticker: s.ticker, value: s.market === "US" ? stockValue(s) * usdRate : stockValue(s) }))}
          >
            <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: "#6b6b6b" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11, fill: "#6b6b6b" }} axisLine={false} tickLine={false} width={50} />
            <Tooltip formatter={(v: number) => formatRupiah(v)} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#285C49" />
          </BarChart>
        </ResponsiveContainer>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-[13px] min-w-[520px]">
            <thead>
              <tr className="text-left text-charcoal/50 text-[12px] border-b border-charcoal/8">
                <th className="py-2 font-medium">Stock</th>
                <th className="py-2 font-medium">Price</th>
                <th className="py-2 font-medium">Shares</th>
                <th className="py-2 font-medium">Avg price</th>
                <th className="py-2 font-medium text-right">Value</th>
                <th className="py-2 font-medium text-right">P/L</th>
              </tr>
            </thead>
            <tbody>
              {[...stocksID, ...stocksUS].map((s) => {
                const pl = stockPL(s);
                return (
                  <tr key={s.ticker} className="border-b border-charcoal/8 last:border-0">
                    <td className="py-2 font-medium">
                      {s.ticker} <span className="text-charcoal/40 text-[11px]">{s.market}</span>
                    </td>
                    <td className="py-2">{s.market === "US" ? "$" + s.currentPrice : formatRupiah(s.currentPrice)}</td>
                    <td className="py-2">{s.shares}</td>
                    <td className="py-2">{s.market === "US" ? "$" + s.avgPrice : formatRupiah(s.avgPrice)}</td>
                    <td className="py-2 text-right font-medium">
                      {formatRupiah(s.market === "US" ? stockValue(s) * usdRate : stockValue(s))}
                    </td>
                    <td className={`py-2 text-right font-medium ${pl >= 0 ? "text-forest-700" : "text-rose-600"}`}>
                      {pl >= 0 ? "+" : ""}
                      {s.market === "US" ? "$" + pl.toFixed(0) : formatRupiah(pl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-charcoal/8">
          <div>
            <p className="text-[12px] text-charcoal/55">Subtotal ID</p>
            <p className="text-[15px] font-semibold">{formatRupiah(idValue)}</p>
          </div>
          <div>
            <p className="text-[12px] text-charcoal/55">Subtotal US</p>
            <p className="text-[15px] font-semibold">{formatRupiah(usValueIDR)}</p>
          </div>
          <div>
            <p className="text-[12px] text-charcoal/55">Total Portfolio</p>
            <p className="text-[15px] font-semibold text-forest-800">{formatRupiah(totalPortfolio)}</p>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
