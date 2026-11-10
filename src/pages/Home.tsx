import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, CircleDollarSign, TrendingUp, TrendingDown, PiggyBank, Plus, Sparkles,
  ArrowLeftRight, Landmark, Calculator, Target, ShieldCheck,
  ChartNoAxesCombined, Bot, BookOpen, ChevronRight, X, Eye, EyeOff, ArrowDownLeft, ArrowUpRight,
  PieChart,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from "recharts";
import { Card, ChartCard } from "../components/Card";
import { TransactionBadge } from "../components/TransactionBadge";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { formatRupiah, formatCompact, getAppLanguage } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { getDisplayName, greetingWord } from "../lib/settings";
import type { Transaction } from "../data/types";
import { loadFinancialPlans } from "../lib/financialPlans";
import { useWallets } from "../lib/useWallets";

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];
const menus = [
  { key: "transaction", label: "Transaction", icon: ArrowLeftRight, to: "/transaction", tone: "bg-[#DDF7E8] text-[#0B6B47]" },
  { key: "wallets", label: "Wallet", icon: Wallet, to: "/wallets", tone: "bg-[#CFEFDD] text-[#0B6B47]" },
  { key: "budget", label: "Budget", icon: PieChart, to: "/budgeting", tone: "bg-[#CFEFDD] text-[#0B6B47]" },
  { key: "asset", label: "Asset", icon: TrendingUp, to: "/assets", tone: "bg-[#CFEFDD] text-[#0B6B47]" },
  { key: "calculator", label: "Calculator", icon: Calculator, to: "/calculator", tone: "bg-[#DDF7E8] text-[#0B6B47]" },
  { key: "goals", label: "Goals", icon: Target, to: "/goals", tone: "bg-[#DDF7E8] text-[#0B6B47]" },
  { key: "protection", label: "Protection", icon: ShieldCheck, to: "/protection", tone: "bg-[#CFEFDD] text-[#0B6B47]" },
  { key: "report", label: "Report", icon: Landmark, to: "/finance", tone: "bg-[#DDF7E8] text-[#0B6B47]" },
  { key: "community", label: "Community", icon: ChartNoAxesCombined, soon: true, tone: "bg-[#DDF7E8] text-[#0B6B47]" },
  { key: "ai", label: "AI Assistant", icon: Bot, to: "/ai-assistant", tone: "bg-[#DDF7E8] text-[#0B6B47]" },
  { key: "guide", label: "Guide", icon: BookOpen, to: "/guidance", tone: "bg-[#DDF7E8] text-[#0B6B47]" },
];

