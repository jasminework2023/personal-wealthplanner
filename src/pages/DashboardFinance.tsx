import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
const API_BASE = "/api";
import { AlertTriangle, TrendingUp, TrendingDown, PiggyBank, Landmark, Check, Pencil, Loader2, Trash2, ChevronLeft, ChevronRight, CalendarDays, X, Eye, EyeOff, Wallet, CircleDollarSign, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { StatCard } from "../components/StatCard";
import { ChartCard, Card } from "../components/Card";
import { BudgetProgressBar, StatusBadge } from "../components/ProgressBar";
import { formatRupiah, formatCompact, formatPercent, getAppLanguage } from "../lib/format";
import { usagePercentage, budgetStatus } from "../data/types";
import { useFinanceData, getStoredToken } from "../lib/useFinanceData";
import { useWallets } from "../lib/useWallets";
import { AddItemForm } from "../components/AddItemForm";
import { AddTransactionModal } from "../components/AddTransactionModal";



function EditableAssetItem({
  name,
  value,
  section,
  isRealData,
  sheetRow,
  onDeleted,
  percentage = 0,
}: {
  name: string;
  value: number;
  section: "liquid" | "investment";
  isRealData: boolean;
  sheetRow?: number;
  onDeleted?: () => void;
  percentage?: number;
}) {
  const id = getAppLanguage() === "id";
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(value);
  const [err, setErr] = useState("");

  async function handleSave() {
    const amount = Number(input.replace(/\D/g, ""));
    if (isNaN(amount) || amount < 0) {
      setErr(id ? "Angka tidak valid." : "Invalid amount.");
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
    <div className="flex items-center justify-between gap-2 text-[12px] py-1.5 group">
      <span className="flex min-w-0 items-center gap-2 text-charcoal/70">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${section === "liquid" ? "bg-[#DFF3E7] text-[#0B6B47]" : "bg-[#FCE7EF] text-[#C23A5B]"}`}>
          {section === "liquid" ? <Wallet size={14}/> : <TrendingUp size={14}/>}
        </span>
        <span className="truncate">{name}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-right">
          <span className="block font-semibold tabular-nums text-forest-900">{formatRupiah(saved)}</span>
          <span className="block text-right text-[10px] text-charcoal/45 tabular-nums">{percentage.toFixed(1)}%</span>
        </span>
        {isRealData && (
          <>
            <button onClick={() => { setInput(String(saved)); setEditing(true); }} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-charcoal/40 hover:text-forest-700" title={id ? "Ubah" : "Edit"}>
              <Pencil size={11} />
            </button>
            {sheetRow && <button onClick={async()=>{ if(!window.confirm(`${id ? "Hapus aset" : "Delete asset"} ${name}? ${id ? "Data yang dihapus tidak dapat dikembalikan." : "Deleted data cannot be recovered."}`)) return; const token=getStoredToken(); const res=await fetch(`${API_BASE}/delete-asset-item`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,sheetRow})}); const data=await res.json().catch(()=>({})); if(!res.ok){alert(data.error||(id ? "Gagal menghapus aset" : "Failed to delete asset"));return;} onDeleted?.(); }} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-charcoal/40 hover:text-rose-600" title={id ? "Hapus" : "Delete"}>
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
  category, allocation, realization, kind, showBudget = true, total = 0, showPercentage = false,
}: { category: string; allocation: number; realization: number; kind: "income" | "expense" | "saving"; showBudget?: boolean; total?: number; showPercentage?: boolean }) {
  const hasBudget = showBudget && allocation > 0;
  const pct = usagePercentage(realization, allocation);
  const sharePct = total > 0 ? (realization / total) * 100 : 0;
  const overBy = pct > 100 ? pct - 100 : 0;
  const amountColor = kind === "expense" ? "text-[#F4577A]" : kind === "income" ? "text-[#0B6B47]" : "text-[#FFA24C]";
  const Icon = kind === "income" ? ArrowDownLeft : kind === "expense" ? ArrowUpRight : PiggyBank;
  const iconClass = kind === "income" ? "bg-[#DFF3E7] text-[#0B6B47]" : kind === "expense" ? "bg-[#FDE3EA] text-[#C23A5B]" : "bg-[#FFF0D9] text-[#C47A19]";
  return <div className="py-2.5 border-b border-charcoal/8 last:border-0">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconClass}`}><Icon size={14}/></span>
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-charcoal/80">{category}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-[12px] font-semibold tabular-nums ${amountColor}`}>{formatRupiah(realization)}</p>
        {showPercentage && <p className="mt-0.5 text-[10px] text-charcoal/45 tabular-nums">{sharePct.toFixed(1)}%</p>}
      </div>
    </div>
    {hasBudget && <div className="mt-1.5"><div className="flex items-center justify-between text-[11px] text-charcoal/50 mb-1"><span>Budget {formatRupiah(allocation)}</span></div><BudgetProgressBar usagePct={pct} />{overBy > 0 && <p className="text-[11px] text-rose-600 mt-1"><AlertTriangle size={11} className="inline mr-1" />Melebihi budget {formatPercent(Math.round(overBy * 10) / 10)}</p>}</div>}
  </div>;
}

function StockTracker({
  stocksID,
  stocksUS,
  isRealData,
}: {
  stocksID: { ticker: string; currentPrice: number; shares: number; avgPrice: number; value: number; pl: number }[];
  stocksUS: { ticker: string; currentPrice: number; shares: number; avgPrice: number; value: number; pl: number }[];
  isRealData: boolean;
}) {
  const [market, setMarket] = useState<"ID" | "US">("ID");
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");

  const rows = market === "ID" ? stocksID : stocksUS;
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const pl = rows.reduce((sum, row) => sum + row.pl, 0);

  async function refreshPrices() {
    const token = getStoredToken();
    if (!token) return;
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/asset-tracker-stocks?token=" + encodeURIComponent(token) + "&refresh=1", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui harga saham.");
      window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memperbarui harga saham.");
    } finally {
      setRefreshing(false);
    }
  }

  async function addStock() {
    const token = getStoredToken();
    const q = Number(shares);
    const p = Number(avgPrice);
    const t = ticker.trim().toUpperCase();
    if (!token) return setError("Sesi dashboard tidak ditemukan.");
    if (!t || q <= 0 || p < 0) return setError("Ticker, quantity, dan harga beli wajib diisi.");
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/asset-tracker-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ticker: t, market, shares: q, avgPrice: p, account: account.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan saham.");
      setTicker(""); setShares(""); setAvgPrice(""); setAccount(""); setOpen(false);
      window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan saham.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-forest-100/70 bg-forest-50/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-forest-900">Stock</p>
          <p className="text-[10px] text-charcoal/45">Live price · harga beli · unrealized P/L</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-full bg-white p-0.5 border border-charcoal/8">
            <button type="button" onClick={() => setMarket("ID")} className={market === "ID" ? "rounded-full bg-[#0B4D38] px-2.5 py-1.5 text-[10px] font-semibold text-white" : "rounded-full px-2.5 py-1.5 text-[10px] font-semibold text-charcoal/55"}>🇮🇩 ID</button>
            <button type="button" onClick={() => setMarket("US")} className={market === "US" ? "rounded-full bg-[#0B4D38] px-2.5 py-1.5 text-[10px] font-semibold text-white" : "rounded-full px-2.5 py-1.5 text-[10px] font-semibold text-charcoal/55"}>🇺🇸 US</button>
          </div>
          {isRealData && <button type="button" onClick={() => void refreshPrices()} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/10 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-forest-700 disabled:opacity-50"><RefreshCw size={12} className={refreshing ? "animate-spin" : ""}/> Update</button>}
          {isRealData && <button type="button" onClick={() => { setError(""); setOpen(true); }} className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF7E8] px-2.5 py-1.5 text-[10px] font-bold text-[#0B6B47]"><Plus size={12}/> Tambah</button>}
        </div>
      </div>
      {error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[10px] text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white px-2.5 py-2 border border-charcoal/6">
          <p className="text-[9px] text-charcoal/45">Market Value</p>
          <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-forest-900">{market === "ID" ? formatRupiah(total) : "$" + total.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-lg bg-white px-2.5 py-2 border border-charcoal/6">
          <p className="text-[9px] text-charcoal/45">Unrealized P/L</p>
          <p className={"mt-0.5 text-[13px] font-semibold tabular-nums " + (pl >= 0 ? "text-forest-700" : "text-rose-600")}>{pl >= 0 ? "+" : "−"}{market === "ID" ? formatRupiah(Math.abs(pl)) : "$" + Math.abs(pl).toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
        </div>
      </div>
      {rows.length ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[10px]">
            <thead className="border-b border-charcoal/8 text-[9px] uppercase tracking-wide text-charcoal/40">
              <tr><th className="px-1.5 py-1.5">Ticker</th><th className="px-1.5 py-1.5 text-right">Qty</th><th className="px-1.5 py-1.5 text-right">Buy</th><th className="px-1.5 py-1.5 text-right">Current</th><th className="px-1.5 py-1.5 text-right">Value</th><th className="px-1.5 py-1.5 text-right">P/L</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={market + row.ticker} className="border-b border-charcoal/6 last:border-0">
                  <td className="px-1.5 py-2 font-semibold text-forest-900">{row.ticker}<span className="ml-1 text-[8px] font-normal text-charcoal/40">{market === "ID" ? "IDX" : "US"}</span></td>
                  <td className="px-1.5 py-2 text-right tabular-nums">{row.shares}</td>
                  <td className="px-1.5 py-2 text-right tabular-nums">{market === "ID" ? formatRupiah(row.avgPrice) : "$" + row.avgPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                  <td className="px-1.5 py-2 text-right tabular-nums">{market === "ID" ? formatRupiah(row.currentPrice) : "$" + row.currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                  <td className="px-1.5 py-2 text-right font-semibold tabular-nums">{market === "ID" ? formatRupiah(row.value) : "$" + row.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                  <td className={"px-1.5 py-2 text-right font-semibold tabular-nums " + (row.pl >= 0 ? "text-forest-700" : "text-rose-600")}>{row.pl >= 0 ? "+" : "−"}{market === "ID" ? formatRupiah(Math.abs(row.pl)) : "$" + Math.abs(row.pl).toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="py-5 text-center text-[11px] text-charcoal/40">Belum ada saham {market === "ID" ? "Indonesia" : "US"}.</p>}
      {open && (
        <div className="mt-3 rounded-xl border border-forest-100 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-forest-900">Tambah {market === "ID" ? "Saham Indonesia" : "Saham US"}</p>
            <button type="button" onClick={() => setOpen(false)} className="text-charcoal/40">×</button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder={market === "ID" ? "BBCA" : "AAPL"} className="rounded-lg border border-charcoal/12 px-2.5 py-2 text-[11px] outline-none"/>
            <input value={shares} onChange={(e) => setShares(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={market === "ID" ? "Lot / shares" : "Shares"} inputMode="decimal" className="rounded-lg border border-charcoal/12 px-2.5 py-2 text-[11px] outline-none"/>
            <input value={avgPrice} onChange={(e) => setAvgPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={market === "ID" ? "Harga beli (Rp)" : "Buy price (USD)"} inputMode="decimal" className="rounded-lg border border-charcoal/12 px-2.5 py-2 text-[11px] outline-none"/>
            <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Investment account" className="rounded-lg border border-charcoal/12 px-2.5 py-2 text-[11px] outline-none"/>
          </div>
          <p className="mt-1.5 text-[9px] text-charcoal/40">{market === "ID" ? "Untuk IDX, quantity saat ini disimpan sebagai jumlah saham. Lot → 100 saham akan kita kunci di tahap berikutnya." : "USD dipisahkan dari IDR agar nilai portfolio tidak salah."}</p>
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={() => void addStock()} disabled={refreshing} className="rounded-full bg-[#0B4D38] px-3.5 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{refreshing ? "Menyimpan…" : "Simpan saham"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardFinance() {
  const [language, setLanguage] = useState(getAppLanguage());
  useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const id = language === "id";
  const now = new Date();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [selectedMonth, setSelectedMonth] = useState(monthNames[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [periodOpen, setPeriodOpen] = useState(false);
  const [draftMonth, setDraftMonth] = useState(monthNames[now.getMonth()]);
  const [draftYear, setDraftYear] = useState(now.getFullYear());
  const [assetValuesHidden, setAssetValuesHidden] = useState(false);
  const { loading, error, isRealData, username, totalIncome, totalExpense, totalSaving, byCategory, assets } = useFinanceData(selectedMonth, false, selectedYear);
  const { wallets } = useWallets();
  const historyData = useFinanceData(selectedMonth, true, selectedYear);
  const [activeReportTab, setActiveReportTab] = useState<"income" | "assets" | "cashflow">("income");


  // Liquid assets are derived from the Wallet module so the same balance is not entered twice.
  // Wallet is the source of truth for cash/bank/e-wallet balances; Asset Tracker only aggregates it.
  const liquidAssetsFromWallets = wallets.map((wallet) => ({ name: wallet.name, value: wallet.balance }));
  const integratedLiquidTotal = liquidAssetsFromWallets.reduce((sum, item) => sum + item.value, 0);
  const stockIDTotal = assets.stocksID.reduce((sum, item) => sum + item.value, 0);
  const stockUSTotalIDR = assets.stocksUS.reduce((sum, item) => sum + item.value, 0) * 16300;
  const integratedInvestmentTotal = assets.investmentAssets.reduce((sum, item) => sum + item.value, 0) + stockIDTotal + stockUSTotalIDR;
  const integratedTotalAssets = integratedLiquidTotal + integratedInvestmentTotal;
  const integratedAssetProgress = assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0;

  const assetChartData = [
    ...liquidAssetsFromWallets.map((i) => ({ name: i.name, value: i.value })),
    ...assets.investmentAssets.map((i) => ({ name: i.name, value: i.value })),
    ...(stockIDTotal > 0 ? [{ name: "Saham Indonesia", value: stockIDTotal }] : []),
    ...(stockUSTotalIDR > 0 ? [{ name: "Saham US", value: stockUSTotalIDR }] : []),
  ];
  const assetCompositionTotal = assetChartData.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);

  const incomeRows = byCategory("Income");
  const savingRows = byCategory("Saving");
  const expenseRows = byCategory("Expense");
  const budgetExpensePlan = expenseRows.reduce((s, c) => s + c.allocation, 0);
  const reportTabs = [{ id: "income" as const, label: "Income Statement" }, { id: "assets" as const, label: "Asset Tracker" }, { id: "cashflow" as const, label: "Cashflow Tracker" }];
  const activeTabIndex = reportTabs.findIndex((tab) => tab.id === activeReportTab);
  const selectReportTab = (index: number) => setActiveReportTab(reportTabs[(index + reportTabs.length) % reportTabs.length].id);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <select aria-label="Pilih laporan" value={activeReportTab} onChange={(e) => setActiveReportTab(e.target.value as typeof activeReportTab)} className="min-w-0 flex-1 appearance-none rounded-full border border-forest-100/70 bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-forest-900 shadow-sm outline-none">
          <option value="income">Income Statement</option><option value="assets">Asset Tracker</option><option value="cashflow">Cashflow Tracker</option>
        </select>
        <button type="button" onClick={() => { setDraftMonth(selectedMonth); setDraftYear(selectedYear); setPeriodOpen(true); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-forest-100/70 bg-white px-3.5 py-2.5 text-[12.5px] font-semibold text-forest-900 shadow-sm">
          <CalendarDays size={15} className="shrink-0 text-forest-700" /><span>{monthNames[monthNames.indexOf(selectedMonth)] || selectedMonth} {selectedYear}</span><ChevronRight size={14} className="rotate-90 text-charcoal/50" />
        </button>
      </div>
      {periodOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setPeriodOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="finance-period-title" className="w-full max-w-md rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl">
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



      {activeReportTab === "income" && (() => {
        const monthIndex = monthNames.indexOf(selectedMonth);
        const previousMonth = monthNames[(monthIndex + 11) % 12];
        const previousYear = monthIndex === 0 ? selectedYear - 1 : selectedYear;
        const previousTransactions = historyData.transactions.filter((t) => String(t.month || "").toLowerCase() === previousMonth.toLowerCase() && Number(t.year || (t.date?.split("/")?.[2] ?? selectedYear)) === previousYear);
        const previousIncome = previousTransactions.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
        const previousExpense = previousTransactions.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
        const incomeChange = previousIncome > 0 ? ((totalIncome - previousIncome) / previousIncome) * 100 : null;
        const expenseChange = previousExpense > 0 ? ((totalExpense - previousExpense) / previousExpense) * 100 : null;
        const surplus = totalIncome - totalExpense;
        const surplusDigits = String(Math.round(Math.abs(surplus))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return <section className="report-summary-card rounded-[14px] bg-gradient-to-br from-[#0B4D38] to-[#063526] p-4 text-white shadow-float dark:from-[#0B4D38] dark:to-[#063526]">
          <p className="text-[14px] font-semibold text-white/75">{surplus >= 0 ? "Total Surplus" : "Total Defisit"}</p>
          <div className="mt-1 flex min-w-0 items-baseline gap-1 whitespace-nowrap">
            <span className="shrink-0 text-[14px] font-semibold leading-tight text-white/75">Rp</span>
            <span className="report-headline-amount min-w-0 font-extrabold leading-tight tracking-[-0.6px] tabular-nums" style={{color: surplus < 0 ? "#FF5C7A" : "#FFFFFF"}}>{surplus < 0 ? "-" : ""}{surplusDigits}</span>
          </div>
          <div className="mt-[14px] grid grid-cols-2 gap-[10px]">
            {[
              { key: "income", label: "Income", value: totalIncome, change: incomeChange, Icon: ArrowDownLeft, iconClass: "bg-[#DFF3E7] text-[#0B6B47]", changeColor: incomeChange === null ? undefined : incomeChange >= 0 ? "#0B6B47" : "#C23A5B" },
              { key: "expense", label: "Expense", value: totalExpense, change: expenseChange, Icon: ArrowUpRight, iconClass: "bg-[#FDE3EA] text-[#C23A5B]", changeColor: expenseChange === null ? undefined : expenseChange >= 0 ? "#C23A5B" : "#0B6B47" },
            ].map((item) => <div key={item.key} className="min-w-0 rounded-2xl bg-white/10 p-3 dark:bg-white/10">
              <div className="flex min-w-0 items-center justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${item.iconClass}`}><item.Icon size={16}/></span>
                  <span className="truncate text-[13px] text-white/70">{item.label}</span>
                </div>
                {item.change !== null && <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{color:item.changeColor}}>{item.change >= 0 ? "+" : ""}{item.change.toFixed(1)}%</span>}
              </div>
              <p className="mt-2 whitespace-nowrap text-[clamp(16px,4.6vw,21px)] font-bold leading-tight tracking-[-0.2px] text-white tabular-nums">{formatRupiah(item.value)}</p>
            </div>)}
          </div>
        </section>;
      })()}
      {activeReportTab === "income" && <>
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <ChartCard title={id ? "Tren Pemasukan & Pengeluaran" : "Income & Expense Trends"} subtitle={id ? "Perubahan dari bulan ke bulan pada tahun terpilih." : "Month-to-month changes for the selected year."}>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={250}><LineChart data={monthNames.map((month) => {
                const rows = historyData.transactions.filter((t) => String(t.month || "").toLowerCase() === month.toLowerCase() && Number(t.year || (t.date?.split("/")?.[2] ?? selectedYear)) === selectedYear);
              const previousRows = historyData.transactions.filter((t) => String(t.month || "").toLowerCase() === month.toLowerCase() && Number(t.year || (t.date?.split("/")?.[2] ?? 0)) === selectedYear - 1);
                return { month: month.slice(0, 3), income: rows.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0), expense: rows.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0), previousIncome: previousRows.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0), previousExpense: previousRows.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0) };
              })} margin={{top:10,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/><XAxis dataKey="month" tick={{fontSize:10}} axisLine={false} tickLine={false}/><YAxis width={48} tickFormatter={(v)=>formatCompact(v)} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(v:number)=>formatRupiah(v)}/><Line type="monotone" dataKey="income" name={id ? "Pemasukan" : "Income"} stroke="#39FF88" strokeWidth={2.5} dot={{r:3}} activeDot={{r:5}}/><Line type="monotone" dataKey="expense" name={id ? "Pengeluaran" : "Expense"} stroke="#FF72B6" strokeWidth={2.5} dot={{r:3}} activeDot={{r:5}}/><Line type="monotone" dataKey="previousIncome" name={id ? "Pemasukan tahun lalu" : "Income last year"} stroke="#9D83FF" strokeWidth={2} strokeDasharray="5 4" dot={false}/><Line type="monotone" dataKey="previousExpense" name={id ? "Pengeluaran tahun lalu" : "Expense last year"} stroke="#F59BB8" strokeWidth={2} strokeDasharray="5 4" dot={false}/></LineChart></ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-charcoal/65"><span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 bg-[#39FF88]"/> {id ? "Pemasukan" : "Income"}</span><span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 bg-[#FF72B6]"/> {id ? "Pengeluaran" : "Expense"}</span></div>
            </div>
          </ChartCard>
          <ChartCard title={id ? "Detail per Kategori" : "Category Details"} subtitle={id ? "Rincian pemasukan dan pengeluaran pada periode terpilih." : "Income and expenses for the selected period."}>
            <div className="mb-4">
              <p className="mb-1.5 inline-flex items-center gap-2 text-[12px] font-semibold text-forest-800"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#DFF3E7] text-[#0B6B47]"><Wallet size={13}/></span>{id ? "Pemasukan" : "Income"}</p>
              {incomeRows.length ? incomeRows.slice(0, showAllCategories ? incomeRows.length : 4).map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} total={totalIncome} showPercentage kind="income" showBudget={false}/>) : <p className="py-2 text-[12px] text-charcoal/45">{id ? "Belum ada data pemasukan." : "No income data yet."}</p>}
            </div>
            <div className="my-3 h-px bg-charcoal/10"/>
            <div>
              <p className="mb-1.5 inline-flex items-center gap-2 text-[12px] font-semibold text-forest-800"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FDE3EA] text-[#C23A5B]"><CircleDollarSign size={13}/></span>{id ? "Pengeluaran" : "Expense"}</p>
              {expenseRows.length ? expenseRows.slice(0, showAllCategories ? expenseRows.length : 4).map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} total={totalExpense} showPercentage kind="expense" showBudget={false}/>) : <p className="py-2 text-[12px] text-charcoal/45">{id ? "Belum ada data pengeluaran." : "No expense data yet."}</p>}
            </div>
            {(incomeRows.length > 4 || expenseRows.length > 4) && <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => setShowAllCategories((value) => !value)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-forest-700 hover:bg-forest-50">
                {showAllCategories ? (id ? "Tampilkan lebih sedikit" : "Show less") : (id ? "Lihat semua kategori" : "View all categories")} <ChevronRight size={14} className={showAllCategories ? "rotate-90" : ""}/>
              </button>
            </div>}
          </ChartCard>
        </div>
      </>}
      
      {activeReportTab === "assets" && <>
        {/* Asset Tracker: two reference cards only */}
        <div className="mb-4 rounded-[16px] bg-[linear-gradient(145deg,#29FBA3_0%,#09C679_45%,#009D5E_100%)] p-4 text-[#03140C] shadow-[0_12px_32px_rgba(12,203,125,0.30)] dark:shadow-[0_0_38px_rgba(12,203,125,0.28),0_12px_32px_rgba(12,203,125,0.32)]">
          <p className="text-[13px] font-bold text-[#03140C]/90">Total aset</p>
          <p className="asset-tracker-total-value mt-1 whitespace-nowrap font-extrabold leading-[1.1] tracking-[-0.02em] tabular-nums">{assetValuesHidden ? "Rp ••••••••" : formatRupiah(integratedTotalAssets)}</p>
          <p className="mt-1 text-[13px] font-normal text-[#03140C]/75">{assets.target > 0 ? `${formatPercent(integratedAssetProgress)} dari target aset` : "Target aset belum diatur"}</p>
          <div className="mt-2 h-[6px] w-full overflow-hidden rounded-full bg-[#03140C]/15">
            <div className="h-full rounded-full bg-[#03140C]" style={{ width: `${Math.min(Math.max(integratedAssetProgress, 0), 100)}%` }} />
          </div>
          <div className="mt-3 flex min-h-[56px] items-center justify-between gap-3 rounded-[14px] bg-[linear-gradient(90deg,#10BC76_0%,#008E55_100%)] px-4 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-normal text-[#03140C]/75">Target aset</p>
              {editingAssetTarget ? (
                <div className="mt-1 flex gap-2">
                  <input inputMode="numeric" value={assetTargetInput} onChange={(e) => setAssetTargetInput(e.target.value.replace(/[^0-9]/g, ""))} className="min-w-0 w-full rounded-lg border border-[#03140C]/20 bg-white/80 px-2 py-1 text-[14px] text-[#03140C] outline-none" placeholder="Target aset" />
                  <button type="button" disabled={savingAssetTarget} onClick={async () => { const token = getStoredToken(); if (!token) return; setSavingAssetTarget(true); try { const res = await fetch(`${API_BASE}/update-asset-target`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, value: Number(assetTargetInput) || 0 }) }); if (!res.ok) throw new Error("Gagal menyimpan target"); setEditingAssetTarget(false); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated")); } catch (e) { console.error(e); } finally { setSavingAssetTarget(false); } }} className="shrink-0 rounded-lg bg-[#03140C] px-2 py-1 text-[12px] font-bold text-white disabled:opacity-50">{savingAssetTarget ? "..." : "Simpan"}</button>
                </div>
              ) : (
                <p className="mt-0.5 whitespace-nowrap text-[17px] font-bold leading-tight tabular-nums">{assets.target > 0 ? (assetValuesHidden ? "Rp ••••••••" : formatRupiah(assets.target)) : "Belum diatur"}</p>
              )}
            </div>
            {isRealData && !editingAssetTarget && <button type="button" onClick={() => { setAssetTargetInput(String(Math.round(assets.target || 0))); setEditingAssetTarget(true); }} className="shrink-0 self-center text-[15px] font-bold underline underline-offset-2">Edit</button>}
          </div>
        </div>

        <div className="rounded-[16px] border border-[#E4E6E8] bg-white p-4 text-[#111815] shadow-[0_2px_8px_rgba(17,24,21,0.025)] dark:border-[#25252C] dark:bg-[#131316] dark:text-white dark:shadow-none">
          <p className="text-[17px] font-bold leading-tight">Komposisi Aset</p>
          {assetChartData.length > 0 ? (
            <div className="mt-3 flex flex-col items-center">
              <div className="h-[148px] w-[148px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={43} outerRadius={68} paddingAngle={1.5} stroke="none" cornerRadius={4}>
                      {assetChartData.map((_, i) => (
                        <Cell key={i} fill={["#0F9D6B","#FFC815","#6EE7B7","#9CA3AF","#4B5563"][i % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatRupiah(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 w-full space-y-2 border-t border-[#E4E6E8] pt-3 dark:border-[#25252C]">
                {assetChartData.map((item, i) => (
                  <div key={item.name} className="flex min-h-[22px] items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ["#0F9D6B","#FFC815","#6EE7B7","#9CA3AF","#4B5563"][i % 5] }} />
                    <span className="min-w-0 flex-1 text-[13px] font-normal leading-[20px]">{item.name}</span>
                    <span className="shrink-0 text-[13px] font-bold leading-[20px] tabular-nums">{assetCompositionTotal > 0 ? ((item.value / assetCompositionTotal) * 100).toFixed(1).replace(".", ",") : "0,0"}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-[13px] text-charcoal/50">Belum ada data aset.</p>
          )}
        </div>
      </>}

      {activeReportTab === "assets" && <>
        <div className="mt-4">
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[14px] font-semibold text-forest-900">Detail Aset</p>
              {(liquidAssetsFromWallets.length > 2 || assets.investmentAssets.length > 2) && <button type="button" onClick={() => setShowAllAssets((v) => !v)} className="text-[12px] font-semibold text-forest-700">{showAllAssets ? "Sembunyikan" : "Lihat semua"} <ChevronRight size={14} className={showAllAssets ? "rotate-90 inline" : "inline"}/></button>}
            </div>
            {(liquidAssetsFromWallets.length > 0 || isRealData) && <div className="mb-3">
              <p className="mb-1.5 text-[13px] font-medium uppercase tracking-wide text-charcoal/60">Liquid Assets</p>
              {liquidAssetsFromWallets.slice(0, showAllAssets ? liquidAssetsFromWallets.length : 2).map((item) => <EditableAssetItem key={item.name} name={item.name} value={item.value} percentage={assetCompositionTotal > 0 ? item.value / assetCompositionTotal * 100 : 0} section="liquid" isRealData={isRealData} />)}
              <p className="mt-2 text-[11px] text-charcoal/45">Saldo Liquid Asset mengikuti Wallet secara otomatis.</p>
            </div>}
            {(assets.investmentAssets.length > 0 || isRealData) && <div>
               <p className="mb-1.5 text-[13px] font-medium uppercase tracking-wide text-charcoal/60">Investment Assets</p>
               {assets.investmentAssets.slice(0, showAllAssets ? assets.investmentAssets.length : 2).map((item) => <EditableAssetItem key={`${item.name}-${item.sheetRow||0}`} name={item.name} value={item.value} percentage={integratedTotalAssets > 0 ? item.value / integratedTotalAssets * 100 : 0} section="investment" sheetRow={item.sheetRow} isRealData={isRealData} onDeleted={() => window.location.reload()} />)}
               {isRealData && <AddItemForm placeholder="Tambah investment asset baru" onSubmit={async (name, amount) => { const token = getStoredToken(); const res = await fetch(`${API_BASE}/add-asset-item`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, section: "investment", name, value: amount }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Gagal menambah item"); window.location.reload(); }} />}
               <StockTracker stocksID={assets.stocksID} stocksUS={assets.stocksUS} isRealData={isRealData} />
             </div>}
          </Card>
        </div>
      </>}
      {activeReportTab === "cashflow" && <>
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
          const previousSaving = previousTransactions.filter((t) => t.type === "Saving").reduce((sum, t) => sum + t.amount, 0);
          const netCashflow = totalIncome - totalExpense - totalSaving;
          const previousNetCashflow = previousIncome - previousExpense - previousSaving;
          const trend = previousTransactions.length > 0 && previousNetCashflow !== 0
            ? ((netCashflow - previousNetCashflow) / Math.abs(previousNetCashflow)) * 100
            : null;
          const netDigits = String(Math.round(Math.abs(netCashflow))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
          return <div className="report-summary-card rounded-[14px] bg-gradient-to-br from-[#BDF7DF] to-[#61E5AC] p-4 text-[#071B12] dark:from-[#BDF7DF] dark:to-[#61E5AC]">
            <p className="text-[14px] font-semibold text-[#53697A]">Net cashflow</p>
            <div className="mt-1 flex min-w-0 items-baseline gap-1 whitespace-nowrap">
              <span className="shrink-0 text-[14px] font-semibold leading-tight text-[#53697A]">Rp</span>
              <span className="report-headline-amount min-w-0 font-extrabold leading-tight tracking-[-0.6px] text-[#123524] tabular-nums">{netCashflow < 0 ? "-" : ""}{netDigits}</span>
            </div>
            {trend !== null && <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#123524]/[0.12] px-2.5 py-1 text-[12px] font-medium text-[#123524]"><span>{trend >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}</span><span>{trend >= 0 ? "+" : ""}{Math.round(trend)}% dari bulan lalu</span></div>}
            <div className="mt-[14px] grid grid-cols-2 gap-[10px]">
              <div className="min-w-0 rounded-2xl bg-black/[0.08] p-3 dark:bg-black/10">
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DFF3E7] text-[#0B6B47]"><ArrowDownLeft size={16}/></span><span className="text-[13px] text-[#6B7B70]">Cash in</span></div>
                <p className="mt-2 whitespace-nowrap text-[clamp(17px,4.7vw,21px)] font-bold leading-tight tracking-[-0.2px] text-[#123524] tabular-nums">{formatRupiah(totalIncome)}</p>
              </div>
              <div className="min-w-0 rounded-2xl bg-black/[0.08] p-3 dark:bg-black/10">
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FDE3EA] text-[#C23A5B]"><ArrowUpRight size={16}/></span><span className="text-[13px] text-[#6B7B70]">Cash out</span></div>
                <p className="mt-2 whitespace-nowrap text-[clamp(16px,4.4vw,20px)] font-bold leading-tight tracking-[-0.2px] text-[#123524] tabular-nums">{formatRupiah(totalExpense+totalSaving)}</p>
              </div>
            </div>
          </div>;
        })()}
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <ChartCard title={id ? "Pelacak Arus Kas" : "Cashflow Tracker"} subtitle={id ? "Arus kas keluar mencakup pengeluaran dan tabungan." : "Cash out includes expenses and savings."}>
            <ResponsiveContainer width="100%" height={250}><LineChart data={monthNames.map((month) => {
              const rows = historyData.transactions.filter((t) => String(t.month || "").toLowerCase() === month.toLowerCase() && Number(t.year || (t.date?.split("/")?.[2] ?? selectedYear)) === selectedYear);
              const previousRows = historyData.transactions.filter((t) => String(t.month || "").toLowerCase() === month.toLowerCase() && Number(t.year || (t.date?.split("/")?.[2] ?? 0)) === selectedYear - 1);
              const income = rows.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
              const expense = rows.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
              const saving = rows.filter((t) => t.type === "Saving").reduce((sum, t) => sum + t.amount, 0);
              const previousIncome = previousRows.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
              const previousExpense = previousRows.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
              const previousSaving = previousRows.filter((t) => t.type === "Saving").reduce((sum, t) => sum + t.amount, 0);
              return { month: month.slice(0, 3), cashIn: income, cashOut: expense + saving, net: income - expense - saving, previousCashIn: previousIncome, previousCashOut: previousExpense + previousSaving, previousNet: previousIncome - previousExpense - previousSaving };
            })} margin={{top:10,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/><XAxis dataKey="month" tick={{fontSize:10}} axisLine={false} tickLine={false}/><YAxis width={44} tickFormatter={(v)=>formatCompact(v)} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(v:number)=>formatRupiah(v)}/><Line type="monotone" dataKey="cashIn" name={id ? "Kas masuk" : "Cash in"} stroke="#39FF88" strokeWidth={2.5} dot={{r:3}}/><Line type="monotone" dataKey="cashOut" name={id ? "Kas keluar" : "Cash out"} stroke="#FF72B6" strokeWidth={2.5} dot={{r:3}}/><Line type="monotone" dataKey="net" name={id ? "Arus kas bersih" : "Net cashflow"} stroke="#FFA24C" strokeWidth={2.5} dot={{r:3}}/><Line type="monotone" dataKey="previousCashIn" name={id ? "Kas masuk tahun lalu" : "Cash in last year"} stroke="#9D83FF" strokeWidth={2} strokeDasharray="5 4" dot={false}/><Line type="monotone" dataKey="previousCashOut" name={id ? "Kas keluar tahun lalu" : "Cash out last year"} stroke="#F59BB8" strokeWidth={2} strokeDasharray="5 4" dot={false}/><Line type="monotone" dataKey="previousNet" name={id ? "Arus kas bersih tahun lalu" : "Net cashflow last year"} stroke="#7A8794" strokeWidth={2} strokeDasharray="5 4" dot={false}/></LineChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title={id ? "Detail Arus Kas" : "Cashflow Details"} subtitle={id ? "Rincian sesuai periode yang dipilih." : "Category breakdown for the selected period."}>
            <div className="mb-4">
              <p className="mb-1.5 inline-flex items-center gap-2 text-[12px] font-semibold text-forest-800"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#DFF3E7] text-[#0B6B47]"><ArrowDownLeft size={13}/></span>{id ? "Pemasukan" : "Cash in"}</p>
              {incomeRows.length ? incomeRows.slice(0, showAllCategories ? incomeRows.length : 4).map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} total={totalIncome} showPercentage kind="income" showBudget={false}/>) : <p className="py-2 text-[12px] text-charcoal/45">{id ? "Belum ada data pemasukan." : "No income data yet."}</p>}
            </div>
            <div className="my-3 h-px bg-charcoal/10"/>
            <div className="mb-4">
              <p className="mb-1.5 inline-flex items-center gap-2 text-[12px] font-semibold text-forest-800"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FDE3EA] text-[#C23A5B]"><ArrowUpRight size={13}/></span>{id ? "Pengeluaran" : "Cash out"}</p>
              {expenseRows.length ? expenseRows.slice(0, showAllCategories ? expenseRows.length : 4).map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} total={totalExpense} showPercentage kind="expense" showBudget={false}/>) : <p className="py-2 text-[12px] text-charcoal/45">{id ? "Belum ada data pengeluaran." : "No expense data yet."}</p>}
            </div>
            <div className="my-3 h-px bg-charcoal/10"/>
            <div>
              <p className="mb-1.5 inline-flex items-center gap-2 text-[12px] font-semibold text-forest-800"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FFF0D9] text-[#C47A19]"><PiggyBank size={13}/></span>{id ? "Tabungan" : "Savings"}</p>
              {savingRows.length ? savingRows.slice(0, showAllCategories ? savingRows.length : 4).map((row)=><BudgetRow key={row.category} category={row.category} allocation={row.allocation} realization={row.realization} total={totalSaving} showPercentage kind="saving" showBudget={false}/>) : <p className="py-2 text-[12px] text-charcoal/45">{id ? "Belum ada data tabungan." : "No savings data yet."}</p>}
            </div>
            {(incomeRows.length > 4 || expenseRows.length > 4 || savingRows.length > 4) && <div className="mt-3 flex justify-end">
              <button type="button" onClick={() => setShowAllCategories((value) => !value)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-forest-700 hover:bg-forest-50">
                {showAllCategories ? (id ? "Tampilkan lebih sedikit" : "Show less") : (id ? "Lihat semua kategori" : "View all categories")} <ChevronRight size={14} className={showAllCategories ? "rotate-90" : ""}/>
              </button>
            </div>}
          </ChartCard>
        </div>
      </>}
      {/* Stock Net Worth hidden in Phase 1 until live market-price data is available. */}

    </div>
  );
}
