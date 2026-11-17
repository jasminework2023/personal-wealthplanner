import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, CircleDollarSign, TrendingUp, TrendingDown, PiggyBank, Plus, Sparkles,
  ArrowLeftRight, Landmark, Calculator, Target, ShieldCheck,
  ChartNoAxesCombined, Bot, BookOpen, ChevronRight, X, Eye, EyeOff, ArrowDownLeft, ArrowUpRight,
  PieChart, CalendarDays, ClipboardCheck, Users, Settings,
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
import { HomeMonthlyCalendar } from "../components/HomeMonthlyCalendar";

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)"];
const menus = [
  { key: "transaction", label: "Transaction", icon: ArrowLeftRight, to: "/transaction", tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "wallets", label: "Wallet", icon: Wallet, to: "/wallets", tone: "bg-[#E7E8EB] text-[#17191C]" },
  { key: "budget", label: "Budget", icon: PieChart, to: "/budgeting", tone: "bg-[#E7E8EB] text-[#17191C]" },
  { key: "asset", label: "Asset", icon: TrendingUp, to: "/assets", tone: "bg-[#E7E8EB] text-[#17191C]" },
  { key: "calculator", label: "Calculator", icon: Calculator, to: "/calculator", tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "goals", label: "Goals", icon: Target, to: "/goals", tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "protection", label: "Protection", icon: ShieldCheck, to: "/protection", tone: "bg-[#E7E8EB] text-[#17191C]" },
  { key: "report", label: "Report", icon: Landmark, to: "/finance", tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "community", label: "Community", icon: ChartNoAxesCombined, soon: true, tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "ai", label: "AI Assistant", icon: Bot, to: "/ai-assistant", tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "guide", label: "Guide", icon: BookOpen, to: "/guidance", tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "calendar", label: "Calendar", icon: CalendarDays, to: "/calendar", tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "checkup", label: "Checkup", icon: ClipboardCheck, to: "/checkup", tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "spouse", label: "Spouse", icon: Users, to: "/spouse-sharing", tone: "bg-[#F1F2F4] text-[#17191C]" },
  { key: "settings", label: "Settings", icon: Settings, to: "/settings", tone: "bg-[#F1F2F4] text-[#17191C]" },
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
          data-tour="home-assets-desktop" className="home-asset-summary h-full min-w-0 cursor-pointer overflow-hidden rounded-[20px] border-0 p-4 text-[#17191C] shadow-[0_12px_36px_rgba(17,24,39,0.08)]"
          style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F0F1F3 55%, #D9DCE1 100%)" }}>
          <div className="relative">
            <button type="button"
              onClick={(event) => { event.stopPropagation(); setAssetsVisible((visible) => !visible); }}
              aria-label={assetsVisible ? "Sembunyikan saldo" : "Tampilkan saldo"}
              data-tour="home-eye-desktop" className="absolute -right-1 -top-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#4B5563] transition hover:bg-[#006B48]/15">
              {assetsVisible ? <Eye size={19} strokeWidth={2}/> : <EyeOff size={19} strokeWidth={2}/>}
            </button>
          </div>
          <p className="mt-1.5 text-[12px] font-medium tracking-[-0.02em] text-[#6B7280]">{id ? "Total Aset" : "Total Assets"}</p>
          <div className="mt-0.5 min-w-0 break-words text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums text-black" style={{ fontSize: "34px" }}>
            {renderMoney(integratedTotalAssets, assetsVisible, "text-[34px] font-medium leading-[1.1] tracking-[-0.02em] tabular-nums text-black", 34)}
          </div>
          <div className="mt-2 flex min-h-[46px] items-center justify-between gap-3">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E5E7EB] px-3 py-1.5 text-[11px] font-medium tracking-[-0.02em] text-[#374151]">
              <TrendingUp size={14} strokeWidth={2.5}/>{Math.round(assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0)}% {id ? "dari target" : "of goal"}
            </span>
            <span className="shrink-0 text-[11px] font-medium tracking-[-0.02em] text-[#6B7280] tabular-nums">
              {assetsVisible ? renderMoney(assets.target, true, "text-[11px] font-medium tracking-[-0.02em] text-[#6B7280] tabular-nums", 11) : "Rp ••••••"}
            </span>
          </div>
          {/* Asset goal progress: target amount sits beside the percentage above the bar. */}
          <div className="mt-3">
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]"
              role="progressbar"
              aria-label={id ? "Progress aset terhadap target" : "Asset goal progress"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.round(assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0))}
            >
              <div
                className="h-full rounded-full bg-[#111827] transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0))}%` }}
              />
            </div>
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
              <p className="mt-0.5 min-w-0 truncate text-[16px] font-medium tracking-[-0.02em] tabular-nums">{assetsVisible ? formatRupiah(totalIncome) : "Rp ••••••"}</p>
            </div>
            <div className="min-w-0 rounded-[12px] bg-white/10 px-3 py-2">
              <span className="text-[11px] font-medium text-white/60">{id ? "Pengeluaran" : "Expense"}</span>
              <p className="mt-0.5 min-w-0 truncate text-[16px] font-medium tracking-[-0.02em] tabular-nums">{assetsVisible ? formatRupiah(totalExpense) : "Rp ••••••"}</p>
            </div>
          </div>
        </div>
      </div>

      <section data-tour="home-assets-mobile" className="md:hidden w-full min-w-0">
        <div
          ref={summaryScrollRef}
          className="grid w-full min-w-0 grid-flow-col auto-cols-[100%] overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={id ? "Ringkasan aset dan anggaran" : "Asset and budget summary"}
        >
          <div className="min-w-0 snap-start pr-0">
            <div className="home-mobile-asset-card h-[224px] w-full min-w-0 overflow-hidden rounded-[20px] border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Asset Tracker</span>
                <button type="button" onClick={() => setAssetsVisible((visible) => !visible)} aria-label={assetsVisible ? "Sembunyikan saldo" : "Tampilkan saldo"} data-tour="home-eye-mobile" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[#4B5563]">
                  {assetsVisible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>

              <div role="button" tabIndex={0} onClick={() => navigate("/finance")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/finance"); } }} className="mt-3 cursor-pointer">
                <p className="text-[12px] font-medium text-[#6B7280]">Total Aset</p>
                <div className="mt-1 min-w-0 truncate text-[28px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums">
                  {renderMoney(integratedTotalAssets, assetsVisible, "text-[28px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums", 28)}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E5E7EB] px-2.5 py-1 text-[10.5px] font-semibold text-[#374151]">
                    <TrendingUp size={13} />
                    {Math.round(assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0)}% dari target
                  </span>
                  <span className="min-w-0 truncate text-right text-[10.5px] font-medium text-[#6B7280]">
                    {assetsVisible ? renderMoney(assets.target, true, "text-[10.5px] font-medium text-[#0B6B47]/60", 10.5) : "Rp ••••••"}
                  </span>
                </div>

                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
                  <div className="h-full rounded-full bg-[#15803D]" style={{ width: `${Math.min(100, Math.max(0, assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0))}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 snap-start pr-0">
            <div className="home-mobile-budget-card h-[240px] w-full min-w-0 overflow-hidden rounded-[20px] border p-4 text-[#F5F5F5] shadow-[0_12px_36px_rgba(17,24,39,.10)]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">Budget Tracker</span>
                <button type="button" onClick={() => setAssetsVisible((visible) => !visible)} aria-label={assetsVisible ? "Sembunyikan saldo" : "Tampilkan saldo"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white">
                  {assetsVisible ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>

              <div role="button" tabIndex={0} onClick={() => navigate("/budgeting")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/budgeting"); } }} className="mt-3 cursor-pointer">
                <p className="text-[12px] font-medium text-white/55">Sisa anggaran</p>

                <div className="mt-1 grid min-w-0 grid-cols-[minmax(0,1fr)_56px] items-center gap-3">
                  <div className="min-w-0 truncate text-[24px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums">
                    {hasBudget ? renderMoney(remainingBudget, assetsVisible, "text-[27px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums", 27) : (assetsVisible ? renderMoney(0, true, "text-[27px] font-extrabold leading-tight tracking-[-0.035em] tabular-nums", 27) : "Rp ••••••")}
                  </div>
                  <div className="relative h-[56px] w-[56px] shrink-0 rounded-full" style={{ background: `conic-gradient(#34D399 ${Math.min(100, Math.max(0, hasBudget && expenseBudget > 0 ? (totalExpense / expenseBudget) * 100 : 0))}%, #D1D5DB 0)` }}>
                    <div className="absolute inset-[8px] flex items-center justify-center rounded-full bg-[#292A2D]">
                      <span className="text-[11px] font-extrabold tabular-nums text-white">{hasBudget && expenseBudget > 0 ? Math.round(Math.min(100, (totalExpense / expenseBudget) * 100)) : 0}%</span>
                    </div>
                  </div>
                </div>

                {!hasBudget && <p className="mt-1 text-[10.5px] text-white/40">Atur anggaran untuk melihat sisa budget</p>}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="min-w-0 rounded-[14px] bg-white/10 px-3 py-2.5">
                    <span className="text-[10.5px] font-medium text-white/45">Penghasilan</span>
                    <p className="mt-0.5 truncate text-[14px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(totalIncome) : "Rp ••••••"}</p>
                  </div>
                  <div className="min-w-0 rounded-[14px] bg-white/10 px-3 py-2.5">
                    <span className="text-[10.5px] font-medium text-white/45">Pengeluaran</span>
                    <p className="mt-0.5 truncate text-[14px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(totalExpense) : "Rp ••••••"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-1.5" aria-label={id ? "Pilih ringkasan" : "Select summary"}>
          {(["asset", "budget"] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => scrollToSummary(tab)} aria-label={tab === "asset" ? "Asset Tracker" : "Budget Tracker"} className={`h-1.5 rounded-full transition-all ${summaryTab === tab ? "w-5 bg-forest-700" : "w-1.5 bg-forest-200"}`} />
          ))}
        </div>
      </section>

      <section data-tour="main-menu" className="order-2 md:order-none">
        <div className="mb-2 flex items-center">
          <button type="button" onClick={() => setMenuExpanded((value) => !value)} aria-expanded={menuExpanded} className="flex items-center gap-1.5 rounded-full px-0.5 py-1 text-[16px] font-bold tracking-[-0.02em] text-[#17191C] dark:text-[#F5F5F5]">
            <span>{id ? "Menu Utama" : "Main Menu"}</span>
            <ChevronRight size={17} className={menuExpanded ? "-rotate-90" : "rotate-90"} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {menus.map(({ label, icon: Icon, to, soon, tone }, index) => (
            <button key={label} type="button" disabled={Boolean(soon)} onClick={() => to && navigate(to)}
              className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-[18px] border border-forest-100/60 bg-white px-1.5 py-2 text-center shadow-card transition sm:min-h-[78px] ${index >= 4 && !menuExpanded ? "hidden md:flex" : ""} ${soon ? "cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-float"}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-[14px] ${tone} ${soon ? "opacity-60" : ""}`}>
                <Icon size={18} strokeWidth={2.1}/>
              </span>
              <span className={`text-[10.5px] font-semibold leading-tight text-forest-900 ${soon ? "opacity-70" : ""}`}>{label}</span>
              {soon && <span className="absolute right-1.5 top-1.5 rounded-full bg-[#DDF7E8] px-1.5 py-0.5 text-[8px] font-bold leading-none text-[#0B6B47]">Soon</span>}
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

      <div className="order-3 md:order-none"><HomeMonthlyCalendar transactions={allTxs} userId={userId} /></div>
      <section data-tour="home-wallets-mobile" className="order-4 md:hidden">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[18px] font-bold tracking-[-0.02em] text-[#17191C] dark:text-[#F5F5F5]">{id ? "Wallet" : "Wallets"}</h2>
          <div className="text-[14px] font-medium tabular-nums text-[#737373]">{assetsVisible ? formatRupiah(wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0)) : "Rp ••••••"}</div>
        </div>
        {wallets.length ? (
          <div className="relative h-[188px]">
            {wallets.slice(0, 2).map((wallet, index) => {
              const isTop = index === 0;
              return (
                <button key={wallet.id} type="button" onClick={() => navigate("/wallets")}
                  className={isTop ? "absolute inset-x-0 top-0 z-10 h-[102px] rounded-[22px] bg-[#202B3A] text-white shadow-[0_10px_24px_rgba(17,24,39,.12)] text-left overflow-hidden" : "absolute inset-x-0 top-[78px] z-20 h-[110px] rounded-[22px] bg-[#F1F4F8] text-[#17191C] shadow-[0_10px_28px_rgba(17,24,39,.08)] text-left overflow-hidden"}>
                  <div className="flex items-start justify-between px-5 pt-4">
                    <div className="min-w-0">
                      <span className={isTop ? "block text-[11px] font-medium text-white/55" : "block text-[11px] font-medium text-[#737373]"}>
                        {wallet.type === "bank" ? "Bank" : wallet.type === "cash" ? "Tunai" : wallet.type === "investment" ? "Investment" : "Wallet"}
                      </span>
                      <span className={isTop ? "mt-0.5 block truncate text-[16px] font-semibold text-white" : "mt-0.5 block truncate text-[16px] font-semibold text-[#17191C]"}>{wallet.name}</span>
                    </div>
                    <span className={isTop ? "shrink-0 text-[15px] font-bold tabular-nums text-white" : "shrink-0 text-[15px] font-bold tabular-nums text-[#17191C]"}>
                      {assetsVisible ? formatRupiah(wallet.balance) : "Rp ••••••"}
                    </span>
                  </div>
                  {!isTop && (
                    <div className="px-5 pt-2">
                      <span className="text-[24px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">
                        {assetsVisible ? formatRupiah(wallet.balance) : "Rp ••••••"}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
            {wallets.length > 2 && <button type="button" onClick={() => navigate("/wallets")} className="absolute -bottom-1 right-0 z-30 text-[11px] font-semibold text-forest-700">{id ? `+${wallets.length - 2} wallet lainnya` : `+${wallets.length - 2} more wallets`}</button>}
          </div>
        ) : (
          <button type="button" onClick={() => navigate("/wallets")} className="rounded-[20px] border border-dashed border-forest-200 bg-forest-50/50 px-4 py-5 text-center">
            <Wallet className="mx-auto text-forest-700" size={22}/>
            <p className="mt-2 text-[12px] font-semibold text-forest-900">{id ? "Belum ada wallet" : "No wallets yet"}</p>
          </button>
        )}
      </section>


      <div className="order-9 md:order-none grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard title={id ? "Arus Kas" : "Cashflow"} subtitle={id ? "Pemasukan, pengeluaran, dan tabungan bulan ini" : "This Month’s Income, Expenses, and Savings"}>
          <ResponsiveContainer width="100%" height={210}><BarChart data={cashFlowData}><XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false}/><YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 10, fill: "var(--chart-axis)" }} axisLine={false} tickLine={false} width={45}/><Tooltip formatter={(v: number) => formatRupiah(v)}/><Bar dataKey="value" radius={[6, 6, 0, 0]}>{cashFlowData.map((_, i) => <Cell key={i} fill={["var(--chart-income)", "var(--chart-expense)", "var(--chart-saving)"][i]}/>)}</Bar></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title={id ? "Pengeluaran per Kategori" : "Expenses by Category"} subtitle={id ? "Distribusi pengeluaran yang tercatat" : "Breakdown of recorded expenses"}>
          {spendingByCategory.length ? <ResponsiveContainer width="100%" height={210}><RechartsPieChart><Pie data={spendingByCategory} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2}>{spendingByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}</Pie><Tooltip formatter={(v: number) => formatRupiah(v)}/><Legend wrapperStyle={{ fontSize: 10 }}/></RechartsPieChart></ResponsiveContainer> : <p className="py-16 text-center text-[12px] text-charcoal/45">{id ? "Belum ada data pengeluaran untuk ditampilkan." : "No expense data to display yet."}</p>}
        </ChartCard>
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
