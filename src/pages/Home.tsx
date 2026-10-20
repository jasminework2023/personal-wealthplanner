import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, CircleDollarSign, TrendingUp, TrendingDown, PiggyBank, Plus, Sparkles,
  ArrowLeftRight, Landmark, Calculator, Target, ShieldCheck,
  ChartNoAxesCombined, Bot, BookOpen, ChevronRight, X, Eye, EyeOff, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, ChartCard } from "../components/Card";
import { TransactionBadge } from "../components/TransactionBadge";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { formatRupiah, formatCompact, getAppLanguage } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { getDisplayName, greetingWord } from "../lib/settings";
import type { Transaction } from "../data/types";
import { loadFinancialPlans } from "../lib/financialPlans";

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];
const menus = [
  { key: "transaction", label: "Transaction", icon: ArrowLeftRight, to: "/transaction", tone: "bg-[#F59BB8] text-[#123524]" },
  { key: "budget", label: "Budget", icon: Wallet, to: "/budgeting", tone: "bg-[#CFEFDD] text-[#0B6B47]" },
  { key: "report", label: "Report", icon: Landmark, to: "/finance", tone: "bg-[#FBD3E0] text-[#B83A62]" },
  { key: "calculator", label: "Calculator", icon: Calculator, to: "/calculator", tone: "bg-[#E4D5FA] text-[#6F46B0]" },
  { key: "goals", label: "Goals", icon: Target, to: "/goals", tone: "bg-[#FFD9BF] text-[#B4561A]" },
  { key: "protection", label: "Protection", icon: ShieldCheck, to: "/protection", tone: "bg-[#CFEFDD] text-[#0B6B47]" },
  { key: "community", label: "Community", icon: ChartNoAxesCombined, soon: true, tone: "bg-[#E4D5FA] text-[#6F46B0]" },
  { key: "ai", label: "AI Assistant", icon: Bot, soon: true, tone: "bg-[#FBD3E0] text-[#B83A62]" },
  { key: "guide", label: "Guide", icon: BookOpen, to: "/guidance", tone: "bg-[#DCEBFF] text-[#2F6BB5]" },
];

