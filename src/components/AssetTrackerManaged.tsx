import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Plus, Trash2, Wallet, TrendingUp, Car, Building2, Package, Pencil } from "lucide-react";
import { formatRupiah } from "../lib/format";
import type { AssetData, ManagedInvestmentAsset, RealAsset } from "../lib/useFinanceData";
import { getStoredToken } from "../lib/useFinanceData";
import type { Wallet as WalletType } from "../lib/useWallets";

const API_BASE = "/api";

type Props = {
  assets: AssetData;
  wallets: WalletType[];
  isRealData: boolean;
  assetsVisible: boolean;
  userId?: string | null;
};

function yearsHeld(date: string) {
  const start = new Date(date + "T00:00:00").getTime();
  return Number.isFinite(start) ? Math.max(0, (Date.now() - start) / (365.2425 * 86400000)) : 0;
}
function calcRealValue(initial: number, rate: number, date: string) {
  return initial * Math.pow(1 + rate / 100, yearsHeld(date));
}
function categoryOf(name: string) {
  const k = name.toLowerCase();
  if (/obligasi|sbn|bond|sukuk/.test(k)) return "Obligasi";
  if (/emas|gold/.test(k)) return "Emas";
  if (/p2p|peer|lending/.test(k)) return "P2P Lending";
  if (/reksa|reksadana|mutual/.test(k)) return "Reksadana";
  return "Lainnya";
}
function assetIcon(name: string) {
  const k = name.toLowerCase();
  if (/mobil|car|kendaraan/.test(k)) return <Car size={17} />;
  if (/rumah|properti|property|tanah|apartemen/.test(k)) return <Building2 size={17} />;
  return <Package size={17} />;
}

function liquidSubtitle(name: string) {
  const k = name.toLowerCase();
  if (/cash|tunai|dompet/.test(k)) return "Tunai";
  if (/bank|bca|bni|bri|mandiri|cimb|jago|btn|danamon|permata|bsi/.test(k)) return "Bank";
  if (/saham|stock|reksa|invest|obligasi|emas|crypto|gotrade|go trade/.test(k)) return "Investasi";
  return "Lainnya";
}
function formatCompactAssetTotal(value: number) {
  const n = Math.abs(Number(value) || 0);
  const trim = (v: number) => v.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  if (n >= 1_000_000_000) return trim(n / 1_000_000_000) + " M";
  if (n >= 1_000_000) return trim(n / 1_000_000) + " jt";
  if (n >= 1_000) return trim(n / 1_000) + " rb";
  return Math.round(n).toLocaleString("id-ID");
}

