import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
const API_BASE = "/api";
import { AlertTriangle, TrendingUp, TrendingDown, PiggyBank, Landmark, Check, Pencil, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { StatCard } from "../components/StatCard";
import { ChartCard, Card } from "../components/Card";
import { BudgetProgressBar, StatusBadge } from "../components/ProgressBar";
import { DataStatusBanner } from "../components/DataStatusBanner";
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
  category,
  allocation,
  realization,
}: {
  category: string;
  allocation: number;
  realization: number;
}) {
  const hasBudget = allocation > 0;
  const pct = usagePercentage(realization, allocation);
  const status = budgetStatus(pct);
  const overBy = pct > 100 ? pct - 100 : 0;
  return (
    <div className="py-3 border-b border-charcoal/8 last:border-0">
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <p className="text-[14px] font-medium">{category}</p>
        {hasBudget ? (
          <StatusBadge status={status} />
        ) : (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-charcoal/5 text-charcoal/50">
            Belum ada budget
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-[12px] text-charcoal/55 mb-1.5">
        <span>
          {formatRupiah(realization)}
          {hasBudget ? ` / ${formatRupiah(allocation)}` : ""}
        </span>
        {hasBudget && <span className="font-medium">{formatPercent(pct)}</span>}
      </div>
      {hasBudget && (
        <>
          <BudgetProgressBar usagePct={pct} />
          {overBy > 0 && (
            <p className="text-[12px] text-rose-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={12} /> {category} sudah melebihi budget sebesar {formatPercent(Math.round(overBy * 10) / 10)}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function DashboardFinance() {
  const { loading, error, isRealData, username, totalIncome, totalExpense, totalSaving, byCategory, assets } = useFinanceData();
  const [manualStocks, setManualStocks] = useState<ManualStock[]>(() => loadManualStocks());
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionMode, setTransactionMode] = useState<"manual" | "ai">("ai");
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

      <section className="bg-white">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Total Income" value={formatRupiah(totalIncome)} icon={TrendingUp} tone="forest" />
          <StatCard label="Total Expense" value={formatRupiah(totalExpense)} icon={TrendingDown} tone="rose" />
          <StatCard label="Net Result" value={formatRupiah(totalIncome-totalExpense)} icon={Landmark} tone="neutral" />
        </div>
        <ChartCard title="Income Statement" subtitle="Perbandingan pendapatan, pengeluaran, dan tabungan bulan ini.">
          <ResponsiveContainer width="100%" height={260}><BarChart data={[{name:"Income",amount:totalIncome},{name:"Expense",amount:totalExpense},{name:"Saving",amount:totalSaving}]} margin={{top:10,right:12,left:0,bottom:4}}><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tickFormatter={(v)=>formatCompact(v)} tick={{fontSize:11}}/><Tooltip formatter={(v:number)=>formatRupiah(v)}/><Bar dataKey="amount" name="Nominal" fill="var(--chart-2)" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
              <div className="rounded-xl bg-white border border-charcoal/8 p-3">
                <p className="text-[11px] text-charcoal/55">Progress ke Target</p>
                <p className="mt-1 text-[17px] font-semibold text-forest-700">{assets.target > 0 ? formatPercent(assetProgress) : "—"}</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Cash In" value={formatRupiah(totalIncome)} icon={TrendingUp} tone="forest" />
          <StatCard label="Cash Out" value={formatRupiah(totalExpense+totalSaving)} icon={TrendingDown} tone="rose" />
          <StatCard label="Net Cashflow" value={formatRupiah(totalIncome-totalExpense-totalSaving)} icon={Landmark} tone="neutral" />
        </div>
        <ChartCard title="Cashflow Tracker" subtitle="Arus kas bersih setelah pengeluaran dan alokasi tabungan.">
          <ResponsiveContainer width="100%" height={260}><BarChart data={[{name:"Cash In",amount:totalIncome},{name:"Expenses",amount:totalExpense},{name:"Savings",amount:totalSaving},{name:"Net Cashflow",amount:totalIncome-totalExpense-totalSaving}]} margin={{top:10,right:12,left:0,bottom:4}}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tickFormatter={(v)=>formatCompact(v)} tick={{fontSize:11}}/><Tooltip formatter={(v:number)=>formatRupiah(v)}/><Bar dataKey="amount" name="Nominal" fill="var(--chart-2)" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
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