export function Home() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(getAppLanguage());
  useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const id = language === "id";
  const { error, isRealData, username, transactions, totalIncome, totalExpense, totalSaving, byCategory, month, assets } = useFinanceData();
  const [extraTxs, setExtraTxs] = useState<Transaction[]>([]);
  const [assetsVisible, setAssetsVisible] = useState(true);
  const [assetTrend, setAssetTrend] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"manual" | "ai">("manual");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const displayName = getDisplayName() || username;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const monthInIndonesian = currentDate.toLocaleDateString(id ? "id-ID" : "en-US", { month: "long" });
  const monthLabel = monthInIndonesian.charAt(0).toUpperCase() + monthInIndonesian.slice(1);
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
  const nextStep = id ? (totalExpense > totalIncome && totalIncome > 0
    ? "Pengeluaranmu bulan ini sudah lebih besar dari pemasukan. Cek kategori pengeluaran terbesar dan tinjau kembali anggaran."
    : assets.target > 0 && assets.totalAssets < assets.target
      ? `Target asetmu masih ${formatRupiah(Math.max(0, assets.target - assets.totalAssets))} lagi. Tinjau Asset Tracker dan rencana investasimu.`
      : totalSaving > 0 ? "Kamu sudah menabung bulan ini. Pertahankan konsistensi dan pastikan target finansialmu punya angka yang jelas."
      : "Mulai dengan mencatat transaksi dan menetapkan satu target finansial agar dashboard bisa menyarankan langkah berikutnya.") : (totalExpense > totalIncome && totalIncome > 0
    ? "Your expenses this month are higher than your income. Review your largest expense categories and revisit your budget."
    : assets.target > 0 && assets.totalAssets < assets.target
      ? `You are ${formatRupiah(Math.max(0, assets.target - assets.totalAssets))} away from your asset goal. Review your Asset Tracker and investment plan.`
      : totalSaving > 0 ? "You have saved money this month. Stay consistent and make sure your financial goals have clear targets."
      : "Start by recording transactions and setting one financial goal to get actionable guidance from your dashboard.");
  const cashFlowData = [{ name: id ? "Pemasukan" : "Income", value: totalIncome }, { name: id ? "Pengeluaran" : "Expense", value: totalExpense }, { name: id ? "Tabungan" : "Saving", value: totalSaving }];
  const spendingByCategory = byCategory("Expense").filter((c) => c.realization > 0).map((c) => ({ name: c.category, value: c.realization }));
  const today = new Date().toLocaleDateString(id ? "id-ID" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  useEffect(() => {
    const now = new Date();
    const key = (date: Date) => "wealthplanner_asset_snapshot_" + date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    const prefix = isRealData ? (localStorage.getItem("wealthplanner_token") || "account") : "demo";
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    try {
      const previousAssets = Number(localStorage.getItem(prefix + "_" + key(previousDate)));
      setAssetTrend(Number.isFinite(previousAssets) && previousAssets > 0 ? ((assets.totalAssets - previousAssets) / previousAssets) * 100 : null);
      localStorage.setItem(prefix + "_" + key(now), String(assets.totalAssets));
    } catch { setAssetTrend(null); }
  }, [assets.totalAssets, isRealData]);

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-medium text-charcoal/50">{today}</p>{isRealData && !error && <span title="Data tersambung" aria-label="Data tersambung" className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6EE7A8]/20 text-forest-700"><span className="text-[12px] font-bold">✓</span></span>}</div>
        <h1 className="text-[21px] sm:text-[24px] font-bold leading-[1.1] tracking-[-0.03em] text-forest-900">{(id ? greetingWord() : (new Date().getHours() < 11 ? "Good Morning" : new Date().getHours() < 15 ? "Good Afternoon" : new Date().getHours() < 18 ? "Good Afternoon" : "Good Evening"))}{displayName ? `, ${displayName}` : ""} <span aria-hidden>👋</span></h1>
        <p className="text-[13.5px] text-charcoal/60">{id ? `Ringkasan keuanganmu untuk ${monthLabel} ${currentYear}.` : `Your Financial Summary for ${monthLabel} ${currentYear}.`}</p>
      </div>

      <Card className="home-asset-summary hero-forest w-full overflow-hidden border-0 !rounded-[22px] bg-[#123524] p-4 text-white shadow-float" style={{ backgroundColor: "#123524", color: "#FFFFFF" }}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-[11.5px] font-normal text-[#A9C9B8]"><CircleDollarSign size={17} strokeWidth={1.8}/>{id ? "Total Aset" : "Total Assets"}</p>
          <button type="button" onClick={() => setAssetsVisible((visible) => !visible)} aria-label={assetsVisible ? "Sembunyikan total aset" : "Tampilkan total aset"} title={assetsVisible ? "Sembunyikan total aset" : "Tampilkan total aset"} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[#A9C9B8]">
            {assetsVisible ? <Eye size={18} strokeWidth={2}/> : <EyeOff size={18} strokeWidth={2}/>}
          </button>
        </div>
        <div className="mt-2 flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
          <span className="shrink-0 text-[14px] font-normal text-[#A9C9B8]">Rp</span>
          <span className="min-w-0 text-[clamp(22px,7.2vw,30px)] font-medium leading-tight tracking-[-0.5px] tabular-nums">
            {assetsVisible ? new Intl.NumberFormat(id ? "id-ID" : "en-US", { maximumFractionDigits: 0 }).format(assets.totalAssets) : "••••••••"}
          </span>
        </div>
        {assetTrend !== null && Number.isFinite(assetTrend) && (
          <div className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${assetTrend >= 0 ? "bg-[#6EE7A8]/[0.16] text-[#6EE7A8]" : "bg-[#FFB4A2]/[0.16] text-[#FFB4A2]"}`}>
            {assetTrend >= 0 ? <TrendingUp size={15} strokeWidth={2}/> : <TrendingDown size={15} strokeWidth={2}/>}
            <span>{assetTrend >= 0 ? "+" : ""}{assetTrend.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% bulan ini</span>
          </div>
        )}
        {assets.target > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[13px] font-normal text-[#A9C9B8]">{id ? "% dari target" : "% of target"}</span>
              <span className="shrink-0 text-[14px] font-medium text-white tabular-nums">
                {Math.round((assets.totalAssets / assets.target) * 100)}%
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.16]"
              role="progressbar"
              aria-label="Progress target aset"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.max(0, Math.round((assets.totalAssets / assets.target) * 100)))}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6EE7A8] to-[#F59BB8] transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, (assets.totalAssets / assets.target) * 100))}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="flex min-w-0 flex-col self-start rounded-2xl bg-white/[0.10] p-3.5 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#6EE7A8]/[0.18] text-[#6EE7A8]"><ArrowDownLeft size={17} strokeWidth={2}/></span>
              <span className="truncate text-[11.5px] font-normal text-[#A9C9B8]">{id ? "Pemasukan" : "Income"}</span>
            </div>
            <p className="mt-1.5 break-words text-[clamp(12px,3.6vw,14px)] font-medium leading-tight tracking-[-0.2px] tabular-nums">{formatRupiah(totalIncome)}</p>
          </div>
          <div className="flex min-w-0 flex-col self-start rounded-2xl bg-white/[0.10] p-3.5 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#FFB4A2]/[0.18] text-[#FFB4A2]"><ArrowUpRight size={17} strokeWidth={2}/></span>
              <span className="truncate text-[11.5px] font-normal text-[#A9C9B8]">{id ? "Pengeluaran" : "Expense"}</span>
            </div>
            <p className="mt-1.5 break-words text-[clamp(12px,3.6vw,14px)] font-medium leading-tight tracking-[-0.2px] tabular-nums">{formatRupiah(totalExpense)}</p>
          </div>
        </div>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{id ? "Menu Utama" : "Main Menu"}</h2>
          <span className="text-[11.5px] text-charcoal/45">Pilih fitur</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {menus.map(({ label, icon: Icon, to, soon, tone }) => (
            <button key={label} type="button" disabled={Boolean(soon)} onClick={() => to && navigate(to)}
              className={`relative flex min-h-[104px] flex-col items-center justify-center gap-2.5 rounded-[20px] border border-forest-100/50 bg-white px-1.5 py-3 text-center shadow-card transition sm:min-h-[112px] ${soon ? "cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-float"}`}>
              <span className={`flex h-11 w-11 items-center justify-center rounded-[15px] ${tone} ${soon ? "opacity-60" : ""}`}>
                <Icon size={21} strokeWidth={2.1}/>
              </span>
              <span className={`text-[12px] font-semibold leading-tight text-forest-900 ${soon ? "opacity-70" : ""}`}>{label}</span>
              {soon && <span className="absolute right-2 top-2 rounded-full bg-[#F59BB8] px-1.5 py-0.5 text-[8.5px] font-bold leading-none text-[#123524]">Soon</span>}
            </button>
          ))}
        </div>
      </section>

      <div className="rounded-[22px] border border-rose-100 bg-rose-50 p-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F59BB8] text-[20px]">💡</div>
          <div className="min-w-0"><p className="text-[14px] font-bold tracking-[-0.01em] text-forest-900">{id ? "Langkah Berikutnya" : "Next Step"}</p><p className="mt-1 text-[13px] leading-[1.55] text-charcoal/70">{nextStep}</p></div>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">{id ? "Tujuan Keuangan" : "Financial Goals"}</h2>
          <button onClick={() => navigate("/goals")} className="inline-flex items-center gap-0.5 rounded-full bg-forest-50 px-3 py-1.5 text-[12px] font-semibold text-forest-700">Lihat semua <ChevronRight size={14}/></button>
        </div>
        {plans.length ? <div className="grid gap-3 sm:grid-cols-2">{plans.slice(0, 2).map((plan) => {
          let goalSettings: { names?: Record<string, string>; allocations?: Record<string, Record<string, number>> } = {};
          try { goalSettings = JSON.parse(localStorage.getItem("wealthplanner_goal_asset_allocations_v1") || "{}"); } catch { goalSettings = {}; }
          const target = plan.targetAmount ?? plan.obligationAmount ?? plan.homePrice ?? plan.loanAmount ?? 0;
          const allocated = Object.values(goalSettings.allocations?.[plan.id] || {}).reduce((sum, value) => sum + Number(value || 0), 0);
          const progress = target > 0 ? Math.min(100, Math.max(0, allocated / target * 100)) : 0;
          const goalName = goalSettings.names?.[plan.id] || plan.name;
          return <button key={plan.id} onClick={() => navigate("/goals")} className="rounded-[22px] border border-forest-100/50 bg-white p-4 text-left shadow-card transition hover:shadow-float">
            <div className="flex items-center gap-3">
              <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full" style={{ background: "conic-gradient(#1F6B4A " + progress + "%, #FCE7EF " + progress + "%)" }}>
                <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white"><span className="text-[15px] font-bold tabular-nums text-forest-800">{Math.round(progress)}%</span></div>
              </div>
              <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-forest-900">{goalName}</p><p className="mt-1 text-[11px] text-charcoal/55">{id ? "Terkumpul" : "Collected"}</p><p className="text-[12px] font-semibold text-forest-800">{formatRupiah(allocated)} <span className="font-normal text-charcoal/45">{id ? "dari" : "of"} {formatRupiah(target)}</span></p></div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-rose-50"><div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: progress + "%" }}/></div>
          </button>;
        })}</div> : <div className="rounded-[22px] border border-dashed border-rose-200 bg-rose-50/50 px-4 py-6 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBD3E0] text-[#B83A62]"><Target size={21}/></span><p className="mt-2 text-[13px] font-semibold text-forest-900">Belum ada tujuan keuangan</p><p className="mt-1 text-[12px] text-charcoal/55">Mulai dari kalkulator, lalu simpan hasil perencanaanmu.</p><button onClick={() => navigate("/calculator")} className="mt-4 rounded-full bg-[#123524] px-5 py-2.5 text-[12.5px] font-semibold text-white shadow-sm">Buka Calculator</button></div>}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={id ? "Arus Kas" : "Cashflow"} subtitle={id ? "Pemasukan, pengeluaran, dan tabungan bulan ini" : "This Month’s Income, Expenses, and Savings"}>
          <ResponsiveContainer width="100%" height={210}><BarChart data={cashFlowData}><XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false}/><YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={45}/><Tooltip formatter={(v: number) => formatRupiah(v)}/><Bar dataKey="value" radius={[6, 6, 0, 0]}>{cashFlowData.map((_, i) => <Cell key={i} fill={["var(--chart-income)", "var(--chart-expense)", "var(--chart-saving)"][i]}/>)}</Bar></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title={id ? "Pengeluaran per Kategori" : "Expenses by Category"} subtitle={id ? "Distribusi pengeluaran yang tercatat" : "Breakdown of recorded expenses"}>
          {spendingByCategory.length ? <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={spendingByCategory} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2}>{spendingByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={(v: number) => formatRupiah(v)}/><Legend wrapperStyle={{ fontSize: 10 }}/></PieChart></ResponsiveContainer> : <p className="py-16 text-center text-[12px] text-charcoal/45">{id ? "Belum ada data pengeluaran untuk ditampilkan." : "No expense data to display yet."}</p>}
        </ChartCard>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between"><h2 className="section-title">{id ? "Transaksi Terbaru" : "Recent Transactions"}</h2><button onClick={() => navigate("/transaction")} className="inline-flex items-center gap-0.5 rounded-full bg-forest-50 px-3 py-1.5 text-[12px] font-semibold text-forest-700">{id ? "Semua transaksi" : "All transactions"} <ChevronRight size={14}/></button></div>
        {recent.length ? <div className="flex flex-col divide-y divide-charcoal/8">{recent.map((t, i) => <div key={t.sheetRow ?? `${t.date}-${t.description}-${i}`} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.type === "Income" ? "bg-[#DFF3E7] text-[#0B6B47]" : t.type === "Expense" ? "bg-[#FDE3EA] text-[#C23A5B]" : "bg-[#E8DDFA] text-[#6F46B0]"}`}>{t.type === "Income" ? <ArrowDownLeft size={19}/> : t.type === "Expense" ? <ArrowUpRight size={19}/> : <PiggyBank size={19}/>}</span><div className="min-w-0"><p className="truncate text-[13.5px] font-semibold text-forest-900">{t.description}</p><p className="mt-0.5 truncate text-[11.5px] text-charcoal/50">{t.category} · {t.date}</p></div></div><p className={`num shrink-0 text-[13.5px] font-semibold ${t.type === "Expense" ? "text-rose-600" : "text-forest-700"}`}>{t.type === "Expense" ? "−" : "+"}{formatRupiah(t.amount)}</p></div>)}</div> : <p className="py-8 text-center text-[12px] text-charcoal/45">{id ? "Belum ada transaksi. Tekan tombol + untuk mulai mencatat." : "No transactions yet. Press + to start recording."}</p>}
      </Card>

      {quickAddOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center" onClick={() => setQuickAddOpen(false)}>
        <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><h3 className="text-[16px] font-semibold text-forest-900">Tambah Data</h3><button onClick={() => setQuickAddOpen(false)} aria-label="Tutup" className="rounded-lg p-1 text-charcoal/50"><X size={18}/></button></div>
          <button onClick={() => { setModalMode("manual"); setModalOpen(true); setQuickAddOpen(false); }} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-rose-100 p-3 text-left hover:bg-rose-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-forest-700"><Plus size={19}/></span><span><span className="block text-[13px] font-semibold text-forest-900">{id ? "Catat Transaksi" : "Record Transaction"}</span><span className="block text-[11px] text-charcoal/50">{id ? "Isi pemasukan, pengeluaran, atau tabungan" : "Enter income, expenses, or savings"}</span></span></button>
          <button onClick={() => { setModalMode("ai"); setModalOpen(true); setQuickAddOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-rose-100 p-3 text-left hover:bg-rose-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-forest-700"><Sparkles size={19}/></span><span><span className="block text-[13px] font-semibold text-forest-900">{id ? "Catat dengan AI" : "Track with AI"}</span><span className="block text-[11px] text-charcoal/50">Tulis transaksi atau unggah foto struk</span></span></button>
        </div>
      </div>}

      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={(t) => { if (!isRealData) setExtraTxs((prev) => [...prev, t]); }} initialMode={modalMode}/>
    </div>
  );
}
