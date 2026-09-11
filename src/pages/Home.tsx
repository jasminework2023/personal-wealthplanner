import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, Sparkles } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { StatCard } from "../components/StatCard";
import { ChartCard, Card } from "../components/Card";
import { TransactionBadge } from "../components/TransactionBadge";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { DataStatusBanner } from "../components/DataStatusBanner";
import { formatRupiah, formatCompact, formatPercent } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { totalAssets, assetTarget } from "../data/assets";
import type { Transaction } from "../data/types";

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

const PIE_COLORS = ["#285C49", "#4C8570", "#D44F76", "#E17E9B", "#B58900", "#7A7A7A", "#3E7CB1", "#A93A5C"];

export function Home() {
  const { loading, error, isRealData, username, transactions, totalIncome, totalExpense, totalSaving, byCategory } = useFinanceData();
  const [extraTxs, setExtraTxs] = useState<Transaction[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"manual" | "ai">("manual");

  const allTxs = [...transactions, ...extraTxs];
  const recent = [...allTxs].reverse().slice(0, 5);
  const progress = (totalAssets / assetTarget) * 100;

  const cashFlowData = [
    { name: "Income", value: totalIncome },
    { name: "Expense", value: totalExpense },
    { name: "Savings", value: totalSaving },
  ];

  const spendingByCategory = byCategory("Expense").filter((c) => c.realization > 0).map((c) => ({ name: c.category, value: c.realization }));

  return (
    <div className="flex flex-col gap-6">
      <DataStatusBanner isRealData={isRealData} username={username} error={error} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">{greeting()}</h1>
          <p className="text-[14px] text-charcoal/60 mt-0.5">Berikut ringkasan kondisi keuanganmu.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setModalMode("manual");
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 border border-charcoal/15 bg-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-charcoal/5"
          >
            <Plus size={15} /> Tambah Transaksi
          </button>
          <button
            onClick={() => {
              setModalMode("ai");
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-rose-600 text-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-rose-700"
          >
            <Sparkles size={15} /> Catat dengan AI
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Assets" value={formatRupiah(totalAssets)} icon={Wallet} tone="forest" />
        <StatCard label="Total Income" value={formatRupiah(totalIncome)} icon={TrendingUp} tone="forest" />
        <StatCard label="Total Spending" value={formatRupiah(totalExpense)} icon={TrendingDown} tone="rose" />
        <StatCard label="Monthly Savings" value={formatRupiah(totalSaving)} icon={PiggyBank} tone="forest" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Cash Flow" subtitle="Income, expense, dan savings bulan ini">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashFlowData}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b6b6b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11, fill: "#6b6b6b" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(v: number) => formatRupiah(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {cashFlowData.map((_, i) => (
                  <Cell key={i} fill={["#285C49", "#D44F76", "#B58900"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Spending Overview" subtitle="Pengeluaran berdasarkan kategori">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={spendingByCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {spendingByCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatRupiah(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Financial Goal" subtitle={`Target ${formatRupiah(assetTarget)} (contoh — belum ada fitur pencatatan aset)`}>
        <div className="flex items-center justify-between mb-2 text-[13px]">
          <span className="text-charcoal/60">Current assets: {formatRupiah(totalAssets)}</span>
          <span className="font-medium text-forest-700">{formatPercent(progress)}</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-charcoal/8 overflow-hidden">
          <div className="h-full bg-forest-600 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </ChartCard>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold text-forest-900">Recent Transactions</h3>
        </div>
        <div className="flex flex-col divide-y divide-charcoal/8">
          {recent.map((t, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <TransactionBadge type={t.type} />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate">{t.description}</p>
                  <p className="text-[12px] text-charcoal/50">{t.category} &middot; {t.date}</p>
                </div>
              </div>
              <p className={`text-[14px] font-medium shrink-0 ml-3 ${t.type === "Expense" ? "text-rose-600" : "text-forest-700"}`}>
                {t.type === "Expense" ? "-" : "+"}
                {formatRupiah(t.amount)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(t) => setExtraTxs((prev) => [...prev, t])}
        initialMode={modalMode}
      />
    </div>
  );
}
