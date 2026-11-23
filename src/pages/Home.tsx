import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, CircleDollarSign, TrendingUp, TrendingDown, PiggyBank, Plus, Sparkles,
  ArrowLeftRight, Landmark, Calculator, Target, ShieldCheck,
  ChartNoAxesCombined, Bot, BookOpen, ChevronRight, X, Eye, EyeOff, ArrowDownLeft, ArrowUpRight,
  PieChart, CalendarDays, HelpCircle, CircleCheck, Settings,
} from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { Card, ChartCard } from "../components/Card";
import { TransactionBadge } from "../components/TransactionBadge";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { formatRupiah, formatCompact, getAppLanguage } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { getDisplayName, greetingWord } from "../lib/settings";
import type { Transaction } from "../data/types";
import { loadFinancialPlans } from "../lib/financialPlans";
import { useWallets } from "../lib/useWallets";
import { HomeMonthlyCalendar } from "../components/HomeMonthlyCalendar";

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];
const menus = [
  { key: "wallets", label: "Wallet", icon: Wallet, to: "/wallets" },
  { key: "transaction", label: "Transaction", icon: ArrowLeftRight, to: "/transaction" },
  { key: "budget", label: "Budget", icon: PieChart, to: "/budgeting" },
  { key: "asset", label: "Asset", icon: TrendingUp, to: "/assets" },
  { key: "debt", label: "Debt", icon: Landmark, to: "/debt" },
  { key: "calculator", label: "Calculator", icon: Calculator, to: "/calculator" },
  { key: "goals", label: "Goals", icon: Target, to: "/goals" },
  { key: "report", label: "Report", icon: Landmark, to: "/finance" },
  { key: "protection", label: "Protection", icon: ShieldCheck, to: "/protection" },
  { key: "ai", label: "AI Assistant", icon: Bot, to: "/ai-assistant" },
  { key: "community", label: "Community", icon: ChartNoAxesCombined, soon: true },
  { key: "settings", label: "Settings", icon: Settings, to: "/settings" },
];

