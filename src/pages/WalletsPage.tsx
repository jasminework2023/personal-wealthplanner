import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Wallet as WalletIcon, Palette, Check, AlertCircle, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, History, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallets, type Wallet } from "../lib/useWallets";
import { resolveWalletColor, walletGradient } from "../lib/walletColors";
import { formatRupiah } from "../lib/format";
import { getStoredToken, useFinanceData } from "../lib/useFinanceData";
import type { Transaction } from "../data/types";

const presets = ["#0B4D38","#1A5FD0","#003D79","#4C3494","#0B7A52","#B02A3F","#4B5563","#7C3AED"];
const moneyText = (n: number) => `${n < 0 ? "−" : "+"}${formatRupiah(Math.abs(n))}`;
function txDate(value: string) {
  const raw = String(value || "");
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2])-1, Number(iso[3])).getTime();
  const p = raw.split(/[/. -]/).filter(Boolean).map(Number);
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return 0;
  let [d,m,y] = p;
  if (y < 100) y += y < 50 ? 2000 : 1900;
  if (d <= 12 && m > 12) [d,m] = [m,d];
  return new Date(y,m-1,d).getTime();
}
function dateLabel(value: string) {
  const t = txDate(value);
  return t ? new Date(t).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}) : value || "—";
}
export function WalletsPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { wallets, unassigned, totalBalance, loading, error, refresh } = useWallets();
  const finance = useFinanceData(undefined, true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [mode, setMode] = useState<"auto"|"custom">("auto");
  const [color, setColor] = useState("#0B4D38");
  const [opening, setOpening] = useState("0");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("Transfer antar-wallet");
  const [transferSaving, setTransferSaving] = useState(false);
  useEffect(() => { if(editing){setMode(editing.colorMode);setColor(editing.color || editing.resolvedColor);setOpening(String(editing.openingBalance));} },[editing]);
  const selected = wallets.find((wallet) => wallet.id === selectedId) || null;
  const history = useMemo(() => {
    if (!selected) return [];
    const name = selected.name.trim().toLowerCase();
    return finance.transactions.filter((tx) =>
      String(tx.wallet || "").trim().toLowerCase() === name ||
      String(tx.toWallet || "").trim().toLowerCase() === name
    ).sort((a,b) => txDate(b.date)-txDate(a.date) || Number(b.sheetRow||0)-Number(a.sheetRow||0));
  }, [finance.transactions, selected]);
  function signedAmount(tx: Transaction) {
    const name = selected?.name.trim().toLowerCase();
    const from = String(tx.wallet || "").trim().toLowerCase() === name;
    if (tx.type === "Income") return tx.amount;
    if (tx.type === "Expense") return -tx.amount;
    if (tx.type === "Transfer" || tx.type === "Saving") {
      const to = String(tx.toWallet || "").trim().toLowerCase() === name;
      if (from && to) return 0;
      return to ? tx.amount : -tx.amount;
    }
    return tx.amount;
  }
  async function submitTransfer() {
    const amount = Number(transferAmount.replace(/[^0-9]/g, ""));
    if (!transferFrom || !transferTo || transferFrom === transferTo || !Number.isFinite(amount) || amount <= 0) { setNotice("Pilih wallet asal, wallet tujuan yang berbeda, dan nominal transfer yang valid."); return; }
    const token = getStoredToken();
    if (!token) { setNotice("Sesi tidak ditemukan. Buka dashboard melalui link akun."); return; }
    setTransferSaving(true); setNotice("");
    const now = new Date();
    const transaction: Transaction = { date: now.toLocaleDateString("id-ID"), month: now.toLocaleString("en-US", { month: "long" }), year: now.getFullYear(), type: "Transfer", category: "Transfer", description: transferNote.trim() || "Transfer antar-wallet", amount, wallet: transferFrom, toWallet: transferTo };
    try {
      const response = await fetch("/api/add-transaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, transaction }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Gagal menyimpan transfer");
      window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added", { detail: transaction }));
      setTransferOpen(false); setTransferAmount(""); setTransferNote("Transfer antar-wallet");
      await refresh(true); setNotice("Transfer berhasil dicatat.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Gagal menyimpan transfer."); }
    finally { setTransferSaving(false); }
  }
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
  return <div className={`${embedded ? "w-full space-y-5" : "mx-auto w-full max-w-5xl space-y-5 px-4 py-5 sm:px-6"}`}>
    {!embedded && <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><button onClick={()=>selected ? setSelectedId(null) : navigate(-1)} className="rounded-full border border-slate-200 p-2" aria-label="Kembali"><ArrowLeft size={18}/></button><div><p className="text-sm text-slate-500">Keuangan</p><h1 className="text-2xl font-semibold text-slate-900">{selected ? selected.name : "Wallet"}</h1></div></div>
      <button onClick={()=>void refresh(true)} className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm" disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>}
    {!selected && <section className="rounded-3xl bg-[#123524] p-5 text-white sm:p-7"><p className="text-sm text-[#A9C9B8]">Total saldo wallet aktif</p><p className="mt-2 text-3xl font-semibold">{formatRupiah(totalBalance)}</p><p className="mt-2 text-sm text-[#A9C9B8]">Saldo awal + pemasukan − pengeluaran + perpindahan antar-wallet</p></section>}
    {selected && <section className="overflow-hidden rounded-3xl text-white" style={{background:walletGradient(selected.resolvedColor || resolveWalletColor(selected.name))}}><div className="p-5 sm:p-7"><div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-wider text-white/75">{selected.type}</p><h2 className="mt-1 text-xl font-semibold">{selected.name}</h2></div><WalletIcon size={25}/></div><p className="mt-6 text-sm text-white/75">Saldo saat ini</p><p className="mt-1 text-3xl font-semibold">{formatRupiah(selected.balance)}</p><div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/20 pt-4"><div><p className="text-xs text-white/75">Saldo awal</p><p className="mt-1 font-semibold">{formatRupiah(selected.openingBalance)}</p></div><div><p className="text-xs text-white/75">Transaksi tercatat</p><p className="mt-1 font-semibold">{selected.txCount}</p></div></div><button onClick={()=>setEditing(selected)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/25"><Palette size={15}/> Atur wallet</button></div></section>}
    {error && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle size={18}/>{error}</div>}
    {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {loading && wallets.length===0 && <p className="py-8 text-center text-slate-500">Memuat wallet…</p>}
    {!selected && !loading && !error && wallets.length===0 && <div className="rounded-2xl border border-dashed p-6 text-center"><WalletIcon className="mx-auto mb-2 text-slate-400"/><p className="font-medium">Belum ada wallet aktif</p><p className="mt-1 text-sm text-slate-500">Tambahkan rekening atau dompet di Pengaturan. Wallet akan tersinkron otomatis.</p><button className="mt-4 rounded-full bg-[#123524] px-4 py-2 text-sm text-white" onClick={()=>navigate("/settings")}>Buka Pengaturan</button></div>}
    {!selected && wallets.length>0 && <div className="grid grid-cols-2 gap-3"><button onClick={()=>navigate("/transaction")} className="flex items-center justify-center gap-2 rounded-2xl bg-[#123524] px-3 py-4 text-sm font-semibold text-white"><ArrowDownLeft size={18}/> Catat transaksi</button><button onClick={()=>{setTransferFrom(wallets[0]?.name || "");setTransferTo(wallets[1]?.name || "");setTransferOpen(true);setNotice("");}} disabled={wallets.length<2} className="flex items-center justify-center gap-2 rounded-2xl border border-[#D4E5DA] bg-white px-3 py-4 text-sm font-semibold text-[#123524] disabled:opacity-40"><ArrowLeftRight size={18}/> Transfer</button></div>}
    {!selected && wallets.length > 0 && <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Wallet kamu · {wallets.length}</h2>
        <button type="button" onClick={() => navigate("/settings")} className="min-h-9 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#0B6B47] transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-[rgb(var(--c-surface))] dark:text-emerald-300 dark:hover:bg-white/5">+ Tambah</button>
      </div>
      <div className="max-h-[560px] overflow-y-auto overscroll-contain rounded-[22px]">
        <div className="relative w-full" style={{height: (wallets.length - 1) * 48 + 176}}>
          {wallets.map((wallet, index) => {
            const isFront = index === wallets.length - 1;
            const walletColor = wallet.resolvedColor || resolveWalletColor(wallet.name);
            return <button
              key={wallet.id}
              type="button"
              aria-label={`Buka detail ${wallet.name}`}
              onClick={() => { setSelectedId(wallet.id); setNotice(""); }}
              className="wallet-stack-card absolute left-0 top-0 block min-h-[48px] w-full overflow-hidden rounded-t-[22px] text-left text-white transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              style={{
                top: index * 48,
                zIndex: index + 1,
                height: isFront ? 176 : 112,
                backgroundColor: walletColor,
                boxShadow: "0 -4px 12px rgb(0 0 0 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.18)",
              }}
            >
              <div className="flex h-12 items-start justify-between gap-3 px-[18px] pt-[11px] text-base font-semibold leading-5">
                <span className="min-w-0 flex-1 truncate">{wallet.name}</span>
                <span className="shrink-0 whitespace-nowrap tabular-nums">{formatRupiah(wallet.balance)}</span>
              </div>
              {isFront && <div className="px-[18px] pb-4 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">{wallet.type}</p>
                <p className="mt-1 text-sm text-white/90">Saldo awal {formatRupiah(wallet.openingBalance)}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm text-white/90">{wallet.txCount} transaksi wallet</p>
                  <span className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-black/15 px-4 text-sm font-semibold text-white">Buka <ChevronRight size={16} className="ml-1"/></span>
                </div>
              </div>}
            </button>;
          })}
        </div>
      </div>
    </section>}
    {selected && <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 p-4 sm:p-5"><History size={18} className="text-[#0B6B47]"/><div><h2 className="font-semibold text-slate-900">Riwayat transaksi</h2><p className="text-xs text-slate-500">{history.length} transaksi terkait wallet ini</p></div></div>{finance.loading ? <p className="p-6 text-center text-sm text-slate-500">Memuat riwayat…</p> : history.length===0 ? <div className="p-8 text-center"><ReceiptIcon/><p className="mt-2 font-medium text-slate-800">Belum ada riwayat transaksi</p><p className="mt-1 text-sm text-slate-500">Transaksi baru yang memilih wallet ini akan muncul di sini.</p><button onClick={()=>navigate("/transaction")} className="mt-4 rounded-full bg-[#123524] px-4 py-2 text-sm text-white">Buka transaksi</button></div> : <div className="divide-y divide-slate-100">{history.map((tx,i)=>{const amount=signedAmount(tx);const Icon=tx.type==="Income"?ArrowDownLeft:tx.type==="Expense"?ArrowUpRight:ArrowLeftRight;return <div key={`${tx.sheetRow||"tx"}-${tx.date}-${i}`} className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${amount<0?"bg-rose-50 text-rose-600":amount>0?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}><Icon size={18}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{tx.description || tx.category}</p><p className="mt-0.5 text-xs text-slate-500">{tx.category} · {dateLabel(tx.date)}{tx.type==="Transfer"||tx.type==="Saving"?` · ${tx.wallet || "—"} → ${tx.toWallet || "—"}`:""}</p></div><p className={`shrink-0 text-right text-sm font-semibold tabular-nums ${amount<0?"text-rose-600":amount>0?"text-emerald-700":"text-slate-500"}`}>{moneyText(amount)}</p></div>})}</div>}</section>}
    {!selected && unassigned.count>0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Transaksi lama belum terhubung ke wallet</p><p className="mt-1">{unassigned.count} transaksi tanpa wallet. Selisih bersih pemasukan dan pengeluaran: {formatRupiah(unassigned.net)}. Transaksi tersebut tidak dimasukkan ke total saldo wallet.</p></div>}
    {transferOpen && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center"><section className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Dompet</p><h2 className="text-lg font-semibold text-slate-900">Transfer antar-wallet</h2></div><button onClick={()=>setTransferOpen(false)} className="rounded-full px-3 py-1 text-slate-500">Tutup</button></div><label className="mt-5 block text-sm font-medium">Dari wallet<select value={transferFrom} onChange={e=>setTransferFrom(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3">{wallets.map(w=><option key={w.id} value={w.name}>{w.name} · {formatRupiah(w.balance)}</option>)}</select></label><label className="mt-3 block text-sm font-medium">Ke wallet<select value={transferTo} onChange={e=>setTransferTo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3">{wallets.map(w=><option key={w.id} value={w.name}>{w.name}</option>)}</select></label><label className="mt-3 block text-sm font-medium">Nominal (Rp)<input value={transferAmount} onChange={e=>setTransferAmount(e.target.value)} inputMode="numeric" placeholder="Contoh: 500000" className="mt-1 w-full rounded-xl border border-slate-200 p-3"/></label><label className="mt-3 block text-sm font-medium">Catatan<input value={transferNote} onChange={e=>setTransferNote(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3"/></label><p className="mt-3 text-xs text-slate-500">Transfer dicatat sebagai perpindahan saldo, bukan pemasukan atau pengeluaran.</p><button onClick={()=>void submitTransfer()} disabled={transferSaving} className="mt-5 w-full rounded-full bg-[#123524] p-3 font-semibold text-white disabled:opacity-60">{transferSaving?"Menyimpan…":"Konfirmasi transfer"}</button></section></div>}
    {editing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"><section className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Atur {editing.name}</h2><button onClick={()=>setEditing(null)} className="rounded-full px-3 py-1 text-slate-500">Tutup</button></div><label className="mt-5 block text-sm font-medium">Saldo awal (Rp)<input value={opening} onChange={e=>setOpening(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border p-3"/></label><div className="mt-4 flex gap-2"><button onClick={()=>setMode("auto")} className={`flex-1 rounded-xl border p-3 text-sm ${mode==="auto"?"border-[#0B6B47] bg-emerald-50":""}`}>Warna otomatis</button><button onClick={()=>setMode("custom")} className={`flex-1 rounded-xl border p-3 text-sm ${mode==="custom"?"border-[#0B6B47] bg-emerald-50":""}`}>Warna custom</button></div>{mode==="custom" && <div className="mt-3 grid grid-cols-8 gap-2">{presets.map(c=><button key={c} onClick={()=>setColor(c)} className="flex aspect-square items-center justify-center rounded-full border-2" style={{background:c,borderColor:color===c?"#111827":"transparent"}} aria-label={c}>{color===c&&<Check size={15} color="white"/>}</button>)}</div>}<button onClick={()=>void save()} disabled={saving} className="mt-5 w-full rounded-full bg-[#123524] p-3 font-medium text-white disabled:opacity-60">{saving?"Menyimpan…":"Simpan perubahan"}</button></section></div>}
  </div>;
}
function ReceiptIcon() { return <History className="mx-auto text-slate-300" size={28}/>; }
