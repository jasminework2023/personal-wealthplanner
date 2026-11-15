import { useMemo, useState } from "react";
import { ChevronRight, Plus, Trash2, Wallet, Car, Building2, Package } from "lucide-react";
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
  integratedTotalAssets: number;
  integratedLiquidTotal: number;
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

export function AssetTrackerManaged({
  assets, wallets, isRealData, assetsVisible, integratedTotalAssets, integratedLiquidTotal,
}: Props) {
  const [compositionOpen, setCompositionOpen] = useState(true);
  const [liquidOpen, setLiquidOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [realOpen, setRealOpen] = useState(false);
  const [investmentModal, setInvestmentModal] = useState<ManagedInvestmentAsset | null>(null);
  const [realModal, setRealModal] = useState<RealAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [realForm, setRealForm] = useState({ name: "", initialValue: "", acquisitionDate: "", annualChangePercent: "", note: "" });
  const [investmentForm, setInvestmentForm] = useState({
    name: "", category: "Obligasi", quantity: "", unit: "unit", buyPrice: "", currentPrice: "",
    sourceAccount: "", purchaseDate: "", note: "", currency: "IDR" as "IDR" | "USD", fxRate: "1",
  });
  const [fundingMode, setFundingMode] = useState<"purchase" | "opening">("purchase");

  const realTotal = Number(assets.realAssetsTotal || 0);
  const investmentDetails = assets.investmentDetails || [];
  const legacyInvestment = assets.investmentAssets.filter(
    (x) => !investmentDetails.some((d) => d.name === x.name && Math.abs(d.value - x.value) < 1),
  );
  const investmentRows = [
    ...investmentDetails.map((d) => ({ name: d.name, value: d.value, detail: d })),
    ...legacyInvestment.map((x) => ({ name: x.name, value: x.value, detail: null })),
  ];
  const investmentTotal = investmentRows.reduce((s, x) => s + x.value, 0) + assets.stocksTotal;

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
    { name: "Aset Likuid", value: integratedLiquidTotal, color: "rgb(var(--asset-liquid))" },
    { name: "Obligasi", value: categoryTotals.Obligasi || 0, color: "rgb(var(--asset-bond))" },
    { name: "Saham", value: categoryTotals.Saham || 0, color: "rgb(var(--asset-stock))" },
    { name: "Reksadana", value: categoryTotals.Reksadana || 0, color: "rgb(var(--asset-fund))" },
    { name: "Emas", value: categoryTotals.Emas || 0, color: "rgb(var(--asset-gold))" },
    { name: "P2P Lending", value: categoryTotals["P2P Lending"] || 0, color: "rgb(var(--asset-p2p))" },
    { name: "Lainnya", value: categoryTotals.Lainnya || 0, color: "rgb(var(--asset-other))" },
    { name: "Aset Riil", value: realTotal, color: "rgb(var(--asset-real))" },
  ].filter((x) => x.value > 0);
  const compositionTotal = composition.reduce((s, x) => s + x.value, 0);
  const pct = (v: number) => compositionTotal ? ((v / compositionTotal) * 100).toFixed(1).replace(".", ",") + "%" : "0,0%";

  function openReal(asset?: RealAsset) {
    setError("");
    if (asset) {
      setRealForm({
        name: asset.name, initialValue: String(Math.round(asset.initialValue)),
        acquisitionDate: asset.acquisitionDate, annualChangePercent: String(asset.annualChangePercent), note: asset.note,
      });
      setRealModal(asset);
    } else {
      setRealForm({ name: "", initialValue: "", acquisitionDate: new Date().toISOString().slice(0, 10), annualChangePercent: "0", note: "" });
      setRealModal({ id: "", name: "", initialValue: 0, acquisitionDate: "", annualChangePercent: 0, note: "", currentValue: 0, changeValue: 0 });
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
      return setError("Nama, nilai awal, tanggal, dan perubahan nilai wajib valid.");
    }
    setSaving(true); setError("");
    try {
      const response = await fetch(API_BASE + "/managed-assets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, kind: "real", action: realModal?.id ? "update" : "create", id: realModal?.id,
          name: realForm.name.trim(), initialValue: initial, acquisitionDate: realForm.acquisitionDate,
          annualChangePercent: rate, note: realForm.note.trim(),
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
    if (!window.confirm('Hapus aset "' + asset.name + '"? Aset ini tidak mengurangi saldo rekening, jadi penghapusannya hanya menghilangkan aset dari Total Aset.')) return;
    const token = getStoredToken(); if (!token) return;
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
      <section className="rounded-[24px] bg-[rgb(var(--c-surface))] p-4 sm:p-5">
        <p className="text-[14px] font-semibold text-[rgb(var(--c-muted))]">Total Aset</p>
        <p className="mt-1 text-[clamp(30px,8vw,44px)] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{assetsVisible ? formatRupiah(integratedTotalAssets) : "Rp ••••••••"}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[["Likuid", integratedLiquidTotal], ["Investasi", investmentTotal], ["Aset Riil", realTotal]].map(([label, value]) => (
            <div key={String(label)} className="min-w-0 rounded-[16px] bg-[rgb(var(--c-cream))] p-3">
              <p className="text-[11px] text-[rgb(var(--c-muted))]">{label}</p>
              <p className="mt-1 truncate text-[14px] font-bold tabular-nums">{assetsVisible ? formatRupiah(Number(value)) : "Rp ••••••"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] bg-[rgb(var(--c-surface))]">
        <button type="button" onClick={() => setCompositionOpen(v => !v)} className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5">
          <span className="text-[15px] font-semibold">Komposisi Aset</span>
          <ChevronRight size={18} className={compositionOpen ? "rotate-90" : ""} />
        </button>
        {compositionOpen && (
          <div className="px-4 pb-5 sm:px-5">
            <div className="relative mx-auto h-[176px] w-[176px]">
              <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" role="img" aria-label="Komposisi aset">
                <circle cx="100" cy="100" r="72" fill="none" stroke="rgb(var(--c-border))" strokeWidth="28" />
                {composition.map((item, index) => {
                  const circumference = 2 * Math.PI * 72;
                  const prior = composition.slice(0, index).reduce((s, x) => s + x.value, 0);
                  const dash = (item.value / compositionTotal) * circumference;
                  return <circle key={item.name} cx="100" cy="100" r="72" fill="none" stroke={item.color} strokeWidth="28" strokeDasharray={dash + " " + (circumference - dash)} strokeDashoffset={-prior / compositionTotal * circumference} />;
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-[rgb(var(--c-muted))]">Total</span>
                <span className="text-[14px] font-extrabold tabular-nums">{assetsVisible ? formatRupiah(compositionTotal) : "Rp ••••••"}</span>
              </div>
            </div>
            <div className="mt-3 space-y-1 border-t border-[rgb(var(--c-border))] pt-2">
              {composition.map(item => <div key={item.name} className="flex min-h-7 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="min-w-0 flex-1 truncate text-[12px]">{item.name}</span>
                <span className="text-[12px] font-bold tabular-nums">{pct(item.value)}</span>
              </div>)}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[24px] bg-[rgb(var(--c-surface))] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[15px] font-semibold">Kategori Aset</p><p className="text-[10px] text-[rgb(var(--c-muted))]">Kelola aset investasi dan aset riil</p></div>
          <button type="button" onClick={() => openInvestment()} className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(var(--c-forest-50))] text-[rgb(var(--c-up))]" aria-label="Tambah aset investasi"><Plus size={18} /></button>
        </div>

        <div className="mt-3 space-y-2">
          <details className="rounded-[16px] bg-[rgb(var(--c-cream))]" open={liquidOpen} onToggle={e => setLiquidOpen(e.currentTarget.open)}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0"><p className="text-[13px] font-semibold">Aset Likuid</p><p className="text-[10px] text-[rgb(var(--c-muted))]">{wallets.length} rekening · {assetsVisible ? formatRupiah(integratedLiquidTotal) : "Rp ••••••"}</p></div>
              <ChevronRight size={16} className="rotate-90" />
            </summary>
            <div className="border-t border-[rgb(var(--c-border))] px-3 py-1.5">
              {wallets.length ? wallets.map(w => <div key={w.id} className="flex min-h-11 items-center gap-2 border-b border-[rgb(var(--c-border))] last:border-0">
                <Wallet size={15} className="shrink-0 text-[rgb(var(--c-up))]" />
                <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{w.name}</p><p className="text-[10px] text-[rgb(var(--c-muted))]">{w.type}</p></div>
                <p className="text-[12px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(w.balance) : "Rp ••••••"}</p>
              </div>) : <p className="py-3 text-[11px] text-[rgb(var(--c-muted))]">Belum ada rekening.</p>}
            </div>
          </details>

          <details className="rounded-[16px] bg-[rgb(var(--c-cream))]" open={investmentOpen} onToggle={e => setInvestmentOpen(e.currentTarget.open)}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0"><p className="text-[13px] font-semibold">Aset Investasi</p><p className="text-[10px] text-[rgb(var(--c-muted))]">{investmentRows.length + (assets.stocksTotal > 0 ? 1 : 0)} jenis · {assetsVisible ? formatRupiah(investmentTotal) : "Rp ••••••"}</p></div>
              <ChevronRight size={16} className="rotate-90" />
            </summary>
            <div className="border-t border-[rgb(var(--c-border))] px-3 py-1.5">
              {investmentRows.map(row => <button key={row.name} type="button" disabled={!row.detail} onClick={() => row.detail && openInvestment(row.detail)} className="flex min-h-11 w-full items-center gap-2 border-b border-[rgb(var(--c-border))] text-left last:border-0 disabled:cursor-default">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.detail ? "rgb(var(--asset-" + (categoryOf(row.name) === "Obligasi" ? "bond" : categoryOf(row.name) === "Emas" ? "gold" : categoryOf(row.name) === "Reksadana" ? "fund" : categoryOf(row.name) === "P2P Lending" ? "p2p" : "other") + "))" : "rgb(var(--c-border))" }} />
                <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{row.name}</p><p className="truncate text-[10px] text-[rgb(var(--c-muted))]">{row.detail ? row.detail.category + " · " + row.detail.unit : "Legacy asset"}</p></div>
                <p className="text-[12px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(row.value) : "Rp ••••••"}</p>
              </button>)}
              {assets.stocksTotal > 0 && <div className="flex min-h-11 items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--asset-stock))]" />
                <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold">Saham</p><p className="text-[10px] text-[rgb(var(--c-muted))]">Portofolio Saham · Auto</p></div>
                <p className="text-[12px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(assets.stocksTotal) : "Rp ••••••"}</p>
              </div>}
              {!investmentRows.length && assets.stocksTotal <= 0 && <div className="py-3 text-[11px] text-[rgb(var(--c-muted))]">Belum ada aset investasi.</div>}
            </div>
          </details>

          <details className="rounded-[16px] bg-[rgb(var(--c-cream))]" open={realOpen} onToggle={e => setRealOpen(e.currentTarget.open)}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0"><p className="text-[13px] font-semibold">Aset Riil</p><p className="text-[10px] text-[rgb(var(--c-muted))]">{assets.realAssets.length} aset · {assetsVisible ? formatRupiah(realTotal) : "Rp ••••••"}</p></div>
              <ChevronRight size={16} className="rotate-90" />
            </summary>
            <div className="border-t border-[rgb(var(--c-border))] px-3 py-1.5">
              {assets.realAssets.length ? assets.realAssets.map(a => <button key={a.id} type="button" onClick={() => openReal(a)} className="flex min-h-11 w-full items-center gap-2 border-b border-[rgb(var(--c-border))] text-left last:border-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--c-surface))] text-[rgb(var(--c-up))]">{assetIcon(a.name)}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{a.name}</p><p className="truncate text-[10px] text-[rgb(var(--c-muted))]">Nilai awal {formatRupiah(a.initialValue)} · {a.annualChangePercent >= 0 ? "+" : ""}{a.annualChangePercent}%/tahun</p></div>
                <p className="text-[12px] font-semibold tabular-nums">{assetsVisible ? formatRupiah(a.currentValue) : "Rp ••••••"}</p>
              </button>) : <div className="py-3"><p className="text-[11px] text-[rgb(var(--c-muted))]">Belum ada aset riil.</p><button type="button" onClick={() => openReal()} className="mt-2 min-h-11 rounded-full bg-[rgb(var(--c-forest-50))] px-3 text-[11px] font-semibold text-[rgb(var(--c-up))]">+ Tambah aset riil</button></div>}
            </div>
          </details>
        </div>
      </section>

      {error && <p className="rounded-xl bg-[rgb(var(--c-rose-50))] px-3 py-2 text-[11px] text-[rgb(var(--c-down))]">{error}</p>}

      {realModal && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
        <div className="w-full max-w-lg rounded-t-[22px] bg-[rgb(var(--c-surface))] p-4 sm:rounded-[18px]">
          <div className="flex items-center justify-between"><p className="text-[15px] font-semibold">{realModal.id ? "Edit Aset Riil" : "Tambah Aset Riil"}</p><button type="button" onClick={() => setRealModal(null)} className="min-h-11 min-w-11 rounded-full">×</button></div>
          <div className="mt-3 space-y-3">
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Nama aset<input value={realForm.name} onChange={e => setRealForm({ ...realForm, name: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label>
            <label className="block text-[11px] text-[rgb(var(--c-muted))]">Nilai awal<input inputMode="numeric" value={realForm.initialValue} onChange={e => setRealForm({ ...realForm, initialValue: e.target.value.replace(/\D/g, "") })} className="mt-1 min-h-11 w-full rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-cream))] px-3 text-[13px]" /></label>
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