export function Home() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(getAppLanguage());
  useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const id = language === "id";
  const { error, isRealData, loading, userId, username, transactions, totalIncome, totalExpense, totalSaving, byCategory, month, assets } = useFinanceData();
  const { wallets } = useWallets();
  // Keep Home and Report > Asset Tracker on the exact same asset calculation.
  // Wallet is the source of truth for liquid assets; investment assets come from the Asset Tracker.
  const liquidAssetsFromWallets = wallets.map((wallet) => ({ name: wallet.name, value: wallet.balance }));
  // Total Aset is sourced from the dashboard response so Home and Asset Tracker
  // use exactly the same stock-inclusive total.
  const integratedTotalAssets = assets.totalAssets;
  const [extraTxs, setExtraTxs] = useState<Transaction[]>([]);
  const [assetsVisible, setAssetsVisible] = useState(true);
  const [summaryTab, setSummaryTab] = useState<"asset" | "budget">("asset");
  const [menuExpanded, setMenuExpanded] = useState(false);
  const summaryScrollRef = useRef<HTMLDivElement>(null);
  const [assetPeriod, setAssetPeriod] = useState<"1M" | "3M" | "6M" | "YTD" | "1Y">("YTD");
  const [assetHistory, setAssetHistory] = useState<{ date: string; value: number }[]>([]);
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
  const spendingByCategory = byCategory("Expense")
    .filter((c) => c.realization > 0)
    .map((c) => ({ name: c.category, value: c.realization }))
    .sort((a, b) => b.value - a.value);

  const expenseChartData = (() => {
    const total = spendingByCategory.reduce((sum, item) => sum + item.value, 0);
    if (!total) return [];
    const eligible = spendingByCategory.filter((item) => item.value / total >= 0.05);
    const top = eligible.slice(0, 4);
    const topNames = new Set(top.map((item) => item.name));
    const smaller = spendingByCategory.filter((item) => !topNames.has(item.name));
    const smallerTotal = smaller.reduce((sum, item) => sum + item.value, 0);
    const result = top.map((item) => ({ name: item.name, value: item.value, percentage: (item.value / total) * 100 }));
    if (smallerTotal > 0) {
      result.push({ name: "Lainnya", value: smallerTotal, percentage: (smallerTotal / total) * 100 });
    }
    return result;
  })();

  const cashFlowBase = Math.max(totalIncome, 1);
  const incomeBudget = byCategory("Income").reduce((sum, item) => sum + Number(item.allocation || 0), 0);
  const expenseBudget = byCategory("Expense").reduce((sum, item) => sum + Number(item.allocation || 0), 0);
  const savingBudget = byCategory("Saving").reduce((sum, item) => sum + Number(item.allocation || 0), 0);
  const hasBudget = incomeBudget > 0 || expenseBudget > 0 || savingBudget > 0;
  const remainingBudget = totalIncome - totalExpense - totalSaving;

  const renderMoney = (value: number, visible: boolean, amountClassName: string, fontSize?: number) => {
    if (loading) return <span aria-label="Memuat data" className="inline-block h-[1em] w-[190px] max-w-full animate-pulse rounded-md bg-black/15 align-middle" />;
    if (!visible) return <span className={amountClassName} style={fontSize ? { fontSize: `${fontSize}px` } : undefined}>Rp ••••••</span>;
    const formatted = formatRupiah(value);
    const amount = formatted.startsWith("Rp ") ? formatted.slice(3) : formatted.replace(/^Rp\s*/, "");
    return (
      <span className={`inline-flex min-w-0 max-w-full items-baseline ${amountClassName}`} style={fontSize ? { fontSize: `${fontSize}px` } : undefined}>
        <span className="mr-[0.2em] text-[0.6em] font-medium opacity-60">Rp</span>
        <span className="min-w-0 break-words">{amount}</span>
      </span>
    );
  };
  const today = new Date().toLocaleDateString(id ? "id-ID" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  useEffect(() => {
    if (!isRealData || !userId) {
      setAssetHistory([]);
      return;
    }
    const key = (date: Date) => `wealthplanner_asset_snapshot_user_${userId}_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    try {
      const now = new Date();
      localStorage.setItem(key(now), String(integratedTotalAssets));
      const rows: { date: string; value: number }[] = [];
      const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
      for (let i = 0; i < 13; i++) {
        const date = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
        const value = Number(localStorage.getItem(key(date)));
        if (Number.isFinite(value) && value >= 0) {
          rows.unshift({ date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, value });
        }
      }
      setAssetHistory(rows);
    } catch {
      setAssetHistory([]);
    }
  }, [integratedTotalAssets, isRealData, userId]);

  const assetPeriodLabels: Record<typeof assetPeriod, string> = {
    "1M": "1M", "3M": "3M", "6M": "6M", "YTD": "YTD", "1Y": "1Y",
  };
  const assetPeriodMonths = assetPeriod === "1M" ? 1 : assetPeriod === "3M" ? 3 : assetPeriod === "6M" ? 6 : assetPeriod === "YTD" ? new Date().getMonth() + 1 : 12;
  const nowMonth = new Date();
  const periodStart = assetPeriod === "YTD"
    ? new Date(nowMonth.getFullYear(), 0, 1)
    : new Date(nowMonth.getFullYear(), nowMonth.getMonth() - assetPeriodMonths + 1, 1);
  const visibleAssetHistory = assetHistory.filter((row) => {
    const [year, month] = row.date.split("-").map(Number);
    return new Date(year, month - 1, 1) >= periodStart;
  });
  const chartHistory = visibleAssetHistory;
  const hasChartHistory = chartHistory.length >= 2;
  const hasSingleChartPoint = chartHistory.length === 1;
  const chartMin = chartHistory.length ? Math.min(...chartHistory.map((p) => p.value)) : 0;
  const chartMax = chartHistory.length ? Math.max(...chartHistory.map((p) => p.value)) : 1;
  const chartRange = Math.max(chartMax - chartMin, chartMax * 0.02, 1);
  const chartPoints = chartHistory.map((point, index) => {
    const x = chartHistory.length === 1 ? 160 : 8 + (index / (chartHistory.length - 1)) * 304;
    const y = 54 - ((point.value - chartMin) / chartRange) * 48;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const chartPeriodChange = hasChartHistory
    ? chartHistory[chartHistory.length - 1].value - chartHistory[0].value
    : null;
  const chartPeriodPercent = hasChartHistory && chartHistory[0].value > 0
    ? (chartPeriodChange! / chartHistory[0].value) * 100
    : null;
  useEffect(() => {
    const el = summaryScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const width = el.clientWidth || 1;
      const index = Math.round(el.scrollLeft / width);
      setSummaryTab(index === 1 ? "budget" : "asset");
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSummary = (tab: "asset" | "budget") => {
    setSummaryTab(tab);
    const el = summaryScrollRef.current;
    if (!el) return;
    const index = tab === "budget" ? 1 : 0;
    el.scrollTo({ left: el.clientWidth * index, behavior: "smooth" });
  };

  const cycleAssetPeriod = (direction: number) => {
    const periods = ["1M", "3M", "6M", "YTD", "1Y"] as const;
    const index = periods.indexOf(assetPeriod);
    setAssetPeriod(periods[(index + direction + periods.length) % periods.length]);
  };

  return (
    <div className="home-page flex flex-col gap-3 bg-[#F4F5F7] pb-4" data-tour-loading={loading ? "true" : "false"}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-medium text-charcoal/50">{today}</p><div className="flex items-center gap-2 md:hidden"><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("wealthplanner:start-tour", { detail: { type: "main", route: "/" } }))} aria-label="Mulai panduan interaktif" className="flex h-8 w-8 items-center justify-center rounded-full border border-forest-100 bg-surface text-forest-800 shadow-sm dark:border-[#2B2D30] dark:bg-[#141516] dark:text-[#B9BDC3]"><HelpCircle size={15}/></button><ThemeToggle variant="compact" />{isRealData && !error && <span title="Data tersambung" aria-label="Data tersambung" className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6EE7A8]/20 text-forest-700"><span className="text-[12px] font-bold">✓</span></span>}</div></div>
        <h1 className="font-display font-normal text-[26px] leading-[1.1] tracking-[-0.02em] text-forest-900">{(id ? greetingWord() : (new Date().getHours() < 11 ? "Good Morning" : new Date().getHours() < 15 ? "Good Afternoon" : new Date().getHours() < 18 ? "Good Afternoon" : "Good Evening"))}{displayName ? `, ${displayName}` : ""} <span aria-hidden>👋</span></h1>
        <p className="text-[13.5px] text-charcoal/60">{id ? `Ringkasan keuanganmu untuk ${monthLabel} ${currentYear}.` : `Your Financial Summary for ${monthLabel} ${currentYear}.`}</p>

      </div>

      <div className="hidden md:grid md:grid-cols-2 gap-3 items-stretch">
        <div role="button" tabIndex={0}
          onClick={() => navigate("/finance")}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/finance"); } }}
          data-tour="home-assets-desktop" className="home-asset-summary hero-neutral h-full min-w-0 cursor-pointer overflow-hidden rounded-[20px] p-4 text-white transition hover:-translate-y-0.5">
          <div className="relative">
            <button type="button"
              onClick={(event) => { event.stopPropagation(); setAssetsVisible((visible) => !visible); }}
              aria-label={assetsVisible ? "Sembunyikan saldo" : "Tampilkan saldo"}
              data-tour="home-eye-desktop" className="absolute -right-1 -top-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10">
              {assetsVisible ? <Eye size={19} strokeWidth={2}/> : <EyeOff size={19} strokeWidth={2}/>}
            </button>
          </div>
          <p className="text-[12px] font-medium tracking-[-0.02em] text-white/70">{id ? "Total Aset" : "Total Assets"}</p>
          <div className="mt-1 min-w-0 break-words text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-white">
            {renderMoney(integratedTotalAssets, assetsVisible, "text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-white", 44)}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2 text-[10.5px] font-medium text-white/70">
              <span>{id ? "Progress target" : "Goal progress"}</span>
              <span className="tabular-nums font-semibold text-white">{Math.round(assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0)}%</span>
            </div>
            <div className="relative mt-1.5 h-[28px] w-full" aria-label={id ? "Progress target aset" : "Asset goal progress"}>
              <div className="absolute left-0 right-0 top-[13px] h-[2px] rounded-full bg-white/20" />
              <div className="absolute left-0 top-[13px] h-[2px] rounded-full bg-[#9FE1CB] transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0))}%` }} />
              <div className="absolute left-0 top-[9px] h-[10px] w-[10px] -translate-x-1/2 rounded-full bg-[#9FE1CB]" style={{ left: `${Math.min(100, Math.max(0, assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0))}%` }} />
            </div>
          </div>            <div className="mt-1.5 text-right text-[11px] font-medium text-white/70 tabular-nums">
              Target {assetsVisible ? renderMoney(assets.target, true, "text-[11px] font-medium text-white/70 tabular-nums", 11) : "Rp ••••••"}
            </div>

        </div>

        <div role="button" tabIndex={0}
          onClick={() => navigate("/budgeting")}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/budgeting"); } }}
          data-tour="home-budget-desktop" className="hero-neutral h-full min-w-0 cursor-pointer overflow-hidden rounded-[20px] p-4 text-white transition hover:-translate-y-0.5">
          <p className="mt-1.5 text-[12px] font-medium tracking-[-0.02em] text-white/70">{id ? "Sisa anggaran" : "Remaining budget"}</p>
          <div className="mt-0.5 min-w-0 break-words text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums" style={{ fontSize: "34px" }}>
            {hasBudget ? renderMoney(remainingBudget, assetsVisible, "text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums", 34) : (assetsVisible ? renderMoney(0, true, "text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums", 34) : "Rp ••••••")}
          </div>
          {!hasBudget && <p className="mt-1 text-[11px] text-white/55">{id ? "Atur anggaran" : "Set a budget"}</p>}
          <div className="mt-2 grid min-h-[46px] grid-cols-2 gap-2">
            <div className="min-w-0 rounded-[12px] bg-white/10 px-3 py-2">
              <span className="text-[11px] font-medium text-white/60">{id ? "Penghasilan" : "Income"}</span>
              <p className="mt-0.5 min-w-0 truncate text-[16px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(totalIncome) : "Rp ••••••"}</p>
            </div>
            <div className="min-w-0 rounded-[12px] bg-white/10 px-3 py-2">
              <span className="text-[11px] font-medium text-white/60">{id ? "Pengeluaran" : "Expenses"}</span>
              <p className="mt-0.5 min-w-0 truncate text-[16px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(totalExpense) : "Rp ••••••"}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="md:hidden order-1">
        <div ref={summaryScrollRef} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="w-full min-w-full snap-start pr-0">
            <div className="home-mobile-asset-card h-[240px] w-full min-w-0 overflow-hidden rounded-[20px] border border-[#3A3B3D] bg-[#292A2D] p-4 text-[#F5F5F5] shadow-[0_12px_36px_rgba(17,24,39,.10)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">Asset Tracker</span>
                <button type="button" onClick={() => setAssetsVisible((visible) => !visible)} aria-label={assetsVisible ? "Sembunyikan saldo" : "Tampilkan saldo"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white">
                  {assetsVisible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>
              <div role="button" tabIndex={0} onClick={() => navigate("/assets")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/assets"); } }} className="mt-3 cursor-pointer">
                <p className="text-[12px] font-medium text-white/55">Total aset</p>
                <div className="mt-0.5 min-w-0 truncate text-[27px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums">{renderMoney(integratedTotalAssets, assetsVisible, "text-[27px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums", 27)}</div>
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2 text-[10.5px] font-medium text-white/70"><span>Progress Target</span><span className="tabular-nums font-semibold text-white">{Math.round(assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0)}%</span></div>
                  <div className="relative mt-1.5 h-[28px] w-full"><div className="absolute left-0 right-0 top-[13px] h-[2px] rounded-full bg-white/20"/><div className="absolute left-0 top-[13px] h-[2px] rounded-full bg-[#9FE1CB]" style={{width:`${Math.min(100,Math.max(0,assets.target>0?(integratedTotalAssets/assets.target)*100:0))}%`}}/><div className="absolute top-[9px] h-[10px] w-[10px] -translate-x-1/2 rounded-full bg-[#9FE1CB]" style={{left:`${Math.min(100,Math.max(0,assets.target>0?(integratedTotalAssets/assets.target)*100:0))}%`}}/></div>
                </div>
                <div className="mt-1 text-right text-[10.5px] font-medium text-white/70">Target {assetsVisible ? renderMoney(assets.target, true, "text-[10.5px] font-medium text-white/70 tabular-nums", 10.5) : "Rp ••••••"}</div>
              </div>
            </div>
          </div>

          <div className="w-full min-w-full snap-start pl-0">
            <div className="home-mobile-budget-card h-[240px] w-full min-w-0 overflow-hidden rounded-[20px] border border-[#3A3B3D] bg-[#292A2D] p-4 text-[#F5F5F5] shadow-[0_12px_36px_rgba(17,24,39,.10)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">Budget Tracker</span>
                <button type="button" onClick={() => setAssetsVisible((visible) => !visible)} aria-label={assetsVisible ? "Sembunyikan saldo" : "Tampilkan saldo"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white">
                  {assetsVisible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>
              <div role="button" tabIndex={0} onClick={() => navigate("/budgeting")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/budgeting"); } }} className="mt-3 cursor-pointer">
                <p className="text-[12px] font-medium text-white/55">Sisa anggaran</p>
                <div className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)_56px] items-center gap-3">
                  <div className="min-w-0 truncate text-[24px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums">{hasBudget ? renderMoney(remainingBudget, assetsVisible, "text-[27px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums", 27) : (assetsVisible ? renderMoney(0, true, "text-[27px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums", 27) : "Rp ••••••")}</div>
                  <div className="relative h-[56px] w-[56px] shrink-0 rounded-full" style={{ background: `conic-gradient(#34D399 ${Math.min(100, Math.max(0, hasBudget && expenseBudget > 0 ? (totalExpense / expenseBudget) * 100 : 0))}%, #D1D5DB 0)` }}>
                    <div className="absolute inset-[8px] flex items-center justify-center rounded-full bg-[#292A2D]"><span className="text-[11px] font-extrabold tabular-nums text-white">{hasBudget && expenseBudget > 0 ? Math.round(Math.min(100, (totalExpense / expenseBudget) * 100)) : 0}%</span></div>
                  </div>
                </div>
                {!hasBudget && <p className="mt-1 text-[10.5px] text-white/40">Atur anggaran untuk melihat sisa budget</p>}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="min-w-0 rounded-[14px] bg-white/10 px-3 py-2.5"><span className="text-[10.5px] font-medium text-white/45">Penghasilan</span><p className="mt-0.5 truncate text-[14px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(totalIncome) : "Rp ••••••"}</p></div>
                  <div className="min-w-0 rounded-[14px] bg-white/10 px-3 py-2.5"><span className="text-[10.5px] font-medium text-white/45">Pengeluaran</span><p className="mt-0.5 truncate text-[14px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(totalExpense) : "Rp ••••••"}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-label={id ? "Pilih ringkasan" : "Select summary"}>
          {(["asset", "budget"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => scrollToSummary(tab)} aria-label={tab === "asset" ? "Asset Tracker" : "Budget Tracker"} className={`h-1.5 rounded-full transition-all ${summaryTab === tab ? "w-5 bg-forest-700" : "w-1.5 bg-forest-200"}`}>{/* indicator */}</button>
          ))}
        </div>
      </section>

      <section data-tour="main-menu" className="order-2 md:order-none -mt-4 -mb-1">
        <div className="mb-0 flex items-center">
          <button type="button" onClick={() => setMenuExpanded((value) => !value)} aria-expanded={menuExpanded} className="flex items-center gap-1.5 rounded-full px-0.5 py-0 text-[16px] font-bold tracking-[-0.02em] text-[#17191C] dark:text-[#F5F5F5]">
            <span>{id ? "Menu Utama" : "Main Menu"}</span>
            <ChevronRight size={17} className={menuExpanded ? "-rotate-90" : "rotate-90"} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-x-1 gap-y-3 rounded-[22px] border border-[#E5E7EB] bg-white px-3 pt-2.5 pb-3 shadow-[0_8px_24px_rgba(17,24,39,.06)]">
          {menus.map(({ label, icon: Icon, to, soon }, index) => (
            <button key={label} type="button" disabled={Boolean(soon)} onClick={() => to && navigate(to)}
              className={`relative flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-xl bg-transparent px-1 py-1.5 text-center transition ${index >= 4 && !menuExpanded ? "hidden md:flex" : ""} ${soon ? "cursor-not-allowed" : "hover:bg-[#F8F9FA]"}`}>
              <Icon size={21} strokeWidth={1.9} className={soon ? "text-[#9CA3AF]" : "text-[#111827]"} />
              <span className={`text-[11px] font-medium leading-tight text-[#111827] ${soon ? "text-[#9CA3AF]" : ""}`}>{label}</span>
              {soon && <span className="absolute right-0.5 top-0.5 rounded-full bg-[#DDF7E8] px-1.5 py-0.5 text-[8px] font-bold leading-none text-[#0B6B47]">Soon</span>}
            </button>
          ))}
        </div>
      </section>

      <div className="order-7 md:order-none rounded-[20px] border border-[#E7E7E5] bg-white p-3 dark:border-[#303235] dark:bg-[#171819]">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#0B6B47] text-[20px]">💡</div>
          <div className="min-w-0"><p className="text-[14px] font-bold tracking-[-0.01em] text-forest-900">{id ? "Langkah Berikutnya" : "Next Step"}</p><p className="mt-1 text-[13px] leading-[1.55] text-charcoal/70">{nextStep}</p></div>
        </div>
      </div>

      <section className="order-8 md:order-none">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[17px] font-bold tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">Goals</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/goals")} className="min-h-8 rounded-full bg-transparent px-0.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#9CA3AF]">Lihat semua</button>
            <button onClick={() => navigate("/goals")} aria-label="Tambah goal" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#111827] dark:border-[#24272F] dark:bg-[#14161B] dark:text-[#F3F4F6]"><Plus size={16}/></button>
          </div>
        </div>
        {plans.length ? <div className="grid gap-3 sm:grid-cols-2">{plans.slice(0, 2).map((plan) => {
          let goalSettings: { names?: Record<string, string>; allocations?: Record<string, Record<string, number>> } = {};
          try { goalSettings = JSON.parse(localStorage.getItem("wealthplanner_goal_asset_allocations_v1") || "{}"); } catch { goalSettings = {}; }
          const target = plan.targetAmount ?? plan.obligationAmount ?? plan.homePrice ?? plan.loanAmount ?? 0;
          const allocated = Object.values(goalSettings.allocations?.[plan.id] || {}).reduce((sum, value) => sum + Number(value || 0), 0);
          const progress = target > 0 ? Math.min(100, Math.max(0, allocated / target * 100)) : 0;
          const goalName = goalSettings.names?.[plan.id] || plan.name;
          return <button key={plan.id} onClick={() => navigate("/goals")} className="rounded-[14px] border border-[#E5E7EB] bg-white p-3 text-left shadow-[0_2px_10px_rgba(17,24,39,.04)] transition hover:shadow-sm dark:border-[#24272F] dark:bg-[#14161B]">
            <div className="flex items-center gap-3">
              <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full" style={{ background: "conic-gradient(rgb(var(--wp-accent)) " + progress + "%, rgb(var(--wp-card-elevated)) " + progress + "%)" }}>
                <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-white dark:bg-[#13271D]"><span className="text-[15px] font-bold tabular-nums text-[#0B6B47] dark:text-[#9DB8A8]">{Math.round(progress)}%</span></div>
              </div>
              <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">{goalName}</p><p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{id ? "Terkumpul" : "Collected"}</p><p className="text-[12px] font-semibold text-[#0B6B47] dark:text-[#9DB8A8]">{formatRupiah(allocated)} <span className="font-normal text-[#6B7280] dark:text-[#9CA3AF]">{id ? "dari" : "of"} {formatRupiah(target)}</span></p></div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#DDE1E6] dark:bg-[#24272F]"><div className="h-full rounded-full bg-gradient-to-r from-[#4ADE9F] to-[#0E9F6E] transition-all" style={{ width: progress + "%" }}/></div>
          </button>;
        })}</div> : <div className="rounded-[14px] border border-dashed border-[#E5E7EB] bg-white px-3 py-5 text-center dark:border-[#24272F] dark:bg-[#14161B]"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ECEEF2] text-[#6B7280]"><Target size={21}/></span><p className="mt-2 text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">Belum ada goals</p><p className="mt-1 text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">Mulai dari kalkulator, lalu simpan hasil perencanaanmu.</p><button onClick={() => navigate("/calculator")} className="mt-4 rounded-full bg-[#123524] px-5 py-2.5 text-[12.5px] font-semibold text-white">Buka Calculator</button></div>}
      </section>

      <div className="order-3 md:order-none"><HomeMonthlyCalendar transactions={allTxs} userId={userId} /></div>
      <div className="order-9 md:order-none grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-none">
          <div className="mb-5">
            <h2 className="text-[15px] font-medium leading-tight tracking-[-0.01em] text-[#111827]">{id ? "Arus Kas" : "Cash Flow"}</h2>
            <p className="mt-1 text-[12px] leading-snug text-[#6B7280]">{id ? "Pemasukan, pengeluaran, dan tabungan bulan ini" : "Income, expenses, and savings this month"}</p>
          </div>

          <div className="space-y-4" aria-label={id ? "Arus kas bulan ini" : "Cash flow this month"}>
            {[
              { label: id ? "Pemasukan" : "Income", value: totalIncome, color: "#1D9E75" },
              { label: id ? "Pengeluaran" : "Expenses", value: totalExpense, color: "#9AA3B2" },
              { label: id ? "Tabungan" : "Savings", value: totalSaving, color: "#378ADD" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-[#6B7280]">{item.label}</span>
                  <span className="text-[13px] font-medium tabular-nums text-[#111827]">{formatRupiah(item.value)}</span>
                </div>
                <div className="mt-1.5 h-[10px] overflow-hidden rounded-full bg-[#ECEEF2]" aria-hidden="true">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, (item.value / cashFlowBase) * 100))}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 inline-flex max-w-full rounded-full bg-[#DDF2DE] px-4 py-2 text-[12px] font-medium text-[#166534]">
            {id ? `Menabung ${totalIncome > 0 ? Math.round((totalSaving / totalIncome) * 100) : 0}% dari pemasukan` : `Saving ${totalIncome > 0 ? Math.round((totalSaving / totalIncome) * 100) : 0}% of income`}
          </div>
        </Card>

        <Card className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-none">
          <div className="mb-4">
            <h2 className="text-[15px] font-medium leading-tight tracking-[-0.01em] text-[#111827]">{id ? "Pengeluaran per Kategori" : "Expenses by Category"}</h2>
            <p className="mt-1 text-[12px] leading-snug text-[#6B7280]">{id ? "Distribusi pengeluaran yang tercatat" : "Distribution of recorded expenses"}</p>
          </div>

          {expenseChartData.length ? (
            <>
              <div className="flex justify-center" aria-label={id ? "Donut pengeluaran per kategori" : "Expense category donut chart"} title={id ? "Pengeluaran per kategori" : "Expenses by category"}>
                <div className="relative h-[190px] w-[190px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={expenseChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={88}
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {expenseChartData.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={["#0F6E56", "#9AA3B2", "#E0B04A", "#9FE1CB", "#DDE1E6"][index]}
                          />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] text-[#6B7280]">Total</span>
                    <span className="mt-0.5 text-[16px] font-medium leading-tight tabular-nums text-[#111827]">{formatCompact(expenseChartData.reduce((sum, item) => sum + item.value, 0))}</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 divide-y divide-[#E5E7EB] border-t border-[#E5E7EB]">
                {expenseChartData.map((item, index) => (
                  <div key={item.name} className="flex min-w-0 items-center gap-2.5 py-2.5">
                    <span className="h-[10px] w-[10px] shrink-0 rounded-[2px]" style={{ backgroundColor: ["#0F6E56", "#9AA3B2", "#E0B04A", "#9FE1CB", "#DDE1E6"][index] }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[#111827]">{item.name}</span>
                    <span className="w-10 shrink-0 text-right text-[12px] text-[#6B7280] tabular-nums">{Math.round(item.percentage)}%</span>
                    <span className="w-[96px] shrink-0 text-right text-[13px] font-medium tabular-nums text-[#111827]">{formatRupiah(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-[12px] text-[#6B7280]">{id ? "Belum ada data pengeluaran untuk ditampilkan." : "No expense data to display yet."}</p>
          )}
        </Card>
      </div>

      <div className="order-6 md:order-none"><Card>
        <div className="mb-2 flex items-center justify-between"><h2 className="section-title">{id ? "Transaksi Terbaru" : "Recent Transactions"}</h2><button onClick={() => navigate("/transaction")} className="inline-flex items-center gap-0.5 rounded-full bg-forest-50 px-3 py-1.5 text-[12px] font-semibold text-forest-700">{id ? "Semua transaksi" : "All transactions"} <ChevronRight size={14}/></button></div>
        {recent.length ? <div className="flex flex-col divide-y divide-charcoal/8">{recent.map((t, i) => <div key={t.sheetRow ?? `${t.date}-${t.description}-${i}`} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.type === "Income" ? "bg-[#EEF0F2] text-[#15803D]" : t.type === "Expense" ? "bg-[#EEF0F2] text-[#15803D]" : "bg-[#EEF0F2] text-[#15803D]"}`}>{t.type === "Income" ? <ArrowDownLeft size={19}/> : t.type === "Expense" ? <ArrowUpRight size={19}/> : <PiggyBank size={19}/>}</span><div className="min-w-0"><p className="truncate text-[13.5px] font-semibold text-forest-900">{t.description}</p><p className="mt-0.5 truncate text-[11.5px] text-charcoal/50">{t.category} · {t.date}</p></div></div><p className={`num shrink-0 text-[13.5px] font-semibold ${t.type === "Expense" ? "text-rose-600" : "text-forest-700"}`}>{t.type === "Expense" ? "−" : "+"}{formatRupiah(t.amount)}</p></div>)}</div> : <p className="py-8 text-center text-[12px] text-charcoal/45">{id ? "Belum ada transaksi. Tekan tombol + untuk mulai mencatat." : "No transactions yet. Press + to start recording."}</p>}
      </Card></div>

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