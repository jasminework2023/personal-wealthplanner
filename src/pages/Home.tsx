import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, Sparkles,
  ArrowLeftRight, Landmark, Calculator, Target, ShieldCheck,
  ChartNoAxesCombined, Bot, BookOpen, ChevronRight, X,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, ChartCard } from "../components/Card";
import { TransactionBadge } from "../components/TransactionBadge";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { DataStatusBanner } from "../components/DataStatusBanner";
import { formatRupiah, formatCompact } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { getDisplayName, greetingWord } from "../lib/settings";
import type { Transaction } from "../data/types";
import { loadFinancialPlans } from "../lib/financialPlans";
import { ThemeToggle } from "../components/ThemeToggle";

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];
const menus = [
  { label: "Transaction", icon: ArrowLeftRight, to: "/transactions" },
  { label: "Budget", icon: Wallet, to: "/budgeting" },
  { label: "Asset", icon: Landmark, to: "/finance" },
  { label: "Calculator", icon: Calculator, to: "/calculator" },
  { label: "Goals", icon: Target, to: "/goals" },
  { label: "Protection", icon: ShieldCheck, to: "/protection" },
  { label: "Report", icon: ChartNoAxesCombined, to: "/finance" },
  { label: "AI Assistant", icon: Bot, soon: true },
  { label: "Guide", icon: BookOpen, to: "/guidance" },
];

