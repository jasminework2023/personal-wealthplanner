import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
const API_BASE = "/api";
import { AlertTriangle, TrendingUp, TrendingDown, PiggyBank, Landmark, Check, Pencil, Loader2, Trash2, ChevronLeft, ChevronRight, CalendarDays, X, Eye, EyeOff, Wallet, CircleDollarSign, ArrowDownLeft, ArrowUpRight, RefreshCw, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StatCard } from "../components/StatCard";
import { ChartCard, Card } from "../components/Card";
import { BudgetProgressBar, StatusBadge } from "../components/ProgressBar";
import { formatRupiah, formatCompact, formatPercent, getAppLanguage } from "../lib/format";
import { usagePercentage, budgetStatus } from "../data/types";
import { useFinanceData, getStoredToken, type AssetTarget } from "../lib/useFinanceData";
import { useWallets } from "../lib/useWallets";
import { AddItemForm } from "../components/AddItemForm";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { AssetListSection, AssetListItem } from "../components/AssetListSection";
import { AssetTrackerManaged } from "../components/AssetTrackerManaged";



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
  investmentAccounts,
  stocksTotal,
  totalAssets,
  usdIdrRate,
  assetsVisible,
  showInvestmentStockBanner = false,
}: {
  stocksID: { ticker: string; currentPrice: number; shares: number; avgPrice: number; value: number; pl: number; account?: string }[];
  stocksUS: { ticker: string; currentPrice: number; shares: number; avgPrice: number; value: number; pl: number; account?: string }[];
  isRealData: boolean;
  investmentAccounts: { name: string; balance: number }[];
  stocksTotal: number;
  totalAssets: number;
  usdIdrRate: number;
  assetsVisible: boolean;
  showInvestmentStockBanner?: boolean;
}) {
  const [market, setMarket] = useState<"ID" | "US">("ID");
  const isId = getAppLanguage() === "id";
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState<{ ticker: string; market: "ID" | "US" } | null>(null);
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [account, setAccount] = useState("");
  const [saveMode, setSaveMode] = useState<"set" | "buy" | null>(null);
  const [error, setError] = useState("");

  const rows = market === "ID" ? stocksID : stocksUS;
  const totalIDR = stocksID.reduce((sum, row) => sum + row.value, 0);
  const totalUSIDR = stocksUS.reduce((sum, row) => sum + row.value, 0) * usdIdrRate;
  const total = totalIDR + totalUSIDR;
  const plIDR = stocksID.reduce((sum, row) => sum + row.pl, 0);
  const plUSIDR = stocksUS.reduce((sum, row) => sum + row.pl, 0) * usdIdrRate;
  const pl = plIDR + plUSIDR;
  const totalInvestmentIDR = stocksID.reduce((sum, row) => sum + row.avgPrice * row.shares, 0);
  const totalInvestmentUSIDR = stocksUS.reduce((sum, row) => sum + row.avgPrice * row.shares, 0) * usdIdrRate;
  const totalInvestment = totalInvestmentIDR + totalInvestmentUSIDR;
  const plPct = totalInvestment > 0 ? (pl / totalInvestment) * 100 : 0;

  const formatStockPrice = (value: number) =>
    market === "ID"
      ? formatRupiah(value)
      : "$" + value.toLocaleString("en-US", { maximumFractionDigits: 2 });

  const formatStockMoney = (value: number) =>
    market === "ID"
      ? formatRupiah(value)
      : "$" + Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

  const formatPL = (value: number) =>
    (value >= 0 ? "+" : "−") + formatStockMoney(value);
  const hiddenStockMoney = "••••••";
  const quantityLabel = (shares: number) =>
    market === "ID"
      ? (shares / 100).toLocaleString("id-ID") + " lot"
      : shares.toLocaleString("en-US") + " saham";

  function resetForm() {
    setTicker("");
    setQuantity("");
    setAvgPrice("");
    setAccount("");
    setSaveMode(null);
    setEditing(null);
    setOpen(false);
  }

  function openAdd() {
    setError("");
    setEditing(null);
    setTicker("");
    setQuantity("");
    setAvgPrice("");
    setAccount("");
    setSaveMode(null);
    setOpen(true);
  }

  function openEdit(row: { ticker: string; shares: number; avgPrice: number; account?: string }) {
    setError("");
    setEditing({ ticker: row.ticker, market });
    setTicker(row.ticker);
    setQuantity(String(market === "ID" ? row.shares / 100 : row.shares));
    setAvgPrice(String(row.avgPrice));
    setAccount(row.account || "");
    setSaveMode("set");
    setOpen(true);
  }

  function findExistingTicker() {
    const normalized = ticker.trim().toUpperCase();
    return rows.find((row) => row.ticker.trim().toUpperCase() === normalized);
  }

  async function saveStock(mode: "set" | "buy") {
    const token = getStoredToken();
    const enteredQuantity = Number(quantity);
    const shares = market === "ID" ? enteredQuantity * 100 : enteredQuantity;
    const p = Number(avgPrice);
    const t = ticker.trim().toUpperCase();

    if (!token) return setError("Sesi dashboard tidak ditemukan.");
    if (!t || enteredQuantity <= 0 || !Number.isFinite(p) || p < 0) {
      return setError("Ticker, jumlah, dan harga beli wajib diisi.");
    }
    if (!account.trim()) return setError("Pilih investment account.");
    if (editing && (t !== editing.ticker || market !== editing.market)) {
      return setError("Ticker dan market tidak dapat diubah saat edit.");
    }

    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/asset-tracker-stocks", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ticker: t,
          market,
          shares,
          avgPrice: p,
          account: account.trim(),
          ...(editing ? {} : { mode }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan saham.");
      resetForm();
      window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan saham.");
    } finally {
      setRefreshing(false);
    }
  }

  async function deleteStock(row: { ticker: string }) {
    if (!window.confirm(`Hapus saham ${row.ticker} dari portfolio?\n\nTotal Aset ikut berkurang.`)) return;
    const token = getStoredToken();
    if (!token) {
      setError("Sesi dashboard tidak ditemukan.");
      return;
    }
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/asset-tracker-stocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ticker: row.ticker, market }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menghapus saham.");
      window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus saham.");
    } finally {
      setRefreshing(false);
    }
  }

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

  return (
    <AssetListSection
      title={isId ? "Portofolio Saham" : "Stock Portfolio"}
      infoText="Memengaruhi Total Aset"
      totalValue={assetsVisible ? formatRupiah(total) : "Rp " + hiddenStockMoney}
      totalChangePercent={plPct}
      onAdd={undefined}
      open={!collapsed}
      onToggle={() => setCollapsed((value) => !value)}
    >
      <div className="mx-4 mt-4 flex items-center justify-between gap-3 px-0 text-[rgb(var(--c-up))] sm:mx-5">
        <p className="min-w-0 truncate text-[12px]">Pembelian saham mengurangi saldo rekening melalui Transaction Tracker.</p>
        <a href="/dashboard/transactions" className="shrink-0 text-[12px] font-semibold underline underline-offset-2">Buka Transaction Tracker →</a>
      </div>

      <div className="px-4 pt-4 sm:px-5">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="min-w-0 rounded-[14px] bg-[rgb(var(--c-cream))] px-3 py-2.5">
            <p className="text-[10px] font-medium text-[rgb(var(--c-muted))]">Total modal</p>
            <p className="mt-1 truncate text-[14px] font-bold tabular-nums">{assetsVisible ? formatRupiah(totalInvestment) : "Rp ••••••"}</p>
          </div>
          <div className="min-w-0 rounded-[14px] bg-[rgb(var(--c-cream))] px-3 py-2.5">
            <p className="text-[10px] font-medium text-[rgb(var(--c-muted))]">Untung/rugi</p>
            <p className={"mt-1 truncate text-[14px] font-bold tabular-nums " + (pl >= 0 ? "text-[rgb(var(--c-up))]" : "text-[rgb(var(--c-down))]")}>
              {assetsVisible ? formatRupiah(pl) : "Rp ••••••"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 sm:px-5">
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-1 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] p-1">
            <button type="button" aria-pressed={market === "ID"} onClick={() => setMarket("ID")} className={`min-h-11 min-w-[56px] rounded-full px-3 text-[11px] font-semibold ${market === "ID" ? "bg-[rgb(var(--c-forest-700))] text-white" : "text-[rgb(var(--c-muted))]"}`}>ID</button>
            <button type="button" aria-pressed={market === "US"} onClick={() => setMarket("US")} className={`min-h-11 min-w-[56px] rounded-full px-3 text-[11px] font-semibold ${market === "US" ? "bg-[rgb(var(--c-forest-700))] text-white" : "text-[rgb(var(--c-muted))]"}`}>US</button>
          </div>
          {isRealData && (
            <button type="button" onClick={() => void refreshPrices()} disabled={refreshing} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[rgb(var(--c-cream))] px-3 text-[11px] font-semibold text-[rgb(var(--c-up))] disabled:opacity-50">
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""}/> Update
            </button>
          )}
        </div>
      </div>

      {error && <p className="mx-4 mb-2 rounded-lg bg-[rgb(var(--c-rose-50))] px-2.5 py-2 text-[11px] text-[rgb(var(--c-down))] sm:mx-5">{error}</p>}

      {showInvestmentStockBanner && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-[12px] bg-[rgb(var(--c-forest-50))] px-3 py-2.5 text-[rgb(var(--c-up))] sm:mx-5">
          <p className="min-w-0 text-[11px] leading-relaxed">Ada baris 'Saham' di Investment Assets yang tidak dihitung. Tambahkan saham satu per satu di Stock Portfolio.</p>
          {isRealData && <button type="button" onClick={openAdd} className="shrink-0 rounded-full bg-[rgb(var(--c-surface))] px-2.5 py-1.5 text-[10px] font-bold text-[rgb(var(--c-up))]">+ Tambah</button>}
        </div>
      )}

      {rows.length ? (
        <div className="border-t border-[rgb(var(--c-border))]">
          {rows.map((row) => {
            const pct = row.avgPrice * row.shares > 0 ? (row.pl / (row.avgPrice * row.shares)) * 100 : 0;
            return (
              <div key={market + row.ticker} className="border-b border-[rgb(var(--c-border))] last:border-0">
                <AssetListItem
                  icon={<TrendingUp size={18} strokeWidth={2.2} />}
                  name={row.ticker}
                  subtitle={`Saham · Auto · ${row.ticker}`}
                  value={assetsVisible ? formatStockMoney(row.value) : (market === "ID" ? "Rp " + hiddenStockMoney : "$" + hiddenStockMoney)}
                  changePercent={pct}
                  onClick={isRealData ? () => openEdit(row) : undefined}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-4 pb-5 pt-3 text-center text-[11px] text-[rgb(var(--c-muted))]">Belum ada saham {market === "ID" ? "Indonesia" : "US"}.</p>
      )}

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="w-full max-w-lg rounded-t-[22px] border border-forest-100 bg-white p-4 shadow-2xl dark:border-[#2B332F] dark:bg-[#151A17] sm:rounded-[18px]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-forest-900">{editing ? `Edit ${editing.ticker}` : `Tambah ${market === "ID" ? "Saham Indonesia" : "Saham US"}`}</p>
              <button type="button" aria-label="Tutup" onClick={resetForm} className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal/40 hover:bg-charcoal/5">×</button>
            </div>

            {!editing && <p className="mt-1 text-[10px] text-charcoal/45">Untuk saham yang sudah kamu miliki sebelumnya. Pembelian baru lebih baik dicatat lewat Transaksi.</p>}

            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              <label className="text-[10px] text-charcoal/55">
                Ticker
                <input disabled={!!editing} value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder={market === "ID" ? "BBCA" : "AAPL"} className="mt-1 w-full rounded-lg border border-charcoal/12 px-2.5 py-2 text-[12px] outline-none disabled:bg-charcoal/[0.04]"/>
              </label>
              <label className="text-[10px] text-charcoal/55">
                Jumlah {market === "ID" ? "(lot)" : "(saham)"}
                <input value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={market === "ID" ? "5" : "10"} inputMode="decimal" className="mt-1 w-full rounded-lg border border-charcoal/12 px-2.5 py-2 text-[12px] outline-none"/>
              </label>
              <label className="text-[10px] text-charcoal/55">
                Harga beli {market === "ID" ? "(Rp)" : "(USD)"}
                <input value={avgPrice} onChange={(e) => setAvgPrice(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={market === "ID" ? "9200" : "195.20"} inputMode="decimal" className="mt-1 w-full rounded-lg border border-charcoal/12 px-2.5 py-2 text-[12px] outline-none"/>
              </label>
              <label className="text-[10px] text-charcoal/55">
                Investment account
                <select value={account} onChange={(e) => setAccount(e.target.value)} className="mt-1 w-full rounded-lg border border-charcoal/12 bg-white px-2.5 py-2 text-[12px] outline-none">
                  <option value="">Pilih akun investment</option>
                  {investmentAccounts.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                </select>
              </label>
            </div>

            {!editing && findExistingTicker() && saveMode === null && (
              <div className="mt-2 rounded-lg bg-charcoal/[0.035] p-2.5">
                <p className="text-[11px] font-medium text-charcoal/70">Ticker {ticker.trim().toUpperCase()} sudah ada.</p>
                <p className="mt-0.5 text-[10px] text-charcoal/45">Pilih cara menyimpan data ini:</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setSaveMode("buy")} className="rounded-full bg-[rgb(var(--c-forest-50))] px-3 py-1.5 text-[10px] font-semibold text-[rgb(var(--c-up))]">Tambah ke posisi yang ada</button>
                  <button type="button" onClick={() => setSaveMode("set")} className="rounded-full border border-[rgb(var(--c-border))] px-3 py-1.5 text-[10px] font-semibold text-[rgb(var(--c-charcoal))]">Timpa data</button>
                </div>
              </div>
            )}

            {(!findExistingTicker() || saveMode !== null || editing) && (
              <>
                <p className="mt-1.5 text-[10px] text-charcoal/40">{market === "ID" ? "1 lot = 100 saham. Nilai portfolio dihitung dari harga pasar × jumlah saham." : "US menggunakan shares. Nilai portfolio dalam USD dan dikonversi ke IDR di Total Aset."}</p>
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={() => void saveStock(editing ? "set" : (saveMode || "set"))} disabled={refreshing} className="rounded-full bg-[rgb(var(--c-forest-700))] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-50">
                    {refreshing ? "Menyimpan…" : editing ? "Simpan perubahan" : saveMode === "buy" ? "Tambah ke posisi" : "Simpan saham"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AssetListSection>
  );
}
export function DashboardFinance({ initialTab = "income" }: { initialTab?: "income" | "assets" | "cashflow" | "debt" }) {
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
  const { loading, error, isRealData, username, userId, totalIncome, totalExpense, totalSaving, byCategory, assets } = useFinanceData(selectedMonth, false, selectedYear);
  const { wallets } = useWallets();
  const historyData = useFinanceData(selectedMonth, true, selectedYear);
  const [activeReportTab, setActiveReportTab] = useState<"income" | "assets" | "cashflow" | "debt">(initialTab);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [editingAssetTarget, setEditingAssetTarget] = useState<AssetTarget | null>(null);
  const [assetTargetForm, setAssetTargetForm] = useState({ targetAmount: "" });
  const [savingAssetTarget, setSavingAssetTarget] = useState(false);
  const [deletingAssetTarget, setDeletingAssetTarget] = useState(false);
  const assetTargetFormRef = useRef<HTMLDivElement>(null);


  // Liquid assets are derived from the Wallet module so the same balance is not entered twice.
  // Wallet is the source of truth for cash/bank/e-wallet balances; Asset Tracker only aggregates it.
  const liquidAssetsFromDashboard = assets.liquidAssets.map((item) => ({ name: item.name, value: Number(item.value) || 0 }));
  const integratedLiquidTotal = liquidAssetsFromDashboard.reduce((sum, item) => sum + item.value, 0);
  const [usdIdrRate, setUsdIdrRate] = useState<number>(16300);
  const [usdIdrUpdatedAt, setUsdIdrUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadUsdIdrRate() {
      try {
        const res = await fetch("/api/exchange-rate?from=USD&to=IDR", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Number.isFinite(Number(data.rate)) || Number(data.rate) <= 0) return;
        if (!cancelled) {
          setUsdIdrRate(Number(data.rate));
          setUsdIdrUpdatedAt(data.updatedAt || null);
        }
      } catch {}
    }
    void loadUsdIdrRate();
    const interval = window.setInterval(loadUsdIdrRate, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const stockIDTotal = assets.stocksID.reduce((sum, item) => sum + item.value, 0);
  const stockUSTotalUSD = assets.stocksUS.reduce((sum, item) => sum + item.value, 0);
  const stockUSTotalIDR = stockUSTotalUSD * usdIdrRate;
  const integratedInvestmentTotal = assets.investmentAssets.reduce((sum, item) => sum + item.value, 0) + stockIDTotal + stockUSTotalIDR;
  // Single display source for Asset Tracker: liquid + investments + stocks + real assets.
  const integratedTotalAssets =
    integratedLiquidTotal +
    assets.investmentAssets.reduce((sum, item) => sum + (Number(item.value) || 0), 0) +
    stockIDTotal +
    stockUSTotalIDR +
    (Number(assets.realAssetsTotal) || 0);
  const integratedAssetProgress = assets.target > 0 ? (integratedTotalAssets / assets.target) * 100 : 0;

  const assetChartData = [
    ...liquidAssetsFromDashboard.map((i) => ({ name: i.name, value: i.value })),
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
      <div className="flex items-center justify-between gap-3">
        {activeReportTab === "assets" ? (
          <h1 className="text-[20px] font-semibold leading-6 text-[rgb(var(--c-charcoal))]">Asset Tracker</h1>
        ) : (
          <select aria-label="Pilih laporan" value={activeReportTab} onChange={(e) => setActiveReportTab(e.target.value as typeof activeReportTab)} className="min-w-0 flex-1 appearance-none rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3.5 py-2.5 text-[12.5px] font-semibold text-[rgb(var(--c-charcoal))] shadow-sm outline-none">
            <option value="income">Income Statement</option><option value="assets">Asset Tracker</option><option value="cashflow">Cashflow Tracker</option>
          </select>
        )}
        <button type="button" onClick={() => { setDraftMonth(selectedMonth); setDraftYear(selectedYear); setPeriodOpen(true); }} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3.5 text-[12.5px] font-semibold text-[rgb(var(--c-charcoal))] shadow-sm">
          <CalendarDays size={15} className="shrink-0 text-[rgb(var(--c-up))]" /><span>{monthNames[monthNames.indexOf(selectedMonth)] || selectedMonth} {selectedYear}</span><ChevronRight size={14} className="rotate-90 text-[rgb(var(--c-muted))]" />
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
        return <section data-tour="report-summary" className="report-summary-card rounded-[14px] bg-gradient-to-br from-[#0B4D38] to-[#063526] p-4 text-white shadow-float dark:from-[#0B4D38] dark:to-[#063526]">
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
          <ChartCard data-tour="report-trends" title={id ? "Tren Pemasukan & Pengeluaran" : "Income & Expense Trends"} subtitle={id ? "Perubahan dari bulan ke bulan pada tahun terpilih." : "Month-to-month changes for the selected year."}>
            <div className="w-full">
              <ResponsiveContainer width="100%" height={250}><LineChart data={monthNames.map((month) => {
                const rows = historyData.transactions.filter((t) => String(t.month || "").toLowerCase() === month.toLowerCase() && Number(t.year || (t.date?.split("/")?.[2] ?? selectedYear)) === selectedYear);
              const previousRows = historyData.transactions.filter((t) => String(t.month || "").toLowerCase() === month.toLowerCase() && Number(t.year || (t.date?.split("/")?.[2] ?? 0)) === selectedYear - 1);
                return { month: month.slice(0, 3), income: rows.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0), expense: rows.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0), previousIncome: previousRows.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0), previousExpense: previousRows.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0) };
              })} margin={{top:10,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)"/><XAxis dataKey="month" tick={{fontSize:10}} axisLine={false} tickLine={false}/><YAxis width={48} tickFormatter={(v)=>formatCompact(v)} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(v:number)=>formatRupiah(v)}/><Line type="monotone" dataKey="income" name={id ? "Pemasukan" : "Income"} stroke="#39FF88" strokeWidth={2.5} dot={{r:3}} activeDot={{r:5}}/><Line type="monotone" dataKey="expense" name={id ? "Pengeluaran" : "Expense"} stroke="#FF72B6" strokeWidth={2.5} dot={{r:3}} activeDot={{r:5}}/><Line type="monotone" dataKey="previousIncome" name={id ? "Pemasukan tahun lalu" : "Income last year"} stroke="#9D83FF" strokeWidth={2} strokeDasharray="5 4" dot={false}/><Line type="monotone" dataKey="previousExpense" name={id ? "Pengeluaran tahun lalu" : "Expense last year"} stroke="#F59BB8" strokeWidth={2} strokeDasharray="5 4" dot={false}/></LineChart></ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-charcoal/65"><span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 bg-[#39FF88]"/> {id ? "Pemasukan" : "Income"}</span><span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 bg-[#FF72B6]"/> {id ? "Pengeluaran" : "Expense"}</span></div>
            </div>
          </ChartCard>
          <ChartCard data-tour="report-categories" title={id ? "Detail per Kategori" : "Category Details"} subtitle={id ? "Rincian pemasukan dan pengeluaran pada periode terpilih." : "Income and expenses for the selected period."}>
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
      
      {activeReportTab === "assets" && (
        <div className="mx-auto w-full max-w-[760px] space-y-3">
          <AssetTrackerManaged
            assets={assets}
            wallets={wallets}
            isRealData={isRealData}
            assetsVisible={!assetValuesHidden}
            integratedTotalAssets={integratedTotalAssets}
            integratedLiquidTotal={integratedLiquidTotal}
            userId={userId}
          />
          <StockTracker
            stocksID={assets.stocksID}
            stocksUS={assets.stocksUS}
            isRealData={isRealData}
            investmentAccounts={wallets.filter((wallet) => wallet.type === "investment").map((wallet) => ({ name: wallet.name, balance: wallet.balance }))}
            stocksTotal={assets.stocksTotal}
            totalAssets={integratedTotalAssets}
            usdIdrRate={usdIdrRate}
            assetsVisible={!assetValuesHidden}
          />
        </div>
      )}


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