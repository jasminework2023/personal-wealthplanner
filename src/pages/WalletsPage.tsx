import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Wallet as WalletIcon, Palette, Check, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallets, type Wallet } from "../lib/useWallets";
import { resolveWalletColor, walletGradient } from "../lib/walletColors";
import { formatRupiah } from "../lib/format";
import { getStoredToken } from "../lib/useFinanceData";

const presets = ["#0B4D38","#1A5FD0","#003D79","#4C3494","#0B7A52","#B02A3F","#4B5563","#7C3AED"];
export function WalletsPage() {
  const navigate = useNavigate();
  const { wallets, unassigned, totalBalance, loading, error, refresh } = useWallets();
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [mode, setMode] = useState<"auto"|"custom">("auto");
  const [color, setColor] = useState("#0B4D38");
  const [opening, setOpening] = useState("0");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { if(editing){setMode(editing.colorMode);setColor(editing.color || editing.resolvedColor);setOpening(String(editing.openingBalance));} },[editing]);
  async function save() {
    if(!editing) return;
    const token=getStoredToken(); if(!token){setNotice("Sesi tidak ditemukan. Buka dashboard melalui link akun.");return;}
    const n=Number(opening); if(!Number.isFinite(n)){setNotice("Saldo awal harus berupa angka.");return;}
    setSaving(true);setNotice("");
    try {
      const response=await fetch("/api/wallets",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,id:editing.id,color_mode:mode,color:mode==="custom"?color:null,opening_balance:n})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error||"Gagal menyimpan pengaturan wallet");
      setEditing(null); await refresh(true); setNotice("Pengaturan wallet tersimpan.");
    } catch(e){setNotice(e instanceof Error?e.message:"Gagal menyimpan pengaturan.");}
    finally{setSaving(false);}
  }
  return <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><button onClick={()=>navigate(-1)} className="rounded-full border border-slate-200 p-2" aria-label="Kembali"><ArrowLeft size={18}/></button><div><p className="text-sm text-slate-500">Keuangan</p><h1 className="text-2xl font-semibold text-slate-900">Wallet</h1></div></div>
      <button onClick={()=>void refresh(true)} className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm" disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>
    <section className="rounded-3xl bg-[#123524] p-5 text-white sm:p-7"><p className="text-sm text-[#A9C9B8]">Total saldo wallet aktif</p><p className="mt-2 text-3xl font-semibold">{formatRupiah(totalBalance)}</p><p className="mt-2 text-sm text-[#A9C9B8]">Saldo awal + pemasukan − pengeluaran + perpindahan antar-wallet</p></section>
    {error && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={18}/>{error}</div>}
    {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {loading && wallets.length===0 && <p className="py-8 text-center text-slate-500">Memuat wallet…</p>}
    {!loading && !error && wallets.length===0 && <div className="rounded-2xl border border-dashed p-6 text-center"><WalletIcon className="mx-auto mb-2 text-slate-400"/><p className="font-medium">Belum ada wallet aktif</p><p className="mt-1 text-sm text-slate-500">Tambahkan rekening atau dompet di Pengaturan. Wallet akan tersinkron otomatis.</p><button className="mt-4 rounded-full bg-[#123524] px-4 py-2 text-sm text-white" onClick={()=>navigate("/settings")}>Buka Pengaturan</button></div>}
    <div className="grid gap-4 sm:grid-cols-2">
      {wallets.map(wallet=><article key={wallet.id} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="p-5 text-white" style={{background:walletGradient(wallet.resolvedColor || resolveWalletColor(wallet.name))}}>
          <div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-wider text-white/75">{wallet.type}</p><h2 className="mt-1 text-xl font-semibold">{wallet.name}</h2></div><WalletIcon size={23}/></div>
          <p className="mt-6 text-sm text-white/75">Saldo saat ini</p><p className="mt-1 text-2xl font-semibold">{formatRupiah(wallet.balance)}</p>
        </div>
        <div className="flex items-center justify-between gap-3 p-4"><div className="text-sm text-slate-500">Saldo awal <span className="font-medium text-slate-800">{formatRupiah(wallet.openingBalance)}</span><p>{wallet.txCount} transaksi wallet</p></div><button onClick={()=>setEditing(wallet)} className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm"><Palette size={15}/> Atur</button></div>
      </article>)}
    </div>
    {unassigned.count>0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Transaksi lama belum terhubung ke wallet</p><p className="mt-1">{unassigned.count} transaksi tanpa wallet. Selisih bersih pemasukan dan pengeluaran: {formatRupiah(unassigned.net)}. Transaksi tersebut tidak dimasukkan ke total saldo wallet.</p></div>}
    {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"><section className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Atur {editing.name}</h2><button onClick={()=>setEditing(null)} className="rounded-full px-3 py-1 text-slate-500">Tutup</button></div>
      <label className="mt-5 block text-sm font-medium">Saldo awal (Rp)<input value={opening} onChange={e=>setOpening(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border p-3"/></label>
      <div className="mt-4 flex gap-2"><button onClick={()=>setMode("auto")} className={`flex-1 rounded-xl border p-3 text-sm ${mode==="auto"?"border-[#0B6B47] bg-emerald-50":""}`}>Warna otomatis</button><button onClick={()=>setMode("custom")} className={`flex-1 rounded-xl border p-3 text-sm ${mode==="custom"?"border-[#0B6B47] bg-emerald-50":""}`}>Warna custom</button></div>
      {mode==="custom" && <div className="mt-3 grid grid-cols-8 gap-2">{presets.map(c=><button key={c} onClick={()=>setColor(c)} className="flex aspect-square items-center justify-center rounded-full border-2" style={{background:c,borderColor:color===c?"#111827":"transparent"}} aria-label={c}>{color===c&&<Check size={15} color="white"/>}</button>)}</div>}
      <button onClick={()=>void save()} disabled={saving} className="mt-5 w-full rounded-full bg-[#123524] p-3 font-medium text-white disabled:opacity-60">{saving?"Menyimpan…":"Simpan perubahan"}</button>
    </section></div>}
  </div>;
}