export function AssetTrackerManaged({
  assets, wallets, isRealData, assetsVisible, userId,
}: Props) {
  const [compositionOpen, setCompositionOpen] = useState(true);
  const [liquidOpen, setLiquidOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [realOpen, setRealOpen] = useState(false);
  const [investmentModal, setInvestmentModal] = useState<ManagedInvestmentAsset | null>(null);
  const [realModal, setRealModal] = useState<RealAsset | null>(null);
  const [realFundingMode, setRealFundingMode] = useState<"purchase" | "owned">("owned");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingAssetTarget, setEditingAssetTarget] = useState(false);
  const [assetTargetInput, setAssetTargetInput] = useState("");
  const [savingAssetTarget, setSavingAssetTarget] = useState(false);
  const [realForm, setRealForm] = useState({ name: "", initialValue: "", acquisitionDate: "", annualChangePercent: "", note: "" });
  const [realFormSourceAccount, setRealFormSourceAccount] = useState("");
  const [investmentForm, setInvestmentForm] = useState({
    name: "", category: "Obligasi", quantity: "", unit: "unit", buyPrice: "", currentPrice: "",
    sourceAccount: "", purchaseDate: "", note: "", currency: "IDR" as "IDR" | "USD", fxRate: "1",
  });
  const [fundingMode, setFundingMode] = useState<"purchase" | "opening">("purchase");

  // Asset Tracker display source: the dashboard asset payload.
  // The wallets prop remains available only for purchase/edit forms.
  const liquidAssets = assets.liquidAssets || [];
  const liquidTotal = liquidAssets.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const realTotal = Number(assets.realAssetsTotal || 0);
  const investmentDetails = assets.investmentDetails || [];
  // Keep the exact investment items returned by the dashboard as the source of truth.
  // Managed detail is only metadata for editing, never an extra amount.
  const investmentRows = assets.investmentAssets.map((item) => ({
    name: item.name,
    value: Number(item.value) || 0,
    detail: investmentDetails.find((d) => d.name === item.name && Math.abs(d.value - item.value) < 1) || null,
  }));
  const investmentTotal = investmentRows.reduce((s, x) => s + x.value, 0) + assets.stocksTotal;
  // The API already calculates the canonical total from the same components.
  // Never recompute it here, otherwise small differences (especially FX) can
  // make the headline disagree with the dashboard payload.
  const displayTotalAssets = Number(assets.totalAssets) || 0;

  const categoryTotals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const row of investmentRows) {
      const category = categoryOf(row.name);
      out[category] = (out[category] || 0) + row.value;
    }
    if (assets.stocksTotal > 0) out.Saham = assets.stocksTotal;
    return out;
  }, [investmentRows, assets.stocksTotal]);

  const composition = [
    { name: "Saham", value: categoryTotals.Saham || 0, color: "rgb(var(--asset-chart-green))" },
    { name: "Emas", value: categoryTotals.Emas || 0, color: "rgb(var(--asset-chart-blue))" },
    { name: "Kas", value: liquidTotal, color: "rgb(var(--asset-chart-mint))" },
    { name: "Reksa dana", value: categoryTotals.Reksadana || 0, color: "rgb(var(--asset-chart-gray))" },
    { name: "Lainnya", value: (categoryTotals.Obligasi || 0) + (categoryTotals["P2P Lending"] || 0) + (categoryTotals.Lainnya || 0) + realTotal, color: "rgb(var(--asset-chart-slate))" },
  ].filter((x) => x.value > 0);
  const compositionTotal = composition.reduce((s, x) => s + x.value, 0);
  const pct = (v: number) => compositionTotal ? ((v / compositionTotal) * 100).toFixed(1).replace(".", ",") + "%" : "0,0%";
  const [assetChange, setAssetChange] = useState<{ amount: number; percent: number } | null>(null);

  useEffect(() => {
    if (!isRealData || !userId) {
      setAssetChange(null);
      return;
    }
    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const key = (date: Date) => `wealthplanner_asset_snapshot_user_${userId}_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    try {
      const previousTotal = Number(localStorage.getItem(key(previous)));
      if (Number.isFinite(previousTotal) && previousTotal > 0) {
        const amount = displayTotalAssets - previousTotal;
        setAssetChange({ amount, percent: (amount / previousTotal) * 100 });
      } else {
        setAssetChange(null);
      }
      localStorage.setItem(key(now), String(displayTotalAssets));
    } catch {
      setAssetChange(null);
    }
  }, [displayTotalAssets, isRealData, userId]);

  function openReal(asset?: RealAsset) {
    setError("");
    if (asset) {
      setRealForm({
        name: asset.name, initialValue: String(Math.round(asset.initialValue)),
        acquisitionDate: asset.acquisitionDate, annualChangePercent: String(asset.annualChangePercent), note: asset.note,
      });
      setRealFundingMode(asset.fundingMode);
      setRealFormSourceAccount(asset.sourceAccount || "");
      setRealModal(asset);
    } else {
      setRealForm({ name: "", initialValue: "", acquisitionDate: new Date().toISOString().slice(0, 10), annualChangePercent: "0", note: "" });
      setRealFundingMode("owned");
      setRealFormSourceAccount("");
      setRealModal({ id: "", name: "", initialValue: 0, acquisitionDate: "", annualChangePercent: 0, note: "", currentValue: 0, changeValue: 0, sourceAccount: "", transactionId: "", fundingMode: "owned" });
    }
  }

  function openInvestment(asset?: ManagedInvestmentAsset) {
    setError("");
    if (asset) {
      setInvestmentForm({
        name: asset.name, category: asset.category, quantity: String(asset.quantity), unit: asset.unit,
        buyPrice: String(asset.buyPrice), currentPrice: String(asset.currentPrice), sourceAccount: asset.sourceAccount,
        purchaseDate: asset.purchaseDate, note: asset.note, currency: asset.currency, fxRate: String(asset.fxRate || 1),
      });
      setInvestmentModal(asset);
    } else {
      setInvestmentForm({
        name: "", category: "Obligasi", quantity: "", unit: "unit", buyPrice: "", currentPrice: "",
        sourceAccount: "", purchaseDate: new Date().toISOString().slice(0, 10), note: "", currency: "IDR", fxRate: "1",
      });
      setFundingMode("purchase");
      setInvestmentModal({
        id: "", name: "", category: "Obligasi", quantity: 0, unit: "unit", buyPrice: 0, currentPrice: 0,
        sourceAccount: "", purchaseDate: "", note: "", transactionId: "", currency: "IDR", fxRate: 1, costBasis: 0, value: 0,
      });
    }
  }

  async function saveReal() {
    const token = getStoredToken();
    if (!token) return setError("Sesi dashboard tidak ditemukan.");
    const initial = Number(realForm.initialValue);
    const rate = Number(realForm.annualChangePercent);
    if (!realForm.name.trim() || !realForm.acquisitionDate || !Number.isFinite(initial) || initial < 0 || !Number.isFinite(rate) || rate <= -100) {
      return setError("Nama, harga perolehan, tanggal, dan perubahan nilai wajib valid.");
    }
    if (realFundingMode === "purchase" && !realFormSourceAccount) {
      return setError("Pilih rekening sumber dana.");
    }
    setSaving(true); setError("");
    try {
      const response = await fetch(API_BASE + "/managed-assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, kind: "real", action: realModal?.id ? "update" : "create", id: realModal?.id,
          name: realForm.name.trim(), initialValue: initial, acquisitionDate: realForm.acquisitionDate,
          annualChangePercent: rate, note: realForm.note.trim(),
          sourceAccount: realFormSourceAccount, fundingMode: realFundingMode,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan aset riil");
      setRealModal(null); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan aset riil");
    } finally { setSaving(false); }
  }

  async function deleteReal(asset: RealAsset) {
    const token = getStoredToken(); if (!token) return;
    if (asset.fundingMode === "owned") {
      if (!window.confirm('Hapus aset "' + asset.name + '"? Aset ini ditambahkan sebagai "sudah dimiliki", jadi tidak ada saldo rekening yang dikembalikan.')) return;
      setSaving(true);
      try {
        const response = await fetch(API_BASE + "/managed-assets", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, kind: "real", action: "delete", id: asset.id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Gagal menghapus");
        setRealModal(null); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menghapus");
      } finally { setSaving(false); }
      return;
    }

    const cancelPurchase = window.confirm('Hapus aset "' + asset.name + '"?\n\nOK = Batalkan pembelian, saldo rekening dikembalikan.\nCancel = Aset dijual/dilepas.');
    if (cancelPurchase) {
      setSaving(true);
      try {
        const response = await fetch(API_BASE + "/managed-assets", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, kind: "real", action: "delete", id: asset.id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Gagal membatalkan pembelian");
        setRealModal(null); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal membatalkan pembelian");
      } finally { setSaving(false); }
      return;
    }

    const salePrice = Number(String(window.prompt("Harga jual aset (Rp):", String(Math.round(asset.currentValue))) || "").replace(/\D/g, ""));
    if (!salePrice || salePrice <= 0) return;
    const destinationAccount = String(window.prompt("Rekening tujuan penerimaan:", asset.sourceAccount || "") || "").trim();
    if (!destinationAccount) return;
    setSaving(true);
    try {
      const response = await fetch(API_BASE + "/managed-assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, kind: "real", action: "sell", id: asset.id, salePrice, destinationAccount }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal mencatat penjualan");
      const gainLoss = Number(data.gainLoss || 0);
      window.alert(gainLoss >= 0 ? `Aset dijual. Untung ${formatRupiah(gainLoss)} masuk ke hasil penjualan.` : `Aset dijual. Rugi ${formatRupiah(Math.abs(gainLoss))} tercermin dari harga jual.`);
      setRealModal(null); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mencatat penjualan");
    } finally { setSaving(false); }
  }

  async function saveInvestment() {
    const token = getStoredToken(); if (!token) return setError("Sesi dashboard tidak ditemukan.");
    const quantity = Number(investmentForm.quantity);
    const buy = Number(investmentForm.buyPrice);
    const current = Number(investmentForm.currentPrice);
    const fx = Number(investmentForm.fxRate) || 1;
    if (!investmentForm.name.trim() || quantity <= 0 || buy < 0 || current < 0 || !investmentForm.purchaseDate) {
      return setError("Nama, jumlah, harga beli, harga terkini, dan tanggal wajib diisi.");
    }
    if (!investmentModal?.id && fundingMode === "purchase" && !investmentForm.sourceAccount) {
      return setError("Pilih rekening sumber dana.");
    }
    setSaving(true); setError("");
    try {
      const response = await fetch(API_BASE + "/managed-assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, kind: "investment", action: investmentModal?.id ? "update" : "create", id: investmentModal?.id,
          name: investmentForm.name.trim(), category: investmentForm.category, quantity, unit: investmentForm.unit,
          buyPrice: buy, currentPrice: current, sourceAccount: investmentForm.sourceAccount,
          purchaseDate: investmentForm.purchaseDate, note: investmentForm.note.trim(), currency: investmentForm.currency,
          fxRate: fx, fundingMode: investmentModal?.id ? undefined : fundingMode,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan aset investasi");
      setInvestmentModal(null); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan aset investasi");
    } finally { setSaving(false); }
  }

  async function deleteInvestment(asset: ManagedInvestmentAsset) {
    const effect = asset.sourceAccount && asset.costBasis ? " Saldo " + asset.sourceAccount + " akan dikembalikan " + formatRupiah(asset.costBasis) + "." : "";
    if (!window.confirm("Hapus " + asset.name + "?" + effect + "\n\nAset akan dihapus dan Total Aset disesuaikan.")) return;
    const token = getStoredToken(); if (!token) return;
    setSaving(true);
    try {
      const response = await fetch(API_BASE + "/managed-assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, kind: "investment", action: "delete", id: asset.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal menghapus");
      setInvestmentModal(null); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <section
        className="relative isolate overflow-hidden rounded-[20px] border border-[#4B5563] bg-[#374151] p-4 text-white sm:p-5 shadow-none"
      >
        <div className="min-w-0">
          <p className="text-[12px] font-medium tracking-[-0.02em] text-white/65">Total Aset</p>
          <p className="mt-0.5 min-w-0 break-words text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] tabular-nums text-white sm:text-[38px]">
            {assetsVisible ? formatRupiah(displayTotalAssets) : "Rp ••••••••"}
          </p>

          {assetChange && (
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <span className={`font-semibold tabular-nums ${assetChange.amount >= 0 ? "text-[#9FE1CB]" : "text-[#FCA5A5]"}`}>
                {assetChange.amount >= 0 ? "↑ " : "↓ "}{assetsVisible ? formatRupiah(Math.abs(assetChange.amount)) : "Rp ••••••"}
              </span>
              <span className="text-white/60">({assetChange.amount >= 0 ? "+" : "−"}{Math.abs(assetChange.percent).toFixed(1).replace(".", ",")}%)</span>
              <span className="text-white/60">vs bulan lalu</span>
            </div>
          )}

          <div className="mt-3 flex min-h-[46px] items-center justify-between gap-3">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium tracking-[-0.02em] text-white">
              {assets.target > 0 ? Math.round(Math.min(100, Math.max(0, (displayTotalAssets / assets.target) * 100))) : 0}% dari target
            </span>

            {isRealData && (
              <div className="flex min-w-0 items-center gap-1.5 text-right">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium tracking-[-0.02em] text-white/55">Target Aset</p>
                  <p className="truncate text-[12px] font-semibold tabular-nums text-white/85">
                    {assetsVisible ? formatRupiah(assets.target || 0) : "Rp ••••••"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Edit target aset"
                  title="Edit target aset"
                  onClick={() => { setAssetTargetInput(String(Math.round(assets.target || 0))); setEditingAssetTarget(true); }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#064A34] transition hover:bg-[#006B48]/15"
                >
                  <Pencil size={15} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>

          <div className="mt-2.5">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#006B48]/20">
              <div
                className="h-full rounded-full bg-[#03140C] transition-[width] duration-500"
                style={{ width: `${assets.target > 0 ? Math.min(100, Math.max(0, (displayTotalAssets / assets.target) * 100)) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {editingAssetTarget && (
          <div className="mt-3 rounded-[14px] border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] p-3">
            <label className="sr-only" htmlFor="asset-target-input">Nominal target aset</label>
            <input id="asset-target-input" inputMode="numeric" value={assetTargetInput} onChange={(e) => setAssetTargetInput(e.target.value.replace(/[^0-9]/g, ""))} className="min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 text-[14px] font-semibold text-[rgb(var(--c-charcoal))] outline-none" placeholder="Masukkan target aset" autoFocus />
            <p className="mt-1 text-[12px] text-[rgb(var(--c-muted))]">Nominal wajib diisi dan tidak boleh negatif.</p>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" disabled={savingAssetTarget} onClick={() => { setEditingAssetTarget(false); setAssetTargetInput(String(Math.round(assets.target || 0))); }} className="min-h-11 rounded-full border border-[rgb(var(--c-border))] px-3 text-[11px] font-semibold">Batal</button>
              <button type="button" disabled={savingAssetTarget} onClick={async () => {
                const raw = assetTargetInput.trim(); const value = Number(raw); const existingTarget = assets.targets?.[0];
                if (!raw || !Number.isFinite(value) || value < 0) { alert("Nominal target wajib diisi dan tidak boleh negatif."); return; }
                const token = getStoredToken(); if (!token) { alert("Sesi dashboard tidak ditemukan."); return; }
                setSavingAssetTarget(true);
                try {
                  const res = await fetch(API_BASE + "/update-asset-target", { method: existingTarget ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(existingTarget ? { token, targetId: existingTarget.id, targetAmount: value } : { token, targetAmount: value }) });
                  const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || "Gagal menyimpan target");
                  setEditingAssetTarget(false); window.dispatchEvent(new CustomEvent("wealthplanner:asset-updated"));
                } catch (e) { alert(e instanceof Error ? e.message : "Gagal menyimpan target"); }
                finally { setSavingAssetTarget(false); }
              }} className="min-h-11 rounded-full bg-[rgb(var(--c-forest-700))] px-4 text-[11px] font-semibold text-[rgb(var(--c-surface))] disabled:opacity-50">{savingAssetTarget ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
        <button type="button" onClick={() => setCompositionOpen(v => !v)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left">
          <div>
            <p className="text-[20px] font-semibold tracking-[-0.02em] text-[rgb(var(--asset-primary-text))]">Portfolio Allocation</p>
            <p className="mt-1 text-[13px] text-[rgb(var(--asset-secondary-text))]">Distribusi aset berdasarkan nilai saat ini</p>
          </div>
          <ChevronRight size={18} className={`shrink-0 text-[rgb(var(--asset-secondary-text))] transition-transform ${compositionOpen ? "rotate-90" : ""}`} />
        </button>
        {compositionOpen && (
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-center gap-4 sm:gap-6">
            <div className="relative mx-auto aspect-square w-full max-w-[190px]">
              <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" role="img" aria-label="Portfolio allocation">
                <circle cx="100" cy="100" r="72" fill="none" stroke="#E5E7EB" strokeWidth="24" />
                {composition.map((item, index) => {
                  const circumference = 2 * Math.PI * 72;
                  const prior = composition.slice(0, index).reduce((s, x) => s + x.value, 0);
                  const dash = compositionTotal > 0 ? (item.value / compositionTotal) * circumference : 0;
                  return (
                    <circle
                      key={item.name}
                      cx="100"
                      cy="100"
                      r="72"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="24"
                      strokeLinecap="butt"
                      strokeDasharray={dash + " " + (circumference - dash)}
                      strokeDashoffset={-prior / Math.max(compositionTotal, 1) * circumference}
                    />
                  );
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] text-[rgb(var(--asset-secondary-text))]">Total</span>
                <span className="mt-1 max-w-[90%] truncate text-[16px] font-bold leading-none tracking-[-0.02em] tabular-nums text-[rgb(var(--asset-primary-text))]">
                  {assetsVisible ? formatCompactAssetTotal(compositionTotal) : "••••••"}
                </span>
              </div>
            </div>
            <div className="min-w-0 space-y-2.5">
              {composition.map(item => (
                <div key={item.name} className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[rgb(var(--asset-primary-text))]">{item.name}</span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[rgb(var(--asset-secondary-text))]">{pct(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[20px] bg-[rgb(var(--c-surface))] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-[rgb(var(--c-charcoal))]">Kategori Aset</p>
            <p className="text-[12px] text-[rgb(var(--c-muted))]">Kelola investasi dan aset riil</p>
          </div>
          <button type="button" onClick={() => openInvestment()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--c-forest-50))] text-[rgb(var(--c-up))]" aria-label="Tambah aset investasi"><Plus size={17} /></button>
        </div>
        <div className="mt-3 space-y-2">
          <details className="rounded-[12px] bg-[rgb(var(--c-cream))]" open={liquidOpen} onToggle={e => setLiquidOpen(e.currentTarget.open)}>
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-2 px-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--c-surface))] text-[rgb(var(--c-up))]"><Wallet size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[rgb(var(--c-charcoal))]">Aset Likuid</p>
                <p className="text-[12px] text-[rgb(var(--c-muted))]">{liquidAssets.length} rekening • {assetsVisible ? formatRupiah(liquidTotal) : "Rp ••••••"}</p>
              </div>
              <p className="hidden w-[132px] shrink-0 text-right text-[14px] font-semibold tabular-nums text-[rgb(var(--c-charcoal))] sm:block">{assetsVisible ? formatRupiah(liquidTotal) : "Rp ••••••"}</p>
              <ChevronRight size={16} className={liquidOpen ? "rotate-90" : ""} />
            </summary>
            <div className="border-t border-[rgb(var(--c-border))] px-3 py-1.5">
              {liquidAssets.length ? liquidAssets.map((item) => (
                <div key={item.name} className="flex min-h-[48px] items-center gap-2 border-b border-[rgb(var(--c-border))] last:border-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--c-surface))] text-[rgb(var(--c-up))]"><Wallet size={15} /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold text-[rgb(var(--c-charcoal))]">{item.name}</p><p className="text-[12px] text-[rgb(var(--c-muted))]">{liquidSubtitle(item.name)}</p></div>
                  <p className="w-[150px] shrink-0 text-right text-[14px] font-semibold tabular-nums text-[rgb(var(--c-charcoal))]">{assetsVisible ? formatRupiah(item.value) : "Rp ••••••"}</p>
                </div>
              )) : <p className="py-3 text-[12px] text-[rgb(var(--c-muted))]">Belum ada rekening.</p>}
            </div>
          </details>

          <details className="rounded-[14px] bg-[rgb(var(--c-cream))]" open={investmentOpen} onToggle={e => setInvestmentOpen(e.currentTarget.open)}>
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--c-surface))] text-[rgb(var(--c-up))]"><TrendingUp size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[rgb(var(--c-charcoal))]">Aset Investasi</p>
                <p className="text-[12px] text-[rgb(var(--c-muted))]">{investmentRows.length + (assets.stocksTotal > 0 ? 1 : 0)} jenis • {assetsVisible ? formatRupiah(investmentTotal) : "Rp ••••••"}</p>
              </div>
              <p className="hidden w-[132px] shrink-0 text-right text-[14px] font-semibold tabular-nums text-[rgb(var(--c-charcoal))] sm:block">{assetsVisible ? formatRupiah(investmentTotal) : "Rp ••••••"}</p>
              <ChevronRight size={16} className={investmentOpen ? "rotate-90" : ""} />
            </summary>
            <div className="border-t border-[rgb(var(--c-border))] px-3 py-1.5">
              {investmentRows.map(row => {
                const colorVar = categoryOf(row.name) === "Obligasi" ? "bond" : categoryOf(row.name) === "Emas" ? "gold" : categoryOf(row.name) === "Reksadana" ? "fund" : categoryOf(row.name) === "P2P Lending" ? "p2p" : "other";
                return (
                  <button key={row.name} type="button" disabled={!row.detail} onClick={() => row.detail && openInvestment(row.detail)} className="flex min-h-[48px] w-full items-center gap-2 border-b border-[rgb(var(--c-border))] text-left last:border-0 disabled:cursor-default">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--c-surface))] text-[rgb(var(--c-up))]"><TrendingUp size={15} /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold text-[rgb(var(--c-charcoal))]">{row.name}</p><p className="truncate text-[12px] text-[rgb(var(--c-muted))]">{row.detail ? row.detail.category : "Investasi"}</p></div>
                    <p className="w-[150px] shrink-0 text-right text-[14px] font-semibold tabular-nums text-[rgb(var(--c-charcoal))]">{assetsVisible ? formatRupiah(row.value) : "Rp ••••••"}</p>
                  </button>
                );
              })}
              {assets.stocksTotal > 0 && (
                <div className="flex min-h-[48px] items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--c-surface))] text-[rgb(var(--c-up))]"><TrendingUp size={15} /></span>
                  <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold text-[rgb(var(--c-charcoal))]">Saham</p><p className="text-[12px] text-[rgb(var(--c-muted))]">Portofolio Saham</p></div>
                  <p className="w-[150px] shrink-0 text-right text-[14px] font-semibold tabular-nums text-[rgb(var(--c-charcoal))]">{assetsVisible ? formatRupiah(assets.stocksTotal) : "Rp ••••••"}</p>
                </div>
              )}
              {!investmentRows.length && assets.stocksTotal <= 0 && <div className="py-3 text-[12px] text-[rgb(var(--c-muted))]">Belum ada aset investasi.</div>}
            </div>
          </details>

          <details className="rounded-[14px] bg-[rgb(var(--c-cream))]" open={realOpen} onToggle={e => setRealOpen(e.currentTarget.open)}>
            <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--c-surface))] text-[rgb(var(--c-up))]"><Package size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[rgb(var(--c-charcoal))]">Aset Riil</p>
                <p className="text-[12px] text-[rgb(var(--c-muted))]">{assets.realAssets.length} aset • {assetsVisible ? formatRupiah(realTotal) : "Rp ••••••"}</p>
              </div>
              <p className="hidden w-[150px] shrink-0 text-right text-[14px] font-semibold tabular-nums text-[rgb(var(--c-charcoal))] sm:block">{assetsVisible ? formatRupiah(realTotal) : "Rp ••••••"}</p>
              <ChevronRight size={16} className={realOpen ? "rotate-90" : ""} />
            </summary>
            <div className="border-t border-[rgb(var(--c-border))] px-3 py-1.5">
              {assets.realAssets.length ? assets.realAssets.map(a => (
                <button key={a.id} type="button" onClick={() => openReal(a)} className="flex min-h-[48px] w-full items-center gap-3 border-b border-[rgb(var(--c-border))] text-left last:border-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--c-surface))] text-[rgb(var(--c-up))]">{assetIcon(a.name)}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold text-[rgb(var(--c-charcoal))]">{a.name}</p><p className="truncate text-[12px] text-[rgb(var(--c-muted))]">Nilai awal {formatRupiah(a.initialValue)} · {a.annualChangePercent >= 0 ? "+" : ""}{a.annualChangePercent}%/tahun</p></div>
                  <p className="w-[150px] shrink-0 text-right text-[14px] font-semibold tabular-nums text-[rgb(var(--c-charcoal))]">{assetsVisible ? formatRupiah(a.currentValue) : "Rp ••••••"}</p>
                </button>
              )) : (
                <div className="py-3"><p className="text-[12px] text-[rgb(var(--c-muted))]">Belum ada aset riil.</p><button type="button" onClick={() => openReal()} className="mt-2 min-h-11 rounded-full bg-[rgb(var(--c-forest-50))] px-3 text-[11px] font-semibold text-[rgb(var(--c-up))]">+ Tambah aset riil</button></div>
              )}
            </div>
          </details>
        </div>
      </section>

      {error && <p className="rounded-xl bg-[rgb(var(--c-rose-50))] px-3 py-2 text-[11px] text-[rgb(var(--c-down))]">{error}</p>}

      {realModal && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
        <div className="w-full max-w-lg rounded-t-[22px] bg-[rgb(var(--c-surface))] p-4 sm:rounded-[18px]">
          <div className="flex items-center justify-between"><p className="text-[15px] font-semibold">{realModal.id ? "Edit Aset Riil" : "Tambah Aset Riil"}</p><button type="button" onClick={() => setRealModal(null)} className="min-h-11 min-w-11 rounded-full">×</button></div>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setRealFundingMode("owned"); setRealFormSourceAccount(""); }} className={`min-h-11 rounded-xl border px-3 text-[11px] font-semibold ${realFundingMode === "owned" ? "border-[rgb(var(--c-up))] bg-[rgb(var(--c-forest-50))] text-[rgb(var(--c-up))]" : "border-[rgb(var(--c-border))]"}`}>Aset yang sudah dimiliki</button>
              <button type="button" onClick={() => setRealFundingMode("purchase")} className={`min-h-11 rounded-xl border px-3 text-[11px] font-semibold ${realFundingMode === "purchase" ? "border-[rgb(var(--c-up))] bg-[rgb(var(--c-forest-50))] text-[rgb(var(--c-up))]" : "border-[rgb(var(--c-border))]"}`}>Beli dari rekening</button>
            </div>
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Nama aset<input value={realForm.name} onChange={e => setRealForm({ ...realForm, name: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label>
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Harga perolehan<input inputMode="numeric" value={realForm.initialValue} onChange={e => setRealForm({ ...realForm, initialValue: e.target.value.replace(/\D/g, "") })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label>
            {realFundingMode === "purchase" && <label className="block text-[11px] text-[rgb(var(--c-muted))]">Rekening sumber dana<select value={realFormSourceAccount} onChange={e => setRealFormSourceAccount(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]"><option value="">Pilih rekening</option>{wallets.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}</select></label>}
            {realModal.id && <p className="rounded-xl bg-[rgb(var(--c-cream))] px-3 py-2 text-[10px] text-[rgb(var(--c-muted))]">{realModal.fundingMode === "purchase" ? "Pembelian terhubung ke Transaction Tracker. Mengubah harga atau rekening akan mengoreksi transaksi pembelian." : "Aset ini berasal dari aset yang sudah dimiliki dan tidak terhubung ke saldo rekening."}</p>}
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Tanggal perolehan<input type="date" value={realForm.acquisitionDate} onChange={e => setRealForm({ ...realForm, acquisitionDate: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label>
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Perubahan nilai per tahun (%)<input inputMode="decimal" value={realForm.annualChangePercent} onChange={e => setRealForm({ ...realForm, annualChangePercent: e.target.value.replace(/[^0-9.-]/g, "") })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label>
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Catatan (opsional)<textarea value={realForm.note} onChange={e => setRealForm({ ...realForm, note: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 py-2 text-[13px]" /></label>
            {realForm.initialValue && realForm.acquisitionDate && <div className="rounded-xl bg-[rgb(var(--c-forest-50))] p-3 text-[11px]"><p>Nilai sekarang</p><p className="text-[16px] font-bold">{formatRupiah(calcRealValue(Number(realForm.initialValue), Number(realForm.annualChangePercent) || 0, realForm.acquisitionDate))}</p><p className="mt-1 text-[rgb(var(--c-muted))]">Selisih dari nilai awal: {formatRupiah(calcRealValue(Number(realForm.initialValue), Number(realForm.annualChangePercent) || 0, realForm.acquisitionDate) - Number(realForm.initialValue))}</p></div>}
            <div className="flex gap-2"><button type="button" onClick={() => setRealModal(null)} className="min-h-11 flex-1 rounded-full border border-[rgb(var(--c-border))]">Batal</button><button type="button" disabled={saving} onClick={() => void saveReal()} className="min-h-11 flex-1 rounded-full bg-[rgb(var(--c-forest-700))] text-[rgb(var(--c-surface))]">{saving ? "Menyimpan…" : "Simpan"}</button></div>
            {realModal.id && <button type="button" disabled={saving} onClick={() => void deleteReal(realModal)} className="min-h-11 w-full rounded-full text-[rgb(var(--c-down))]">Hapus aset</button>}
          </div>
        </div>
      </div>}

      {investmentModal && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
        <div className="w-full max-w-lg rounded-t-[22px] bg-[rgb(var(--c-surface))] p-4 sm:rounded-[18px]">
          <div className="flex items-center justify-between"><p className="text-[15px] font-semibold">{investmentModal.id ? "Edit Aset Investasi" : "Tambah Aset Investasi"}</p><button type="button" onClick={() => setInvestmentModal(null)} className="min-h-11 min-w-11 rounded-full">×</button></div>
          <div className="mt-3 space-y-3">
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Nama aset<input value={investmentForm.name} onChange={e => setInvestmentForm({ ...investmentForm, name: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label>
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Kategori<select value={investmentForm.category} onChange={e => setInvestmentForm({ ...investmentForm, category: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]"><option>Obligasi</option><option>Emas</option><option>Reksadana</option><option>P2P Lending</option><option>Lainnya</option></select></label>
            <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-[rgb(var(--c-muted))]">Jumlah/unit<input inputMode="decimal" value={investmentForm.quantity} onChange={e => setInvestmentForm({ ...investmentForm, quantity: e.target.value.replace(/[^0-9.]/g, "") })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label><label className="text-[11px] text-[rgb(var(--c-muted))]">Unit<input value={investmentForm.unit} onChange={e => setInvestmentForm({ ...investmentForm, unit: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label></div>
            <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-[rgb(var(--c-muted))]">Harga beli<input inputMode="decimal" value={investmentForm.buyPrice} onChange={e => setInvestmentForm({ ...investmentForm, buyPrice: e.target.value.replace(/[^0-9.]/g, "") })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label><label className="text-[11px] text-[rgb(var(--c-muted))]">Harga terkini<input inputMode="decimal" value={investmentForm.currentPrice} onChange={e => setInvestmentForm({ ...investmentForm, currentPrice: e.target.value.replace(/[^0-9.]/g, "") })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label></div>
            <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-[rgb(var(--c-muted))]">Rekening sumber<select value={investmentForm.sourceAccount} onChange={e => setInvestmentForm({ ...investmentForm, sourceAccount: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]"><option value="">Pilih rekening</option>{wallets.map(w => <option key={w.id}>{w.name}</option>)}</select></label><label className="text-[11px] text-[rgb(var(--c-muted))]">Tanggal<input type="date" value={investmentForm.purchaseDate} onChange={e => setInvestmentForm({ ...investmentForm, purchaseDate: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label></div>
            {!investmentModal.id && <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setFundingMode("purchase")} className={"min-h-11 rounded-xl border text-[11px] font-semibold " + (fundingMode === "purchase" ? "border-[rgb(var(--c-up))] bg-[rgb(var(--c-forest-50))]" : "border-[rgb(var(--c-border))]")}>Beli dari rekening</button><button type="button" onClick={() => setFundingMode("opening")} className={"min-h-11 rounded-xl border text-[11px] font-semibold " + (fundingMode === "opening" ? "border-[rgb(var(--c-up))] bg-[rgb(var(--c-forest-50))]" : "border-[rgb(var(--c-border))]")}>Aset sudah dimiliki</button></div>}
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Mata uang<select value={investmentForm.currency} onChange={e => setInvestmentForm({ ...investmentForm, currency: e.target.value as "IDR" | "USD" })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]"><option value="IDR">IDR</option><option value="USD">USD</option></select></label>
            {investmentForm.currency === "USD" && <label className="block text-[11px] text-[rgb(var(--c-muted))]">Kurs USD/IDR<input inputMode="decimal" value={investmentForm.fxRate} onChange={e => setInvestmentForm({ ...investmentForm, fxRate: e.target.value.replace(/[^0-9.]/g, "") })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label>}
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Catatan (opsional)<textarea value={investmentForm.note} onChange={e => setInvestmentForm({ ...investmentForm, note: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 py-2 text-[13px]" /></label>
            <div className="flex gap-2"><button type="button" onClick={() => setInvestmentModal(null)} className="min-h-11 flex-1 rounded-full border border-[rgb(var(--c-border))]">Batal</button><button type="button" disabled={saving} onClick={() => void saveInvestment()} className="min-h-11 flex-1 rounded-full bg-[rgb(var(--c-forest-700))] text-[rgb(var(--c-surface))]">{saving ? "Menyimpan…" : "Simpan"}</button></div>
            {investmentModal.id && <button type="button" disabled={saving} onClick={() => void deleteInvestment(investmentModal)} className="min-h-11 w-full rounded-full text-[rgb(var(--c-down))]">Hapus aset</button>}
          </div>
        </div>
      </div>}
    </div>
  );
}