export function Home() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(getAppLanguage());
  useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const id = language === "id";
  const { error, isRealData, loading, username, transactions, totalIncome, totalExpense, totalSaving, byCategory, month, assets } = useFinanceData();
  const { wallets } = useWallets();
  // Keep Home and Report > Asset Tracker on the exact same asset calculation.
  // Wallet is the source of truth for liquid assets; investment assets come from the Asset Tracker.
  const liquidAssetsFromWallets = wallets.map((wallet) => ({ name: wallet.name, value: wallet.balance }));
  const integratedLiquidTotal = liquidAssetsFromWallets.reduce((sum, item) => sum + item.value, 0);
  const integratedInvestmentTotal = assets.investmentAssets.reduce((sum, item) => sum + item.value, 0);
  const integratedTotalAssets = integratedLiquidTotal + integratedInvestmentTotal;
  const [extraTxs, setExtraTxs] = useState<Transaction[]>([]);
  const [assetsVisible, setAssetsVisible] = useState(true);
  const [summaryTab, setSummaryTab] = useState<"asset" | "budget">("asset");
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
  const parseRecentDate = (value: string) => {
    const raw = String(value || "").trim();
    let day = 0, month = 0, year = 0;
    const yearFirst = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|T|\s)/);
    if (yearFirst) {
      year = Number(yearFirst[1]); month = Number(yearFirst[2]); day = Number(yearFirst[3]);
    } else {
      const parts = raw.split(/[/. -]/).filter(Boolean).map(Number);
      if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return 0;
      [day, month, year] = parts;
      // Source data is DD/MM/YYYY. Only flip when the second part proves MM/DD/YYYY.
      if (day <= 12 && month > 12) [day, month] = [month, day];
    }
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const parsed = new Date(year, month - 1, day);
    if (month < 1 || month > 12 || day < 1 || day > 31 || parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return 0;
    return parsed.getTime();
  };
  const recent = [...allTxs].sort((a, b) => {
    const difference = parseRecentDate(b.date) - parseRecentDate(a.date);
    return difference || Number(b.sheetRow || 0) - Number(a.sheetRow || 0);
  }).slice(0, 5);
  const nextStep = id ? (totalExpense > totalIncome && totalIncome > 0
    ? "Pengeluaranmu bulan ini sudah lebih besar dari pemasukan. Cek kategori pengeluaran terbesar dan tinjau kembali anggaran."
    : assets.target > 0 && integratedTotalAssets < assets.target
      ? `Target asetmu masih ${formatRupiah(Math.max(0, assets.target - integratedTotalAssets))} lagi. Tinjau Asset Tracker dan rencana investasimu.`
      : totalSaving > 0 ? "Kamu sudah menabung bulan ini. Pertahankan konsistensi dan pastikan target finansialmu punya angka yang jelas."
      : "Mulai dengan mencatat transaksi dan menetapkan satu target finansial agar dashboard bisa menyarankan langkah berikutnya.") : (totalExpense > totalIncome && totalIncome > 0
    ? "Your expenses this month are higher than your income. Review your largest expense categories and revisit your budget."
    : assets.target > 0 && integratedTotalAssets < assets.target
      ? `You are ${formatRupiah(Math.max(0, assets.target - integratedTotalAssets))} away from your asset goal. Review your Asset Tracker and investment plan.`
      : totalSaving > 0 ? "You have saved money this month. Stay consistent and make sure your financial goals have clear targets."
      : "Start by recording transactions and setting one financial goal to get actionable guidance from your dashboard.");
  const cashFlowData = [{ name: id ? "Pemasukan" : "Income", value: totalIncome }, { name: id ? "Pengeluaran" : "Expense", value: totalExpense }, { name: id ? "Tabungan" : "Saving", value: totalSaving }];
  const spendingByCategory = byCategory("Expense").filter((c) => c.realization > 0).map((c) => ({ name: c.category, value: c.realization }));
  const incomeBudget = byCategory("Income").reduce((sum, item) => sum + Number(item.allocation || 0), 0);
  const expenseBudget = byCategory("Expense").reduce((sum, item) => sum + Number(item.allocation || 0), 0);
  const savingBudget = byCategory("Saving").reduce((sum, item) => sum + Number(item.allocation || 0), 0);
  const hasBudget = incomeBudget > 0 || expenseBudget > 0 || savingBudget > 0;
  const remainingBudget = hasBudget ? incomeBudget - expenseBudget - savingBudget : 0;

  const renderMoney = (value: number, visible: boolean, amountClassName: string, fontSize?: number) => {
    if (!visible) return <span className={amountClassName} style={fontSize ? { fontSize: `${fontSize}px` } : undefined}>Rp ••••••</span>;
    const formatted = formatRupiah(value);
    const amount = formatted.startsWith("Rp ") ? formatted.slice(3) : formatted.replace(/^Rp\\s*/, "");
    return (
      <span className={`inline-flex min-w-0 max-w-full items-baseline ${amountClassName}`} style={fontSize ? { fontSize: `${fontSize}px` } : undefined}>
        <span className="mr-[0.2em] text-[0.6em] font-medium opacity-60">Rp</span>
        <span className="min-w-0 break-words">{amount}</span>
      </span>
    );
  };
  const today = new Date().toLocaleDateString(id ? "id-ID" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  useEffect(() => {
    const now = new Date();
    const key = (date: Date) => "wealthplanner_asset_snapshot_" + date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    const prefix = isRealData ? (localStorage.getItem("wealthplanner_token") || "account") : "demo";
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    try {
      const previousAssets = Number(localStorage.getItem(prefix + "_" + key(previousDate)));
      setAssetTrend(Number.isFinite(previousAssets) && previousAssets > 0 ? ((integratedTotalAssets - previousAssets) / previousAssets) * 100 : null);
      localStorage.setItem(prefix + "_" + key(now), String(integratedTotalAssets));
    } catch { setAssetTrend(null); }
  }, [integratedTotalAssets, isRealData]);

  return (
    <div className="flex flex-col gap-3 pb-4" data-tour-loading={loading ? "true" : "false"}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-medium text-charcoal/50">{today}</p>{isRealData && !error && <span title="Data tersambung" aria-label="Data tersambung" className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6EE7A8]/20 text-forest-700"><span className="text-[12px] font-bold">✓</span></span>}</div>
        <h1 className="font-display font-normal text-[26px] leading-[1.1] tracking-[-0.02em] text-forest-900">{(id ? greetingWord() : (new Date().getHours() < 11 ? "Good Morning" : new Date().getHours() < 15 ? "Good Afternoon" : new Date().getHours() < 18 ? "Good Afternoon" : "Good Evening"))}{displayName ? `, ${displayName}` : ""} <span aria-hidden>👋</span></h1>
        <p className="text-[13.5px] text-charcoal/60">{id ? `Ringkasan keuanganmu untuk ${monthLabel} ${currentYear}.` : `Your Financial Summary for ${monthLabel} ${currentYear}.`}</p>
      </div>

      <div className="hidden md:grid md:grid-cols-2 gap-3 items-stretch">
        <div role="button" tabIndex={0}
          onClick={() => navigate("/finance")}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/finance"); } }}
          data-tour="home-assets-desktop" className="home-asset-summary h-full min-w-0 cursor-pointer overflow-hidden rounded-[20px] border-0 p-4 text-[#062D20] shadow-[0_18px_48px_rgba(0,184,110,0.20)]"
          style={{ background: "linear-gradient(118deg, #20F0A0 0%, #00C77B 55%, #009B61 100%)" }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[-0.02em] text-[#075B40]/85">Asset Tracker</p>
            <button type="button"
              onClick={(event) => { event.stopPropagation(); setAssetsVisible((visible) => !visible); }}
              aria-label={assetsVisible ? "Sembunyikan saldo" : "Tampilkan saldo"}
              data-tour="home-eye-desktop" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#064A34] transition hover:bg-[#006B48]/15">
              {assetsVisible ? <Eye size={19} strokeWidth={2}/> : <EyeOff size={19} strokeWidth={2}/>}
            </button>
          </div>
          <p className="mt-1.5 text-[12px] font-medium tracking-[-0.02em] text-[#075B40]/80">{id ? "Total Aset" : "Total Assets"}</p>
          <div className="mt-0.5 min-w-0 break-words text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums text-black" style={{ fontSize: "34px" }}>
            {renderMoney(integratedTotalAssets, assetsVisible, "text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums text-black", 34)}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#008D59]/35 px-3 py-1.5 text-[11px] font-medium tracking-[-0.02em] text-[#042F21]">
              <TrendingUp size={14} strokeWidth={2.5}/>{Math.round(assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0)}% {id ? "dari target" : "of goal"}
            </span>
            <span className="min-w-0 truncate text-right text-[11px] font-medium tracking-[-0.02em] text-[#075B40]/90">Target {assetsVisible ? renderMoney(assets.target, true, "text-[11px] font-medium tracking-[-0.02em]", 11) : "Rp ••••••"}</span>
          </div>
          <div className="mt-3 h-[30px] w-full" aria-label={id ? "Grafik tren aset" : "Asset trend chart"} role="img">
            <svg viewBox="0 0 320 62" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <polyline points="8,48 46,41 84,45 122,27 160,33 198,14 246,18 312,0" fill="none" stroke="#03140C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
            </svg>
          </div>
        </div>

        <div role="button" tabIndex={0}
          onClick={() => navigate("/budgeting")}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/budgeting"); } }}
          data-tour="home-budget-desktop" className="hero-forest h-full min-w-0 cursor-pointer overflow-hidden rounded-[20px] p-4 text-white transition hover:-translate-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-[-0.02em] text-white/70">Budget Tracker</p>
          <p className="mt-1.5 text-[12px] font-medium tracking-[-0.02em] text-white/70">{id ? "Sisa anggaran" : "Remaining budget"}</p>
          <div className="mt-0.5 min-w-0 break-words text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums" style={{ fontSize: "34px" }}>
            {hasBudget ? renderMoney(remainingBudget, assetsVisible, "text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums", 34) : (assetsVisible ? renderMoney(0, true, "text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums", 34) : "Rp ••••••")}
          </div>
          {!hasBudget && <p className="mt-1 text-[11px] text-white/55">{id ? "Atur anggaran" : "Set a budget"}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-[12px] bg-white/10 px-3 py-2">
              <span className="text-[11px] font-medium text-white/60">{id ? "Penghasilan" : "Income"}</span>
              <p className="mt-0.5 min-w-0 truncate text-[16px] font-medium tracking-[-0.02em] tabular-nums">{assetsVisible ? formatRupiah(totalIncome) : "Rp ••••••"}</p>
            </div>
            <div className="min-w-0 rounded-[12px] bg-white/10 px-3 py-2">
              <span className="text-[11px] font-medium text-white/60">{id ? "Pengeluaran" : "Expense"}</span>
              <p className="mt-0.5 min-w-0 truncate text-[16px] font-medium tracking-[-0.02em] tabular-nums">{assetsVisible ? formatRupiah(totalExpense) : "Rp ••••••"}</p>
            </div>
          </div>
        </div>
      </div>

      <div data-tour="home-assets-mobile" className="md:hidden rounded-[20px] p-3.5 text-[#03140C]"
        style={{ background: "linear-gradient(118deg, #20F0A0 0%, #00C77B 55%, #009B61 100%)" }}>
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 rounded-full bg-[rgba(3,20,12,.12)] p-[3px]">
            <button type="button" onClick={() => setSummaryTab("asset")}
              className={`h-8 min-w-0 flex-1 rounded-full px-2 text-[12px] font-medium transition ${summaryTab === "asset" ? "bg-[#03140C] text-white" : "text-[#03140C]"}`}>
              Asset
            </button>
            <button type="button" onClick={() => setSummaryTab("budget")}
              className={`h-8 min-w-0 flex-1 rounded-full px-2 text-[12px] font-medium transition ${summaryTab === "budget" ? "bg-[#03140C] text-white" : "text-[#03140C]"}`}>
              Budget
            </button>
          </div>
          <button type="button"
            onClick={() => setAssetsVisible((visible) => !visible)}
            aria-label={assetsVisible ? "Sembunyikan saldo" : "Tampilkan saldo"}
            data-tour="home-eye-mobile" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#03140C] transition hover:bg-black/10">
            {assetsVisible ? <Eye size={18} strokeWidth={2}/> : <EyeOff size={18} strokeWidth={2}/>}
          </button>
        </div>

        {summaryTab === "asset" ? (
          <div role="button" tabIndex={0}
            onClick={() => navigate("/finance")}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/finance"); } }}
            className="mt-2 min-h-[150px] min-w-0 cursor-pointer px-0.5 pb-0.5 pt-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#03140C]/70">Asset Tracker</p>
            <p className="mt-1.5 text-[12px] font-medium text-[#03140C]/75">{id ? "Total Aset" : "Total Assets"}</p>
            <div className="mt-0.5 min-w-0 max-w-full break-words text-[30px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums" style={{ fontSize: "30px" }}>
              {renderMoney(integratedTotalAssets, assetsVisible, "text-[30px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums", 30)}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgba(3,20,12,.14)] px-2.5 py-1 text-[11px] font-medium tracking-[-0.02em] text-[#03140C]">
                <TrendingUp size={13} strokeWidth={2.5}/>{Math.round(assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0)}% {id ? "dari target" : "of goal"}
              </span>
              <span className="min-w-0 truncate text-right text-[11px] font-medium text-[#03140C]/75">Target {assetsVisible ? renderMoney(assets.target, true, "text-[11px] font-medium", 11) : "Rp ••••••"}</span>
            </div>
            <div className="mt-2 h-[30px] w-full" aria-label={id ? "Grafik tren aset" : "Asset trend chart"} role="img">
              <svg viewBox="0 0 320 62" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                <polyline points="8,48 46,41 84,45 122,27 160,33 198,14 246,18 312,0" fill="none" stroke="#03140C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
              </svg>
            </div>
          </div>
        ) : (
          <div role="button" tabIndex={0}
            onClick={() => navigate("/budgeting")}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/budgeting"); } }}
            className="mt-2 min-h-[150px] min-w-0 cursor-pointer px-0.5 pb-0.5 pt-1" data-tour="home-budget-mobile">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#03140C]/70">Budget Tracker</p>
            <p className="mt-1.5 text-[12px] font-medium text-[#03140C]/75">{id ? "Sisa anggaran" : "Remaining budget"}</p>
            <div className="mt-0.5 min-w-0 max-w-full break-words text-[30px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums" style={{ fontSize: "30px" }}>
              {hasBudget ? renderMoney(remainingBudget, assetsVisible, "text-[30px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums", 30) : (assetsVisible ? renderMoney(0, true, "text-[30px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums", 30) : "Rp ••••••")}
            </div>
            {!hasBudget && <button type="button" onClick={(event) => { event.stopPropagation(); navigate("/budgeting"); }} className="mt-1 text-[11px] text-[#03140C]/55 underline underline-offset-2">Atur anggaran</button>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="min-w-0 rounded-[12px] bg-[rgba(3,20,12,.12)] px-2.5 py-2">
                <span className="text-[11px] font-medium text-[#03140C]/70">{id ? "Penghasilan" : "Income"}</span>
                <p className="mt-0.5 min-w-0 truncate text-[15px] font-medium tracking-[-0.02em] tabular-nums">{assetsVisible ? formatRupiah(totalIncome) : "Rp ••••••"}</p>
              </div>
              <div className="min-w-0 rounded-[12px] bg-[rgba(3,20,12,.12)] px-2.5 py-2">
                <span className="text-[11px] font-medium text-[#03140C]/70">{id ? "Pengeluaran" : "Expense"}</span>
                <p className="mt-0.5 min-w-0 truncate text-[15px] font-medium tracking-[-0.02em] tabular-nums">{assetsVisible ? formatRupiah(totalExpense) : "Rp ••••••"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <section data-tour="main-menu">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title">{id ? "Menu Utama" : "Main Menu"}</h2>
          <span className="text-[11px] text-charcoal/45">Pilih fitur</span>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {menus.map(({ label, icon: Icon, to, soon, tone }) => (
            <button key={label} type="button" disabled={Boolean(soon)} onClick={() => to && navigate(to)}
              className={`relative flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-forest-100/50 bg-white px-1 py-2 text-center shadow-card transition sm:min-h-[78px] ${soon ? "cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-float"}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-[12px] ${tone} ${soon ? "opacity-60" : ""}`}>
                <Icon size={19} strokeWidth={2.1}/>
              </span>
              <span className={`text-[11px] font-semibold leading-tight text-forest-900 ${soon ? "opacity-70" : ""}`}>{label}</span>
              {soon && <span className="absolute right-2 top-2 rounded-full bg-[#DDF7E8] px-1.5 py-0.5 text-[8.5px] font-bold leading-none text-[#0B6B47]">Soon</span>}
            </button>
          ))}
        </div>
      </section>

      <div className="rounded-[14px] border border-forest-100 bg-forest-50 p-3">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#0B6B47] text-[20px]">💡</div>
          <div className="min-w-0"><p className="text-[14px] font-bold tracking-[-0.01em] text-forest-900">{id ? "Langkah Berikutnya" : "Next Step"}</p><p className="mt-1 text-[13px] leading-[1.55] text-charcoal/70">{nextStep}</p></div>
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
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
          return <button key={plan.id} onClick={() => navigate("/goals")} className="rounded-[14px] border border-forest-100/50 bg-white p-3 text-left shadow-card transition hover:shadow-float">
            <div className="flex items-center gap-3">
              <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full" style={{ background: "conic-gradient(#0B6B47 " + progress + "%, #DDF7E8 " + progress + "%)" }}>
                <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white dark:bg-[#13271D]"><span className="text-[15px] font-bold tabular-nums text-forest-800">{Math.round(progress)}%</span></div>
              </div>
              <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-forest-900">{goalName}</p><p className="mt-1 text-[11px] text-charcoal/55">{id ? "Terkumpul" : "Collected"}</p><p className="text-[12px] font-semibold text-forest-800">{formatRupiah(allocated)} <span className="font-normal text-charcoal/45">{id ? "dari" : "of"} {formatRupiah(target)}</span></p></div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-forest-100"><div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: progress + "%" }}/></div>
          </button>;
        })}</div> : <div className="rounded-[14px] border border-dashed border-forest-200 bg-forest-50/50 px-3 py-5 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#0B6B47]"><Target size={21}/></span><p className="mt-2 text-[13px] font-semibold text-forest-900">Belum ada tujuan keuangan</p><p className="mt-1 text-[12px] text-charcoal/55">Mulai dari kalkulator, lalu simpan hasil perencanaanmu.</p><button onClick={() => navigate("/calculator")} className="mt-4 rounded-full bg-[#123524] px-5 py-2.5 text-[12.5px] font-semibold text-white shadow-sm">Buka Calculator</button></div>}
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title={id ? "Arus Kas" : "Cashflow"} subtitle={id ? "Pemasukan, pengeluaran, dan tabungan bulan ini" : "This Month’s Income, Expenses, and Savings"}>
          <ResponsiveContainer width="100%" height={210}><BarChart data={cashFlowData}><XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false}/><YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={45}/><Tooltip formatter={(v: number) => formatRupiah(v)}/><Bar dataKey="value" radius={[6, 6, 0, 0]}>{cashFlowData.map((_, i) => <Cell key={i} fill={["var(--chart-income)", "var(--chart-expense)", "var(--chart-saving)"][i]}/>)}</Bar></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title={id ? "Pengeluaran per Kategori" : "Expenses by Category"} subtitle={id ? "Distribusi pengeluaran yang tercatat" : "Breakdown of recorded expenses"}>
          {spendingByCategory.length ? <ResponsiveContainer width="100%" height={210}><RechartsPieChart><Pie data={spendingByCategory} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2}>{spendingByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={(v: number) => formatRupiah(v)}/><Legend wrapperStyle={{ fontSize: 10 }}/></RechartsPieChart></ResponsiveContainer> : <p className="py-16 text-center text-[12px] text-charcoal/45">{id ? "Belum ada data pengeluaran untuk ditampilkan." : "No expense data to display yet."}</p>}
        </ChartCard>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between"><h2 className="section-title">{id ? "Transaksi Terbaru" : "Recent Transactions"}</h2><button onClick={() => navigate("/transaction")} className="inline-flex items-center gap-0.5 rounded-full bg-forest-50 px-3 py-1.5 text-[12px] font-semibold text-forest-700">{id ? "Semua transaksi" : "All transactions"} <ChevronRight size={14}/></button></div>
        {recent.length ? <div className="flex flex-col divide-y divide-charcoal/8">{recent.map((t, i) => <div key={t.sheetRow ?? `${t.date}-${t.description}-${i}`} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.type === "Income" ? "bg-[#DFF3E7] text-[#0B6B47]" : t.type === "Expense" ? "bg-[#DDF7E8] text-[#0B6B47]" : "bg-[#DDF7E8] text-[#0B6B47]"}`}>{t.type === "Income" ? <ArrowDownLeft size={19}/> : t.type === "Expense" ? <ArrowUpRight size={19}/> : <PiggyBank size={19}/>}</span><div className="min-w-0"><p className="truncate text-[13.5px] font-semibold text-forest-900">{t.description}</p><p className="mt-0.5 truncate text-[11.5px] text-charcoal/50">{t.category} · {t.date}</p></div></div><p className={`num shrink-0 text-[13.5px] font-semibold ${t.type === "Expense" ? "text-rose-600" : "text-forest-700"}`}>{t.type === "Expense" ? "−" : "+"}{formatRupiah(t.amount)}</p></div>)}</div> : <p className="py-8 text-center text-[12px] text-charcoal/45">{id ? "Belum ada transaksi. Tekan tombol + untuk mulai mencatat." : "No transactions yet. Press + to start recording."}</p>}
      </Card>

      {quickAddOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center" onClick={() => setQuickAddOpen(false)}>
        <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><h3 className="text-[16px] font-semibold text-forest-900">Tambah Data</h3><button onClick={() => setQuickAddOpen(false)} aria-label="Tutup" className="rounded-lg p-1 text-charcoal/50"><X size={18}/></button></div>
          <button onClick={() => { setModalMode("manual"); setModalOpen(true); setQuickAddOpen(false); }} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-forest-100 p-3 text-left hover:bg-forest-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700"><Plus size={19}/></span><span><span className="block text-[13px] font-semibold text-forest-900">{id ? "Catat Transaksi" : "Record Transaction"}</span><span className="block text-[11px] text-charcoal/50">{id ? "Isi pemasukan, pengeluaran, atau tabungan" : "Enter income, expenses, or savings"}</span></span></button>
          <button onClick={() => { setModalMode("ai"); setModalOpen(true); setQuickAddOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-forest-100 p-3 text-left hover:bg-forest-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-700"><Sparkles size={19}/></span><span><span className="block text-[13px] font-semibold text-forest-900">{id ? "Catat dengan AI" : "Track with AI"}</span><span className="block text-[11px] text-charcoal/50">Tulis transaksi atau unggah foto struk</span></span></button>
        </div>
      </div>}

      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={(t) => { if (!isRealData) setExtraTxs((prev) => [...prev, t]); }} initialMode={modalMode}/>
    </div>
  );
}
