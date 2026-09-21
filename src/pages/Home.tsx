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
import { formatRupiah, formatCompact } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { getDisplayName, greetingWord } from "../lib/settings";
import type { Transaction } from "../data/types";

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];

export function Home() {
  const { loading, error, isRealData, username, transactions, totalIncome, totalExpense, totalSaving, byCategory, month, assets } = useFinanceData();
  const [extraTxs, setExtraTxs] = useState<Transaction[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"manual" | "ai">("manual");

  const displayName = getDisplayName() || username;
  const currentYear = new Date().getFullYear();

  const allTxs = [...transactions, ...extraTxs];
  const parseRecentDate = (value:string, monthLabel?:string) => { const p=value.split("/").map(Number); if(p.length<3||p.some(Number.isNaN)) return 0; let [a,b,y]=p; const months=["january","february","march","april","may","june","july","august","september","october","november","december"]; const idx=months.indexOf((monthLabel||"").toLowerCase()); let m=b,d=a; if(idx>=0){m=idx+1; if(a===m&&b!==m)d=b; else d=a;} else if(a>12){d=a;m=b;} else if(b>12){d=b;m=a;} return new Date(y,m-1,d).getTime(); };
  const recent = [...allTxs].sort((a,b)=>parseRecentDate(b.date,b.month)-parseRecentDate(a.date,a.month)).slice(0,5);
  const nextStep = totalExpense > totalIncome && totalIncome > 0
    ? "Pengeluaranmu bulan ini sudah lebih besar dari pemasukan. Cek kategori pengeluaran terbesar dan review budget."
    : assets.target > 0 && assets.totalAssets < assets.target
      ? `Target asetmu masih ${formatRupiah(Math.max(0, assets.target-assets.totalAssets))} lagi. Review Asset Tracker dan rencana investasimu.`
      : totalSaving > 0 ? "Kamu sudah punya saving bulan ini. Lanjutkan konsistensi dan cek apakah target finansialmu sudah punya angka yang jelas."
      : "Mulai dengan mencatat transaksi dan isi satu target finansial agar dashboard bisa memberi arah langkah berikutnya.";
  
  const cashFlowData = [
    { name: "Income", value: totalIncome },
    { name: "Expense", value: totalExpense },
    { name: "Savings", value: totalSaving },
  ];

  const spendingByCategory = byCategory("Expense").filter((c) => c.realization > 0).map((c) => ({ name: c.category, value: c.realization }));

  return (
    <div className="flex flex-col gap-6">
      <DataStatusBanner isRealData={isRealData} username={username} error={error} />

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">
            {greetingWord()}{displayName ? `, ${displayName}` : ""} <span aria-hidden>👋</span>
          </h1>
          <p className="text-[14px] text-charcoal/60 mt-0.5">Ringkasan keuangan untuk {month} {currentYear}.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              setModalMode("manual");
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 border border-charcoal/15 bg-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-charcoal/5"
          >
            <Plus size={15} /> Tambah Transaksi
          </button>
          <button
            onClick={() => {
              setModalMode("ai");
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-rose-600 text-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-rose-700"
          >
            <Sparkles size={15} /> Catat dengan AI
          </button>
        </div>
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">💡</div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-forest-600">Your next step</p><p className="mt-1 text-[13px] leading-5 text-charcoal/70">{nextStep}</p></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Assets" value={formatRupiah(assets.totalAssets)} icon={Wallet} tone="forest" />
        <StatCard label="Monthly Income" value={formatRupiah(totalIncome)} icon={TrendingUp} tone="forest" />
        <StatCard label="Monthly Spending" value={formatRupiah(totalExpense)} icon={TrendingDown} tone="rose" />
        <StatCard label="Monthly Savings" value={formatRupiah(totalSaving)} icon={PiggyBank} tone="lilac" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Cash Flow" subtitle="Income, expense, dan savings bulan ini">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cashFlowData}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 11, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(v: number) => formatRupiah(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {cashFlowData.map((_, i) => (
                  <Cell key={i} fill={["var(--chart-income)", "var(--chart-expense)", "var(--chart-saving)"][i]} />
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
        onAdd={(t) => {
          if (!isRealData) setExtraTxs((prev) => [...prev, t]);
        }}
        initialMode={modalMode}
      />
    </div>
  );
}
