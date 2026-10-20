import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
const API_BASE = "/api";
import { Check, Pencil, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ChartCard, Card } from "../components/Card";

import { DataStatusBanner } from "../components/DataStatusBanner";
import { formatRupiah, formatCompact, formatPercent } from "../lib/format";

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

function BudgetRow({ category, allocation, realization }: { category: string; allocation: number; realization: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-charcoal/8 py-3 last:border-0">
      <span className="min-w-0 truncate text-[13px] font-medium">{category}</span>
      <span className="shrink-0 whitespace-nowrap text-[12px] font-semibold text-forest-900 tabular-nums">{formatRupiah(realization)}</span>
    </div>
  );
}

export function DashboardFinance() {
  const { loading, error, isRealData, username, byCategory, assets } = useFinanceData();
  const allYearFinance = useFinanceData(undefined, true);
  const [manualStocks, setManualStocks] = useState<ManualStock[]>(() => loadManualStocks());
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionMode, setTransactionMode] = useState<"manual" | "ai">("ai");
  const [editingAssetTarget, setEditingAssetTarget] = useState(false);
  const [assetTargetInput, setAssetTargetInput] = useState("");
  const [savingAssetTarget, setSavingAssetTarget] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<"income" | "assets" | "cashflow">("income");
  const [incomeTrendMetric, setIncomeTrendMetric] = useState<"income" | "expense">("income");

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

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthIndex = (value: string) => monthNames.findIndex((name) => name.toLowerCase() === String(value || "").toLowerCase());
  const transactionsForYear = (year: number) => allYearFinance.transactions.filter((t) => Number(t.year || String(t.date || "").split("/")[2]) === year);
  const monthlyComparison = monthNames.map((month, index) => {
    const current = transactionsForYear(currentYear).filter((t) => monthIndex(t.month) === index);
    const previous = transactionsForYear(previousYear).filter((t) => monthIndex(t.month) === index);
    const sum = (items: typeof current, type: string) => items.filter((t) => t.type === type).reduce((total, t) => total + Number(t.amount || 0), 0);
    return { month: month.slice(0, 3), incomeCurrent: sum(current, "Income"), incomePrevious: sum(previous, "Income"), expenseCurrent: sum(current, "Expense"), expensePrevious: sum(previous, "Expense"), cashflowCurrent: sum(current, "Income") - sum(current, "Expense") - sum(current, "Saving"), cashflowPrevious: sum(previous, "Income") - sum(previous, "Expense") - sum(previous, "Saving") };
  });
  const yearToDateTotal = (year: number, type: string) => transactionsForYear(year)
    .filter((t) => monthIndex(t.month) >= 0 && monthIndex(t.month) <= new Date().getMonth())
    .filter((t) => t.type === type).reduce((total, t) => total + Number(t.amount || 0), 0);
  const trendLabel = (current: number, previous: number) => {
    const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
    return { label: (change >= 0 ? "+" : "") + change.toFixed(1) + "%", positive: change >= 0 };
  };
  const assetCompositionTotal = assetChartData.reduce((sum, item) => sum + item.value, 0);

  const reportTabs = [{ id: "income" as const, label: "Income Statement" }, { id: "assets" as const, label: "Asset Tracker" }, { id: "cashflow" as const, label: "Cashflow Tracker" }];
  const activeTabIndex = reportTabs.findIndex((tab) => tab.id === activeReportTab);
  const selectReportTab = (index: number) => setActiveReportTab(reportTabs[(index + reportTabs.length) % reportTabs.length].id);

  return (
    <div className="flex flex-col gap-6">
      <DataStatusBanner isRealData={isRealData} username={username} error={error} />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">Dashboard Finance</h1>
          <p className="text-[14px] text-charcoal/60 mt-0.5">Ringkasan lengkap kondisi keuanganmu bulan ini.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setTransactionMode("ai"); setTransactionModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-rose-700">✨ Catat dengan AI</button>
          <button type="button" onClick={() => { setTransactionMode("manual"); setTransactionModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-charcoal/15 bg-white px-3.5 py-2 text-[13px] font-medium hover:bg-charcoal/5">+ Tambah Transaksi</button>
        </div>
      </div>

      <div className="rounded-2xl border border-forest-100 bg-white p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Laporan sebelumnya" onClick={() => selectReportTab(activeTabIndex - 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-charcoal/10 text-forest-700 hover:bg-forest-50"><ChevronLeft size={18}/></button>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {reportTabs.map((tab, index) => <button key={tab.id} type="button" onClick={() => setActiveReportTab(tab.id)} className={`min-w-max flex-1 rounded-xl px-3 py-2.5 text-[12px] sm:text-[13px] font-semibold transition-colors ${activeReportTab===tab.id?"bg-forest-700 text-white shadow-sm":"text-charcoal/60 hover:bg-forest-50 hover:text-forest-800"}`}>{tab.label}</button>)}
          </div>
          <button type="button" aria-label="Laporan berikutnya" onClick={() => selectReportTab(activeTabIndex + 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-charcoal/10 text-forest-700 hover:bg-forest-50"><ChevronRight size={18}/></button>
        </div>
        <p className="mt-2 px-1 text-[11px] text-charcoal/45">Geser pilihan atau gunakan panah untuk melihat laporan lainnya.</p>
      </div>

      {activeReportTab === "income" && <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Total Income", current: yearToDateTotal(currentYear, "Income"), previous: yearToDateTotal(previousYear, "Income") },
            { label: "Total Expense", current: yearToDateTotal(currentYear, "Expense"), previous: yearToDateTotal(previousYear, "Expense") },
          ].map((item) => {
            const trend = trendLabel(item.current, item.previous);
            return <Card key={item.label} className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] text-charcoal/60">{item.label}</p>
                <p className="mt-1 whitespace-nowrap text-[clamp(13px,2.5vw,22px)] font-semibold leading-tight tracking-tight text-forest-900 tabular-nums">{formatRupiah(item.current)}</p>
              </div>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${trend.positive ? "bg-[#D7FF72] text-[#24502A]" : "bg-[#FFD6E4] text-[#A52D5A]"}`}>{trend.label}</span>
            </Card>;
          })}
        </div>
        <ChartCard title="Income Statement" subtitle={"Perbandingan bulanan " + currentYear + " vs " + previousYear + "."}>
          <div className="mb-3 flex gap-2">
            <button type="button" onClick={() => setIncomeTrendMetric("income")} className={"rounded-lg px-3 py-1.5 text-[11px] font-semibold " + (incomeTrendMetric === "income" ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-700")}>Income</button>
            <button type="button" onClick={() => setIncomeTrendMetric("expense")} className={"rounded-lg px-3 py-1.5 text-[11px] font-semibold " + (incomeTrendMetric === "expense" ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-700")}>Expense</button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyComparison} margin={{top:10,right:12,left:0,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/><XAxis dataKey="month" tick={{fontSize:11}}/>
              <YAxis tickFormatter={(v)=>formatCompact(v)} tick={{fontSize:10}} width={48}/><Tooltip formatter={(v:number)=>formatRupiah(v)}/><Legend/>
              <Line type="monotone" dataKey={incomeTrendMetric + "Current"} name={(incomeTrendMetric === "income" ? "Income " : "Expense ") + currentYear} stroke="var(--chart-2)" strokeWidth={2.5} dot={{r:3}} connectNulls/>
              <Line type="monotone" dataKey={incomeTrendMetric + "Previous"} name={(incomeTrendMetric === "income" ? "Income " : "Expense ") + previousYear} stroke="var(--chart-expense)" strokeWidth={2.5} strokeDasharray="5 4" dot={{r:3}} connectNulls/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Income per Kategori" subtitle="Realisasi pendapatan"><div>{incomeRows.length?incomeRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization}/>):<p className="text-sm text-charcoal/45">Belum ada data income.</p>}</div></ChartCard>
          <ChartCard title="Expense per Kategori" subtitle="Realisasi pengeluaran"><div>{expenseRows.length?expenseRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization}/>):<p className="text-sm text-charcoal/45">Belum ada data expense.</p>}</div></ChartCard>
          <ChartCard title="Saving per Kategori" subtitle="Realisasi tabungan"><div>{savingRows.length?savingRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization}/>):<p className="text-sm text-charcoal/45">Belum ada data saving.</p>}</div></ChartCard>
        </div>
      </>}

      {activeReportTab === "assets" && <>
      {/* E. Asset Tracker */}
      <ChartCard title="Asset Tracker" subtitle="Pantau aset saat ini dan progres menuju target.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-forest-50/70 p-3">
                <p className="text-[11px] text-charcoal/55">Aset Saat Ini</p>
                <p className="mt-1 text-[17px] font-semibold text-forest-900">{formatRupiah(assets.totalAssets)}</p>
              </div>
              <div className="rounded-xl bg-white border border-charcoal/8 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-charcoal/55">Target</p>
                  {isRealData && !editingAssetTarget && <button type="button" onClick={() => { setAssetTargetInput(String(Math.round(assets.target || 0))); setEditingAssetTarget(true); }} className="text-[11px] font-semibold text-forest-700 hover:underline">Edit</button>}
                </div>
                {editingAssetTarget ? <div className="mt-2 flex gap-2"><input inputMode="numeric" value={assetTargetInput} onChange={(e) => setAssetTargetInput(e.target.value.replace(/[^0-9]/g, ""))} className="min-w-0 flex-1 rounded-lg border border-charcoal/15 px-2.5 py-2 text-[13px] outline-none focus:border-forest-400" placeholder="Target aset" /><button type="button" disabled={savingAssetTarget} onClick={async () => { const token = getStoredToken(); if (!token) return; setSavingAssetTarget(true); try { const res = await fetch(`${API_BASE}/update-asset-target`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, value: Number(assetTargetInput) || 0 }) }); if (!res.ok) throw new Error("Gagal menyimpan target"); setEditingAssetTarget(false); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated")); } catch (e) { console.error(e); } finally { setSavingAssetTarget(false); } }} className="rounded-lg bg-forest-600 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">{savingAssetTarget ? "..." : "Save"}</button></div> : <p className="mt-1 text-[17px] font-semibold text-forest-900">{assets.target > 0 ? formatRupiah(assets.target) : "Belum diatur"}</p>}
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

          </div>

          <div className="lg:col-span-2 rounded-xl border border-charcoal/8 p-3">
            <p className="mb-1 text-[13px] font-semibold text-forest-900">Asset Composition</p>
            <p className="mb-2 text-[11px] text-charcoal/50">Persentase nominal setiap instrumen dari total aset.</p>
            {assetChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={assetChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} label={({ name, value }) => (String(name).slice(0, 10) + " " + (assetCompositionTotal > 0 ? (Number(value) / assetCompositionTotal * 100).toFixed(1) : "0.0") + "%")} labelLine={false}>
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
          <div className="lg:col-span-2">            {(assets.liquidAssets.length > 0 || isRealData) && (
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
        </div>
      </ChartCard>

      </>}

      {activeReportTab === "cashflow" && <>
        <ChartCard title="Cashflow Tracker" subtitle={"Tren arus kas bulanan " + currentYear + " dibanding " + previousYear + "."}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyComparison} margin={{top:10,right:12,left:0,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/><XAxis dataKey="month" tick={{fontSize:11}}/>
              <YAxis tickFormatter={(v)=>formatCompact(v)} tick={{fontSize:10}} width={48}/><Tooltip formatter={(v:number)=>formatRupiah(v)}/><Legend/>
              <Line type="monotone" dataKey="cashflowCurrent" name={String(currentYear)} stroke="var(--chart-2)" strokeWidth={2.5} dot={{r:3}} connectNulls/>
              <Line type="monotone" dataKey="cashflowPrevious" name={String(previousYear)} stroke="var(--chart-expense)" strokeWidth={2.5} strokeDasharray="5 4" dot={{r:3}} connectNulls/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Cash In Detail" subtitle="Pemasukan per kategori"><div>{incomeRows.length?incomeRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization}/>):<p className="text-sm text-charcoal/45">Belum ada data income.</p>}</div></ChartCard>
          <ChartCard title="Cash Out Detail" subtitle="Pengeluaran per kategori"><div>{expenseRows.length?expenseRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization}/>):<p className="text-sm text-charcoal/45">Belum ada data expense.</p>}</div></ChartCard>
          <ChartCard title="Saving Detail" subtitle="Tabungan per kategori"><div>{savingRows.length?savingRows.map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization}/>):<p className="text-sm text-charcoal/45">Belum ada data saving.</p>}</div></ChartCard>
        </div>
      </>}
      {/* Stock Net Worth hidden in Phase 1 until live market-price data is available. */}

      <AddTransactionModal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        initialMode={transactionMode}
        onAdd={() => {}}
      />
    </div>
  );
}