export function Home() {
  const navigate = useNavigate();
  const { error, isRealData, username, transactions, totalIncome, totalExpense, totalSaving, byCategory, month, assets } = useFinanceData();
  const [extraTxs, setExtraTxs] = useState<Transaction[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"manual" | "ai">("manual");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const displayName = getDisplayName() || username;
  const currentYear = new Date().getFullYear();
  const plans = loadFinancialPlans();
  const allTxs = [...transactions, ...extraTxs];
  const parseRecentDate = (value: string, monthLabel?: string) => {
    const p = value.split("/").map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return 0;
    let [a, b, y] = p;
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const idx = months.indexOf((monthLabel || "").toLowerCase());
    let m = b, d = a;
    if (idx >= 0) { m = idx + 1; if (a === m && b !== m) d = b; else d = a; }
    else if (a > 12) { d = a; m = b; } else if (b > 12) { d = b; m = a; }
    return new Date(y, m - 1, d).getTime();
  };
  const recent = [...allTxs].sort((a, b) => parseRecentDate(b.date, b.month) - parseRecentDate(a.date, a.month)).slice(0, 5);
  const nextStep = totalExpense > totalIncome && totalIncome > 0
    ? "Pengeluaranmu bulan ini sudah lebih besar dari pemasukan. Cek kategori pengeluaran terbesar dan review budget."
    : assets.target > 0 && assets.totalAssets < assets.target
      ? `Target asetmu masih ${formatRupiah(Math.max(0, assets.target - assets.totalAssets))} lagi. Review Asset Tracker dan rencana investasimu.`
      : totalSaving > 0 ? "Kamu sudah punya saving bulan ini. Lanjutkan konsistensi dan cek apakah target finansialmu sudah punya angka yang jelas."
      : "Mulai dengan mencatat transaksi dan isi satu target finansial agar dashboard bisa memberi arah langkah berikutnya.";
  const cashFlowData = [{ name: "Pemasukan", value: totalIncome }, { name: "Pengeluaran", value: totalExpense }, { name: "Tabungan", value: totalSaving }];
  const spendingByCategory = byCategory("Expense").filter((c) => c.realization > 0).map((c) => ({ name: c.category, value: c.realization }));
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="mb-0 flex items-center justify-between">
        <span className="text-[17px] font-bold tracking-tight text-forest-700">wealthplanner.id</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate("/guidance")} aria-label="Guidance" title="Guidance" className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-100 bg-white text-forest-700 shadow-sm transition hover:border-forest-200">
            <BookOpen size={18} />
          </button>
          <ThemeToggle variant="compact" />
        </div>
      </div>
      <DataStatusBanner isRealData={isRealData} username={username} error={error} />
      <div className="flex flex-col gap-1">
        <p className="text-[12px] font-medium text-charcoal/45">{today}</p>
        <h1 className="text-[25px] sm:text-[28px] font-semibold tracking-tight text-forest-900">{greetingWord()}{displayName ? `, ${displayName}` : ""} <span aria-hidden>👋</span></h1>
        <p className="text-[13px] text-charcoal/55">Ringkasan keuanganmu untuk {month} {currentYear}.</p>
      </div>

      <Card className="overflow-hidden border-0 bg-[#1E4737] p-4 text-white shadow-md sm:p-5">
        <div className="flex flex-col items-center text-center py-1">
          <p className="text-[12px] font-medium text-white/80">Total Aset</p>
          <p className="mt-1.5 text-[clamp(25px,5.8vw,34px)] leading-tight font-semibold tracking-tight break-words">{formatRupiah(assets.totalAssets)}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-white/15 pt-3">
          <div className="rounded-xl bg-[#ADFF2F] p-2.5 text-[#173B25] sm:p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium"><TrendingUp size={14}/> Pemasukan</div>
            <p className="mt-1 break-words text-[clamp(12px,3.2vw,15px)] font-bold leading-tight">{formatRupiah(totalIncome)}</p>
            <p className="mt-1 text-[10px] opacity-75">Bulan ini</p>
          </div>
          <div className="rounded-xl bg-[#FFB6C1] p-2.5 text-[#572B36] sm:p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium"><TrendingDown size={14}/> Pengeluaran</div>
            <p className="mt-1 break-words text-[clamp(12px,3.2vw,15px)] font-bold leading-tight">{formatRupiah(totalExpense)}</p>
            <p className="mt-1 text-[10px] opacity-75">Bulan ini</p>
          </div>
        </div>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-forest-900">Menu Utama</h2>
          <span className="text-[11px] text-charcoal/40">Pilih fitur</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {menus.map(({ label, icon: Icon, to, soon }) => (
            <button key={label} type="button" disabled={Boolean(soon)} onClick={() => to && navigate(to)}
              className={`relative flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-rose-100/80 bg-white px-1.5 py-2.5 text-center shadow-sm transition sm:min-h-[98px] sm:gap-2 sm:px-2 sm:py-3 ${soon ? "cursor-not-allowed opacity-80" : "hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-forest-700 sm:h-10 sm:w-10">
                <Icon size={19} strokeWidth={1.9}/>
              </span>
              <span className="text-[11px] sm:text-[12px] font-semibold leading-tight text-forest-900">{label}</span>
              {soon && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-semibold text-rose-700">Coming soon</span>}
            </button>
          ))}
        </div>
      </section>

      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-forest-700">💡</div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wide text-forest-600">Langkah berikutnya</p><p className="mt-1 text-[13px] leading-5 text-charcoal/70">{nextStep}</p></div>
        </div>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-forest-900">Tujuan Keuangan</h2>
          <button onClick={() => navigate("/goals")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest-700">Lihat semua <ChevronRight size={14}/></button>
        </div>
        {plans.length ? <div className="grid gap-3 sm:grid-cols-2">{plans.slice(0, 2).map((plan) => (
          <button key={plan.id} onClick={() => navigate("/goals")} className="rounded-2xl border border-rose-100 bg-white p-4 text-left shadow-sm hover:border-rose-200">
            <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-forest-700"><Target size={18}/></span><span className="text-[13px] font-semibold text-forest-900">{plan.name}</span></div>
            <p className="mt-3 text-[11px] text-charcoal/50">Simulasi tersimpan · buka untuk detail</p>
          </button>
        ))}</div> : <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-5 text-center"><Target size={22} className="mx-auto text-forest-700"/><p className="mt-2 text-[13px] font-semibold text-forest-900">Belum ada tujuan keuangan</p><p className="mt-1 text-[12px] text-charcoal/55">Mulai dari kalkulator, lalu simpan hasil perencanaanmu.</p><button onClick={() => navigate("/calculator")} className="mt-3 rounded-xl bg-forest-700 px-4 py-2 text-[12px] font-semibold text-white">Buka Calculator</button></div>}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Cash Flow" subtitle="Pemasukan, pengeluaran, dan tabungan bulan ini">
          <ResponsiveContainer width="100%" height={210}><BarChart data={cashFlowData}><XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false}/><YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={45}/><Tooltip formatter={(v: number) => formatRupiah(v)}/><Bar dataKey="value" radius={[6, 6, 0, 0]}>{cashFlowData.map((_, i) => <Cell key={i} fill={["var(--chart-income)", "var(--chart-expense)", "var(--chart-saving)"][i]}/>)}</Bar></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Pengeluaran per Kategori" subtitle="Distribusi pengeluaran yang tercatat">
          {spendingByCategory.length ? <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={spendingByCategory} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2}>{spendingByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={(v: number) => formatRupiah(v)}/><Legend wrapperStyle={{ fontSize: 10 }}/></PieChart></ResponsiveContainer> : <p className="py-16 text-center text-[12px] text-charcoal/45">Belum ada data pengeluaran untuk ditampilkan.</p>}
        </ChartCard>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-forest-900">Transaksi Terbaru</h2><button onClick={() => navigate("/transactions")} className="inline-flex items-center gap-1 text-[12px] font-semibold text-forest-700">Semua transaksi <ChevronRight size={14}/></button></div>
        {recent.length ? <div className="flex flex-col divide-y divide-charcoal/8">{recent.map((t, i) => <div key={t.sheetRow ?? `${t.date}-${t.description}-${i}`} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><TransactionBadge type={t.type}/><div className="min-w-0"><p className="truncate text-[13px] font-medium">{t.description}</p><p className="text-[11px] text-charcoal/50">{t.category} · {t.date}</p></div></div><p className={`shrink-0 text-[13px] font-semibold ${t.type === "Expense" ? "text-rose-600" : "text-forest-700"}`}>{t.type === "Expense" ? "−" : "+"}{formatRupiah(t.amount)}</p></div>)}</div> : <p className="py-8 text-center text-[12px] text-charcoal/45">Belum ada transaksi. Tekan tombol + untuk mulai mencatat.</p>}
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rose-100 bg-white/95 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          <button onClick={() => navigate("/")} className="flex flex-col items-center gap-1 py-1 text-forest-700"><Wallet size={19}/><span className="text-[10px] font-medium">Home</span></button>
          <button onClick={() => navigate("/transactions")} className="flex flex-col items-center gap-1 py-1 text-charcoal/55"><ArrowLeftRight size={19}/><span className="text-[10px] font-medium">Transaksi</span></button>
          <button onClick={() => setQuickAddOpen(true)} aria-label="Tambah cepat" className="-mt-5 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-700 text-white shadow-lg ring-4 ring-white"><Plus size={24}/></button>
          <button onClick={() => navigate("/goals")} className="flex flex-col items-center gap-1 py-1 text-charcoal/55"><Target size={19}/><span className="text-[10px] font-medium">Goals</span></button>
          <button onClick={() => navigate("/settings")} className="flex flex-col items-center gap-1 py-1 text-charcoal/55"><BookOpen size={19}/><span className="text-[10px] font-medium">Profil</span></button>
        </div>
      </div>
      <div className="h-16 lg:hidden"/>

      {quickAddOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center" onClick={() => setQuickAddOpen(false)}>
        <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><h3 className="text-[16px] font-semibold text-forest-900">Tambah Data</h3><button onClick={() => setQuickAddOpen(false)} aria-label="Tutup" className="rounded-lg p-1 text-charcoal/50"><X size={18}/></button></div>
          <button onClick={() => { setModalMode("manual"); setModalOpen(true); setQuickAddOpen(false); }} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-rose-100 p-3 text-left hover:bg-rose-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-forest-700"><Plus size={19}/></span><span><span className="block text-[13px] font-semibold text-forest-900">Catat Transaksi</span><span className="block text-[11px] text-charcoal/50">Isi pemasukan, pengeluaran, atau tabungan</span></span></button>
          <button onClick={() => { setModalMode("ai"); setModalOpen(true); setQuickAddOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-rose-100 p-3 text-left hover:bg-rose-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-forest-700"><Sparkles size={19}/></span><span><span className="block text-[13px] font-semibold text-forest-900">Catat dengan AI</span><span className="block text-[11px] text-charcoal/50">Tulis transaksi atau unggah foto struk</span></span></button>
        </div>
      </div>}

      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={(t) => { if (!isRealData) setExtraTxs((prev) => [...prev, t]); }} initialMode={modalMode}/>
    </div>
  );
}
