import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
const API_BASE = "/api";
import { AlertTriangle, TrendingUp, TrendingDown, PiggyBank, Landmark, Check, Pencil, Loader2, Trash2, ChevronLeft, ChevronRight, CalendarDays, X, Eye, EyeOff, Wallet, CircleDollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { StatCard } from "../components/StatCard";
import { ChartCard, Card } from "../components/Card";
import { BudgetProgressBar, StatusBadge } from "../components/ProgressBar";
import { formatRupiah, formatCompact, formatPercent } from "../lib/format";
import { usagePercentage, budgetStatus } from "../data/types";
import { useFinanceData, getStoredToken } from "../lib/useFinanceData";
import { AddItemForm } from "../components/AddItemForm";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { usdRate } from "../data/assets";



type ManualStock = {
  ticker: string;
  market: "ID" | "US";
  shares: number;
  avgPrice: number;
  currentPrice: number;
};

const MANUAL_STOCKS_KEY = "wealthplanner_manual_stocks_v1";

function loadManualStocks(): ManualStock[] {
  try {
    const raw = localStorage.getItem(MANUAL_STOCKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ManualStockForm({ onSaved }: { onSaved: (stock: ManualStock) => void }) {
  const [ticker, setTicker] = useState("");
  const [market, setMarket] = useState<"ID" | "US">("ID");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");

  function save() {
    const stock: ManualStock = {
      ticker: ticker.trim().toUpperCase(),
      market,
      shares: Number(shares) || 0,
      avgPrice: Number(avgPrice) || 0,
      currentPrice: Number(currentPrice) || 0,
    };
    if (!stock.ticker || stock.shares <= 0 || stock.avgPrice < 0 || stock.currentPrice < 0) return;
    onSaved(stock);
    setTicker(""); setShares(""); setAvgPrice(""); setCurrentPrice("");
  }

  const inputClass = "w-full rounded-lg border border-charcoal/12 bg-white px-2.5 py-2 text-[12px] outline-none focus:border-forest-400";
  return (
    <div className="mt-4 rounded-xl border border-dashed border-forest-100 bg-forest-50/40 p-4">
      <p className="text-[12px] font-semibold text-forest-900">Tambah saham manual</p>
      <p className="mt-0.5 text-[11px] text-charcoal/50">V1: harga saat ini diinput manual. Belum terhubung ke market-price API.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Stock Code" className={inputClass} />
        <select value={market} onChange={(e) => setMarket(e.target.value as "ID" | "US")} className={inputClass}>
          <option value="ID">Indonesia</option><option value="US">US</option>
        </select>
        <input value={shares} onChange={(e) => setShares(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Quantity" inputMode="decimal" className={inputClass} />
        <input value={avgPrice} onChange={(e) => setAvgPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Average Price" inputMode="decimal" className={inputClass} />
        <div className="flex gap-2">
          <input value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Current Price" inputMode="decimal" className={`${inputClass} min-w-0`} />
          <button type="button" onClick={save} className="shrink-0 rounded-lg bg-forest-600 px-3 text-[12px] font-semibold text-white hover:bg-forest-700">Tambah</button>
        </div>
      </div>
    </div>
  );
}

function EditableAssetItem({
  name,
  value,
  section,
  isRealData,
  sheetRow,
  onDeleted,
}: {
  name: string;
  value: number;
  section: "liquid" | "investment";
  isRealData: boolean;
  sheetRow?: number;
  onDeleted?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(value);
  const [err, setErr] = useState("");

  async function handleSave() {
    const amount = Number(input.replace(/\D/g, ""));
    if (isNaN(amount) || amount < 0) {
      setErr("Angka nggak valid.");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/update-asset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, section, name, value: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setSaved(amount);
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-[13px] text-charcoal/70 flex-1">{name}</span>
        <input
          autoFocus
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
          className="w-28 border border-charcoal/15 rounded px-2 py-1 text-[12px]"
        />
        <button onClick={handleSave} disabled={saving} className="bg-forest-600 text-white rounded p-1 hover:bg-forest-700 disabled:opacity-50">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-[13px] py-1 group">
      <span className="text-charcoal/70">{name}</span>
      <span className="flex items-center gap-2">
        <span className="font-medium">{formatRupiah(saved)}</span>
        {isRealData && (
          <>
            <button onClick={() => { setInput(String(saved)); setEditing(true); }} className="opacity-0 group-hover:opacity-100 text-charcoal/40 hover:text-forest-700" title="Edit">
              <Pencil size={11} />
            </button>
            {sheetRow && <button onClick={async()=>{ if(!window.confirm(`Hapus asset ${name}? Data yang dihapus tidak dapat dikembalikan.`)) return; const token=getStoredToken(); const res=await fetch(`${API_BASE}/delete-asset-item`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,sheetRow})}); const data=await res.json().catch(()=>({})); if(!res.ok){alert(data.error||"Gagal menghapus asset");return;} onDeleted?.(); }} className="opacity-0 group-hover:opacity-100 text-charcoal/40 hover:text-rose-600" title="Hapus">
              <Trash2 size={11} />
            </button>}
          </>
        )}
      </span>
      {err && <span className="text-[11px] text-rose-600 ml-2">{err}</span>}
    </div>
  );
}

const PIE_COLORS = ["var(--chart-2)", "var(--chart-5)", "var(--chart-1)", "var(--chart-8)", "var(--chart-3)"];

function BudgetRow({
  category, allocation, realization, kind, showBudget = true,
}: { category: string; allocation: number; realization: number; kind: "income" | "expense" | "saving"; showBudget?: boolean }) {
  const hasBudget = showBudget && allocation > 0;
  const pct = usagePercentage(realization, allocation);
  const overBy = pct > 100 ? pct - 100 : 0;
  const amountColor = kind === "expense" ? "text-[#F4577A]" : kind === "income" ? "text-[#0B6B47]" : "text-[#FFA24C]";
  return <div className="py-2.5 border-b border-charcoal/8 last:border-0">
    <div className="flex items-center justify-between gap-3"><p className="min-w-0 flex-1 truncate text-[13px] font-medium text-charcoal/80">{category}</p><p className={`shrink-0 text-[13px] font-semibold tabular-nums ${amountColor}`}>{formatRupiah(realization)}</p></div>
    {hasBudget && <div className="mt-1.5"><div className="flex items-center justify-between text-[11px] text-charcoal/50 mb-1"><span>Budget {formatRupiah(allocation)}</span><span className="font-medium">{formatPercent(pct)}</span></div><BudgetProgressBar usagePct={pct} />{overBy > 0 && <p className="text-[11px] text-rose-600 mt-1"><AlertTriangle size={11} className="inline mr-1" />Melebihi budget {formatPercent(Math.round(overBy * 10) / 10)}</p>}</div>}
  </div>;
}
export function DashboardFinance() {
  const now = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [selectedMonth, setSelectedMonth] = useState(monthNames[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [periodOpen, setPeriodOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(monthNames[now.getMonth()]);
  const [draftYear, setDraftYear] = useState(now.getFullYear());
  const [assetValuesHidden, setAssetValuesHidden] = useState(false);
  const { loading, error, isRealData, username, totalIncome, totalExpense, totalSaving, byCategory, assets } = useFinanceData(selectedMonth, false, selectedYear);
  const historyData = useFinanceData(selectedMonth, true, selectedYear);
  const [manualStocks, setManualStocks] = useState<ManualStock[]>(() => loadManualStocks());
  const [editingAssetTarget, setEditingAssetTarget] = useState(false);
  const [assetTargetInput, setAssetTargetInput] = useState("");
  const [savingAssetTarget, setSavingAssetTarget] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<"income" | "assets" | "cashflow">("income");

  useEffect(() => {
    localStorage.setItem(MANUAL_STOCKS_KEY, JSON.stringify(manualStocks));
  }, [manualStocks]);

  const assetProgress = assets.target > 0 ? (assets.totalAssets / assets.target) * 100 : 0;
  const allStocksID = [...assets.stocksID, ...manualStocks.filter((s) => s.market === "ID").map((s) => ({ ...s, value: s.currentPrice * s.shares, pl: (s.currentPrice - s.avgPrice) * s.shares }))];
  const allStocksUS = [...assets.stocksUS, ...manualStocks.filter((s) => s.market === "US").map((s) => ({ ...s, value: s.currentPrice * s.shares, pl: (s.currentPrice - s.avgPrice) * s.shares }))];
  const idValue = allStocksID.reduce((s, x) => s + x.value, 0);
  const usValueIDR = allStocksUS.reduce((s, x) => s + x.value, 0) * usdRate;
  const totalPortfolio = idValue + usValueIDR;

  const assetChartData = [
    ...assets.liquidAssets.map((i) => ({ name: i.name, value: i.value })),
    ...assets.investmentAssets.map((i) => ({ name: i.name, value: i.value })),
  ];

  const incomeRows = byCategory("Income");
  const savingRows = byCategory("Saving");
  const expenseRows = byCategory("Expense");
  const budgetExpensePlan = expenseRows.reduce((s, c) => s + c.allocation, 0);
  const reportTabs = [{ id: "income" as const, label: "Income Statement" }, { id: "cashflow" as const, label: "Cashflow Tracker" }, { id: "assets" as const, label: "Asset Tracker" }];
  const activeTabIndex = reportTabs.findIndex((tab) => tab.id === activeReportTab);
  const selectReportTab = (index: number) => setActiveReportTab(reportTabs[(index + reportTabs.length) % reportTabs.length].id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2 -mt-3">
        <h1 className="text-[19px] font-medium leading-tight text-forest-900">Financial Report</h1>
        <button type="button" onClick={() => { setDraftMonth(selectedMonth); setDraftYear(selectedYear); setPeriodOpen(true); }} className="inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border border-charcoal/10 bg-transparent px-2.5 py-1.5 text-[12px] font-medium text-forest-900">
          <CalendarDays size={15} className="shrink-0 text-forest-700" /><span>{monthNames[monthNames.indexOf(selectedMonth)] || selectedMonth} {selectedYear}</span><ChevronRight size={14} className="rotate-90 text-charcoal/50" />
        </button>
      </div>
      {periodOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setPeriodOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="finance-period-title" className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-charcoal/15 sm:hidden" />
          <div className="flex items-center justify-between">
            <h3 id="finance-period-title" className="text-[17px] font-semibold text-forest-900">Pilih periode</h3>
            <button type="button" aria-label="Tutup" onClick={() => setPeriodOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal/60 hover:bg-charcoal/5"><X size={19}/></button>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button type="button" aria-label="Tahun sebelumnya" onClick={() => setDraftYear((y) => y - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/10 text-forest-700"><ChevronLeft size={18}/></button>
            <span className="text-[16px] font-semibold text-forest-900">{draftYear}</span>
            <button type="button" aria-label="Tahun berikutnya" disabled={draftYear >= now.getFullYear()} onClick={() => setDraftYear((y) => Math.min(now.getFullYear(), y + 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/10 text-forest-700 disabled:opacity-25"><ChevronRight size={18}/></button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {monthNames.map((month, index) => {
              const disabled = draftYear > now.getFullYear() || (draftYear === now.getFullYear() && index > now.getMonth());
              return <button key={month} type="button" disabled={disabled} onClick={() => setDraftMonth(month)} className={`rounded-xl px-2 py-3 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${draftMonth === month ? "bg-[#0B4D38] text-white" : "bg-charcoal/[0.04] text-charcoal/75 hover:bg-forest-50"}`}>{month.slice(0,3)}</button>;
            })}
          </div>
          <button type="button" onClick={() => { setSelectedMonth(draftMonth); setSelectedYear(draftYear); setPeriodOpen(false); }} className="mt-5 w-full rounded-xl bg-[#0B4D38] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[#083c2c]">Terapkan</button>
        </div>
      </div>}
      <section className="bg-transparent">
        <div className="flex items-center justify-between gap-3">
          <button type="button" aria-label="Sebelumnya" onClick={() => selectReportTab(activeTabIndex - 1)} className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-charcoal/10 text-forest-700 transition-colors hover:bg-forest-50"><ChevronLeft size={18}/></button>
          <h2 aria-live="polite" className="min-w-0 flex-1 text-center text-[18px] font-medium leading-tight text-forest-900">{reportTabs[activeTabIndex].label}</h2>
          <button type="button" aria-label="Berikutnya" onClick={() => selectReportTab(activeTabIndex + 1)} className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-charcoal/10 text-forest-700 transition-colors hover:bg-forest-50"><ChevronRight size={18}/></button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2" aria-label="Pilihan laporan">
          {reportTabs.map((tab) => <span key={tab.id} className={`h-1.5 rounded-full transition-all duration-150 ${activeReportTab===tab.id?"w-5 bg-forest-700":"w-1.5 bg-charcoal/20"}`} />)}
        </div>
      </section>

      {activeReportTab === "income" && <>
        {(() => {
          const monthIndex = monthNames.indexOf(selectedMonth);
          const previousMonth = monthNames[(monthIndex + 11) % 12];
          const previousYear = monthIndex === 0 ? selectedYear - 1 : selectedYear;
          const previousTransactions = historyData.transactions.filter((t) => {
            const year = Number(t.year || (t.date?.split("/")?.[2] ?? selectedYear));
            return String(t.month || "").toLowerCase() === previousMonth.toLowerCase() && year === previousYear;
          });
          const previousIncome = previousTransactions.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
          const previousExpense = previousTransactions.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
          const changePct = (current: number, previous: number) => previous > 0 ? ((current - previous) / previous) * 100 : null;
          const incomeChange = changePct(totalIncome, previousIncome);
          const expenseChange = changePct(totalExpense, previousExpense);
          const ChangeLabel = ({ value }: { value: number | null }) => value === null
            ? <p className="mt-2 text-[12px] text-white/60">—</p>
            : <p className={`mt-2 flex items-center gap-1 text-[12px] font-semibold ${value >= 0 ? "text-[#6EE7A8]" : "text-[#FFB4D2]"}`}><span>{value >= 0 ? "↑" : "↓"}</span><span>{value >= 0 ? "+" : ""}{value.toFixed(1).replace(".", ",")}%</span></p>;
          return <div className="grid grid-cols-2 gap-0 rounded-2xl bg-[#0B4D38] p-4 text-white sm:p-5">
            <div className="min-w-0 border-r border-white/20 pr-3 sm:pr-5">
              <p className="text-[12px] leading-tight text-white/75 sm:text-sm">Total Income</p>
              <p className="mt-2 break-words text-[17px] font-semibold leading-tight sm:text-xl">{formatRupiah(totalIncome)}</p>
              <ChangeLabel value={incomeChange}/>
            </div>
            <div className="min-w-0 pl-3 sm:pl-5">
              <p className="text-[12px] leading-tight text-white/75 sm:text-sm">Total Expense</p>
              <p className="mt-2 break-words text-[17px] font-semibold leading-tight sm:text-xl">{formatRupiah(totalExpense)}</p>
              <ChangeLabel value={expenseChange}/>
            </div>
          </div>;
        })()}
        <ChartCard title="Income Statement" subtitle="Pendapatan dan pengeluaran aktual pada periode ini.">
          <div className="w-full">
            <ResponsiveContainer width="100%" height={230}><BarChart data={[{name:"Periode ini",income:totalIncome,expense:totalExpense}]} barCategoryGap="8%" barGap={12} margin={{top:10,right:8,left:0,bottom:0}}><XAxis dataKey="name" hide/><YAxis width={48} tickFormatter={(v)=>formatCompact(v)} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(v:number)=>formatRupiah(v)}/><Bar dataKey="income" name="Total Income" fill="#0B6B47" radius={[8,8,0,0]} maxBarSize={88}/><Bar dataKey="expense" name="Total Expense" fill="#F4577A" radius={[8,8,0,0]} maxBarSize={88}/></BarChart></ResponsiveContainer>
            <div className="mt-2 flex justify-center gap-5 text-xs text-charcoal/65"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#0B6B47]"/>Income</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#F4577A]"/>Expense</span></div>
          </div>
        </ChartCard>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title={<span className="inline-flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B6B47]/10 text-[#0B6B47]"><Wallet size={15}/></span>Income per Category</span>} subtitle="Realisasi pendapatan"><div>{incomeRows.length?incomeRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} kind="income" showBudget={false}/>):<p className="text-sm text-charcoal/45">Belum ada data income.</p>}</div></ChartCard>
          <ChartCard title={<span className="inline-flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4577A]/10 text-[#F4577A]"><CircleDollarSign size={15}/></span>Expense per Category</span>} subtitle="Realisasi pengeluaran"><div>{expenseRows.length?expenseRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} kind="expense" showBudget={false}/>):<p className="text-sm text-charcoal/45">Belum ada data expense.</p>}</div></ChartCard>
        </div>
      </>}

      {activeReportTab === "assets" && <>
      {/* E. Asset Tracker */}
      <ChartCard title="Asset Tracker" subtitle="Pantau aset saat ini dan progres menuju target.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="mb-4 rounded-2xl bg-[#0B4D38] p-4 text-white sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-white/70">Total aset</p>
                  <p className="mt-1 break-words text-2xl font-semibold leading-tight">{assetValuesHidden ? "Rp ••••••••" : formatRupiah(assets.totalAssets)}</p>
                  <p className="mt-2 text-[12px] text-white/75">{assets.target > 0 ? `${formatPercent(assetProgress)} dari target aset` : "Target aset belum diatur"}</p>
                </div>
                <button type="button" onClick={() => setAssetValuesHidden((hidden) => !hidden)} aria-label={assetValuesHidden ? "Tampilkan nominal aset" : "Sembunyikan nominal aset"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">{assetValuesHidden ? <Eye size={17}/> : <EyeOff size={17}/>}</button>
              </div>
              {assets.target > 0 && <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#6EE7A8]" style={{width:`${Math.min(Math.max(assetProgress,0),100)}%`}} /></div>}
              <div className="mt-4 rounded-xl bg-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-white/75">Target aset</p>
                  {isRealData && !editingAssetTarget && <button type="button" onClick={() => { setAssetTargetInput(String(Math.round(assets.target || 0))); setEditingAssetTarget(true); }} className="text-[11px] font-semibold text-white underline underline-offset-2">Edit</button>}
                </div>
                {editingAssetTarget ? <div className="mt-2 flex gap-2"><input inputMode="numeric" value={assetTargetInput} onChange={(e) => setAssetTargetInput(e.target.value.replace(/[^0-9]/g, ""))} className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white px-2.5 py-2 text-[13px] text-charcoal outline-none focus:border-forest-400" placeholder="Target aset" /><button type="button" disabled={savingAssetTarget} onClick={async () => { const token = getStoredToken(); if (!token) return; setSavingAssetTarget(true); try { const res = await fetch(`${API_BASE}/update-asset-target`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, value: Number(assetTargetInput) || 0 }) }); if (!res.ok) throw new Error("Gagal menyimpan target"); setEditingAssetTarget(false); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated")); } catch (e) { console.error(e); } finally { setSavingAssetTarget(false); } }} className="rounded-lg bg-white px-3 py-2 text-[12px] font-semibold text-forest-900 disabled:opacity-50">{savingAssetTarget ? "..." : "Simpan"}</button></div> : <p className="mt-1 text-[16px] font-semibold">{assets.target > 0 ? (assetValuesHidden ? "Rp ••••••••" : formatRupiah(assets.target)) : "Belum diatur"}</p>}
              </div>
            </div>
            {assets.target > 0 && (
              <>
                <div className="flex items-center justify-between text-[12px] text-charcoal/55 mb-1.5">
                  <span>Progress ke target</span>
                  <span className="font-medium text-forest-700">{formatPercent(assetProgress)}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-charcoal/8 overflow-hidden mb-5">
                  <div className="h-full bg-forest-600 rounded-full" style={{ width: `${Math.min(assetProgress, 100)}%` }} />
                </div>
              </>
            )}

            {(assets.liquidAssets.length > 0 || isRealData) && (
              <div className="mb-3">
                <p className="text-[12px] font-medium text-charcoal/60 uppercase tracking-wide mb-1.5">Liquid Assets</p>
                {assets.liquidAssets.map((item) => (
                  <EditableAssetItem key={`${item.name}-${item.sheetRow||0}`} name={item.name} value={item.value} section="liquid" sheetRow={item.sheetRow} isRealData={isRealData} onDeleted={()=>window.location.reload()} />
                ))}
                {isRealData && (
                  <AddItemForm
                    placeholder="Tambah liquid asset baru"
                    onSubmit={async (name, amount) => {
                      const token = getStoredToken();
                      const res = await fetch(`${API_BASE}/add-asset-item`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, section: "liquid", name, value: amount }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Gagal menambah item");
                      window.location.reload();
                    }}
                  />
                )}
              </div>
            )}
            {(assets.investmentAssets.length > 0 || isRealData) && (
              <div className="mb-3">
                <p className="text-[12px] font-medium text-charcoal/60 uppercase tracking-wide mb-1.5">Investment Assets</p>
                {assets.investmentAssets.map((item) => (
                  <EditableAssetItem key={`${item.name}-${item.sheetRow||0}`} name={item.name} value={item.value} section="investment" sheetRow={item.sheetRow} isRealData={isRealData} onDeleted={()=>window.location.reload()} />
                ))}
                {isRealData && (
                  <AddItemForm
                    placeholder="Tambah investment asset baru"
                    onSubmit={async (name, amount) => {
                      const token = getStoredToken();
                      const res = await fetch(`${API_BASE}/add-asset-item`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, section: "investment", name, value: amount }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Gagal menambah item");
                      window.location.reload();
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <div>
            {assetChartData.length > 0 ? (
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
            ) : (
              <p className="text-[13px] text-charcoal/50">Belum ada data aset.</p>
            )}
          </div>
        </div>
      </ChartCard>

      </>}

      {activeReportTab === "cashflow" && <>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#0B4D38] p-4 text-white sm:gap-4 sm:p-5">
          <div className="min-w-0 border-r border-white/15 pr-2">
            <p className="text-[11px] leading-tight text-white/70 sm:text-xs">Cash in</p>
            <p className="mt-2 break-words text-[15px] font-semibold leading-tight sm:text-lg">{formatRupiah(totalIncome)}</p>
          </div>
          <div className="min-w-0 border-r border-white/15 px-1 sm:px-2">
            <p className="text-[11px] leading-tight text-white/70 sm:text-xs">Cash out</p>
            <p className="mt-2 break-words text-[15px] font-semibold leading-tight sm:text-lg">{formatRupiah(totalExpense+totalSaving)}</p>
          </div>
          <div className="min-w-0 pl-1 sm:pl-2">
            <p className="text-[11px] leading-tight text-white/70 sm:text-xs">Net cashflow</p>
            <p className="mt-2 break-words text-[15px] font-semibold leading-tight sm:text-lg">{formatRupiah(totalIncome-totalExpense-totalSaving)}</p>
          </div>
        </div>
        <ChartCard title="Cashflow Tracker" subtitle="Arus kas bersih setelah pengeluaran dan alokasi tabungan.">
          <ResponsiveContainer width="100%" height={260}><BarChart data={[{name:"Cash In",amount:totalIncome},{name:"Expenses",amount:totalExpense},{name:"Savings",amount:totalSaving},{name:"Net Cashflow",amount:totalIncome-totalExpense-totalSaving}]} margin={{top:10,right:12,left:0,bottom:4}}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tickFormatter={(v)=>formatCompact(v)} tick={{fontSize:11}}/><Tooltip formatter={(v:number)=>formatRupiah(v)}/><Bar dataKey="amount" name="Nominal" fill="var(--chart-2)" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
        </ChartCard>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Cash In Detail" subtitle="Pemasukan per kategori"><div>{incomeRows.length?incomeRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} kind="income"/>):<p className="text-sm text-charcoal/45">Belum ada data income.</p>}</div></ChartCard>
          <ChartCard title="Cash Out Detail" subtitle="Pengeluaran per kategori"><div>{expenseRows.length?expenseRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} kind="expense"/>):<p className="text-sm text-charcoal/45">Belum ada data expense.</p>}</div></ChartCard>
          <ChartCard title="Saving Detail" subtitle="Tabungan per kategori"><div>{savingRows.length?savingRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} kind="saving"/>):<p className="text-sm text-charcoal/45">Belum ada data saving.</p>}</div></ChartCard>
        </div>
      </>}
      {/* Stock Net Worth hidden in Phase 1 until live market-price data is available. */}

    </div>
  );
}
