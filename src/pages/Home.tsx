import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, Plus, Sparkles,
  ArrowLeftRight, Landmark, Calculator, Target, ShieldCheck,
  ChartNoAxesCombined, Bot, BookOpen, ChevronRight, X, Eye, EyeOff, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, ChartCard } from "../components/Card";
import { TransactionBadge } from "../components/TransactionBadge";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { formatRupiah, formatCompact } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { getDisplayName, greetingWord } from "../lib/settings";
import type { Transaction } from "../data/types";
import { loadFinancialPlans } from "../lib/financialPlans";

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
  const [assetsVisible, setAssetsVisible] = useState(true);
  const [assetTrend, setAssetTrend] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"manual" | "ai">("manual");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const displayName = getDisplayName() || username;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const monthInIndonesian = currentDate.toLocaleDateString("id-ID", { month: "long" });
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
  const nextStep = totalExpense > totalIncome && totalIncome > 0
    ? "Pengeluaranmu bulan ini sudah lebih besar dari pemasukan. Cek kategori pengeluaran terbesar dan review budget."
    : assets.target > 0 && assets.totalAssets < assets.target
      ? `Target asetmu masih ${formatRupiah(Math.max(0, assets.target - assets.totalAssets))} lagi. Review Asset Tracker dan rencana investasimu.`
      : totalSaving > 0 ? "Kamu sudah punya saving bulan ini. Lanjutkan konsistensi dan cek apakah target finansialmu sudah punya angka yang jelas."
      : "Mulai dengan mencatat transaksi dan isi satu target finansial agar dashboard bisa memberi arah langkah berikutnya.";
  const cashFlowData = [{ name: "Pemasukan", value: totalIncome }, { name: "Pengeluaran", value: totalExpense }, { name: "Tabungan", value: totalSaving }];
  const spendingByCategory = byCategory("Expense").filter((c) => c.realization > 0).map((c) => ({ name: c.category, value: c.realization }));
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-medium text-charcoal/45">{today}</p>{isRealData && !error && <span title="Data tersambung" aria-label="Data tersambung" className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6EE7A8]/20 text-forest-700"><span className="text-[12px] font-bold">✓</span></span>}</div>
        <h1 className="text-[25px] sm:text-[28px] font-semibold tracking-tight text-forest-900">{greetingWord()}{displayName ? `, ${displayName}` : ""} <span aria-hidden>👋</span></h1>
        <p className="text-[13px] text-charcoal/55">Ringkasan keuanganmu untuk {monthLabel} {currentYear}.</p>
      </div>

      <Card className="home-asset-summary w-full overflow-hidden border-0 !rounded-[26px] bg-[#123524] p-[22px] text-white shadow-none" style={{ backgroundColor: "#123524", color: "#FFFFFF" }}>
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-normal text-[#A9C9B8]">Total aset</p>
          <button type="button" onClick={() => setAssetsVisible((visible) => !visible)} aria-label={assetsVisible ? "Sembunyikan total aset" : "Tampilkan total aset"} title={assetsVisible ? "Sembunyikan total aset" : "Tampilkan total aset"} className="flex h-8 w-8 items-center justify-center text-[#A9C9B8]">
            {assetsVisible ? <Eye size={22} strokeWidth={2}/> : <EyeOff size={22} strokeWidth={2}/>}
          </button>
        </div>
        <div className="mt-1 flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
          <span className="shrink-0 text-[16px] font-normal text-[#A9C9B8]">Rp</span>
          <span className="min-w-0 text-[clamp(19px,7.8vw,31px)] font-medium leading-tight tracking-[-0.5px] tabular-nums">
            {assetsVisible ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(assets.totalAssets) : "••••••••"}
          </span>
        </div>
        {assetTrend !== null && Number.isFinite(assetTrend) && (
          <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ${assetTrend >= 0 ? "bg-[#6EE7A8]/[0.16] text-[#6EE7A8]" : "bg-[#FFB4A2]/[0.16] text-[#FFB4A2]"}`}>
            {assetTrend >= 0 ? <TrendingUp size={15} strokeWidth={2}/> : <TrendingDown size={15} strokeWidth={2}/>}
            <span>{assetTrend >= 0 ? "+" : ""}{assetTrend.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% bulan ini</span>
          </div>
        )}
        {assets.target > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[13px] font-normal text-[#A9C9B8]">% dari target</span>
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
                className="h-full rounded-full bg-[#6EE7A8] transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, (assets.totalAssets / assets.target) * 100))}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="flex min-w-0 flex-col self-start rounded-2xl bg-white/[0.09] p-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#6EE7A8]/[0.18] text-[#6EE7A8]"><ArrowDownLeft size={17} strokeWidth={2}/></span>
              <span className="truncate text-[12.5px] font-normal text-[#A9C9B8]">Pemasukan</span>
            </div>
            <p className="mt-1 break-words text-[clamp(11px,3.8vw,16px)] font-medium leading-tight tabular-nums">{formatRupiah(totalIncome)}</p>
          </div>
          <div className="flex min-w-0 flex-col self-start rounded-2xl bg-white/[0.09] p-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#FFB4A2]/[0.18] text-[#FFB4A2]"><ArrowUpRight size={17} strokeWidth={2}/></span>
              <span className="truncate text-[12.5px] font-normal text-[#A9C9B8]">Pengeluaran</span>
            </div>
            <p className="mt-1 break-words text-[clamp(11px,3.8vw,16px)] font-medium leading-tight tabular-nums">{formatRupiah(totalExpense)}</p>
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
