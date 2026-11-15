import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, CircleAlert, Info, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { formatRupiah, getAppLanguage } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { useWallets } from "../lib/useWallets";

type Severity = "Penting" | "Disarankan" | "Info";
type Finding = {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  route: string;
};

const SEVERITY_WEIGHT: Record<Severity, number> = { Penting: 15, Disarankan: 7, Info: 2 };

export function Checkup() {
  const navigate = useNavigate();
  const id = getAppLanguage() === "id";
  const { loading, error, isRealData, transactions, assets } = useFinanceData(undefined, true);
  const { wallets, loading: walletsLoading } = useWallets();
  const [debts, setDebts] = useState<any[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(true);
  useEffect(() => { let cancelled=false; (async()=>{ try { const token=localStorage.getItem("wealthplanner_token")||sessionStorage.getItem("wealthplanner_session_token")||""; const r=await fetch("/api/debt-tracker?token="+encodeURIComponent(token)); const d=await r.json().catch(()=>({})); if(!cancelled&&r.ok)setDebts(Array.isArray(d.debts)?d.debts:[]); } finally { if(!cancelled)setDebtsLoading(false); } })(); return()=>{cancelled=true;}; }, []);

  const findings = useMemo<Finding[]>(() => {
    if (loading || walletsLoading || debtsLoading || !isRealData) return [];

    const result: Finding[] = [];
    const add = (id: string, severity: Severity, title: string, description: string, route: string) =>
      result.push({ id, severity, title, description, route });

    if (!wallets.length) {
      add("wallet-empty", "Penting", "Belum ada dompet atau rekening", "Tambahkan minimal satu rekening dan isi saldo awal agar saldo dan aset likuid bisa dihitung.", "/wallets");
    } else if (wallets.every((w) => !Number.isFinite(w.openingBalance) || w.openingBalance === 0)) {
      add("opening-balance", "Disarankan", "Saldo awal belum diisi", "Saldo awal semua dompet masih nol sehingga posisi aset likuid awal belum lengkap.", "/wallets");
    }

    const missingCategory = transactions.filter((t) => !String(t.category || "").trim());
    if (missingCategory.length) {
      add("tx-category", "Penting", "Ada transaksi tanpa kategori", `${missingCategory.length} transaksi belum memiliki kategori.`, "/transaction");
    }

    const missingWallet = transactions.filter((t) => {
      const type = String(t.type || "").toLowerCase();
      if (type === "transfer") return !String(t.wallet || "").trim() || !String(t.toWallet || "").trim();
      return !String(t.wallet || "").trim();
    });
    if (missingWallet.length) {
      add("tx-wallet", "Penting", "Ada transaksi tanpa rekening sumber", `${missingWallet.length} transaksi tidak memiliki rekening sumber yang jelas.`, "/transaction");
    }

    const purchaseAssets = [
      ...assets.investmentDetails.map((a) => ({ name: a.name, source: a.sourceAccount, tx: a.transactionId, mode: a.sourceAccount ? "purchase" : "owned" })),
      ...assets.realAssets.map((a) => ({ name: a.name, source: a.sourceAccount, tx: a.transactionId, mode: a.fundingMode })),
    ];
    const missingFunding = purchaseAssets.filter((a) => a.mode === "purchase" && !a.source);
    if (missingFunding.length) {
      add("asset-source", "Penting", "Pembelian aset tanpa rekening sumber", `${missingFunding.length} aset tercatat sebagai pembelian tetapi rekening sumber dananya belum tersambung.`, "/assets");
    }

    const orphanAssets = purchaseAssets.filter((a) => a.mode === "purchase" && !a.tx);
    if (orphanAssets.length) {
      add("asset-orphan", "Penting", "Ada aset pembelian tanpa transaksi pendukung", `${orphanAssets.length} aset pembelian tidak memiliki Transaction ID sehingga berisiko membuat pembukuan ganda.`, "/assets");
    }

    const expectedTotal =
      assets.liquidAssets.reduce((s, x) => s + Number(x.value || 0), 0) +
      assets.investmentAssets.reduce((s, x) => s + Number(x.value || 0), 0) +
      Number(assets.stocksTotal || 0) +
      Number(assets.realAssetsTotal || 0);
    const totalGap = Math.abs(Number(assets.totalAssets || 0) - expectedTotal);
    if (totalGap > 1) {
      add("asset-total", "Penting", "Total Aset tidak sinkron", `Total Aset berbeda ${formatRupiah(totalGap)} dari komponen dompet, investasi, saham, dan aset riil.`, "/assets");
    }

    const negativeWallets = wallets.filter((w) => Number(w.balance) < 0);
    if (negativeWallets.length) {
      add("negative-wallet", "Penting", "Ada saldo dompet negatif", `${negativeWallets.length} dompet memiliki saldo di bawah nol.`, "/wallets");
    }

    const staleCandidates = [...assets.investmentDetails, ...assets.stocksID, ...assets.stocksUS] as any[];
    const staleWithDate = staleCandidates.filter((a) => a.updatedAt || a.priceUpdatedAt);
    const stale = staleWithDate.filter((a) => {
      const raw = a.updatedAt || a.priceUpdatedAt;
      const time = Date.parse(String(raw));
      return Number.isFinite(time) && Date.now() - time > 30 * 86400000;
    });
    if (stale.length) {
      add("stale-price", "Disarankan", "Harga aset belum diperbarui > 30 hari", `${stale.length} aset memiliki metadata harga terakhir lebih dari 30 hari.`, "/assets");
    } else if (staleCandidates.length && !staleWithDate.length) {
      add("price-date-missing", "Info", "Riwayat pembaruan harga belum tersedia", "Metadata tanggal pembaruan harga belum tersedia, jadi Checkup tidak akan mengarang angka atau menandai aset sebagai stale tanpa bukti.", "/assets");
    }

    const realIncomplete = assets.realAssets.filter((a) => !a.acquisitionDate || !Number.isFinite(Number(a.annualChangePercent)));
    if (realIncomplete.length) {
      add("real-incomplete", "Disarankan", "Aset riil belum lengkap", `${realIncomplete.length} aset riil belum memiliki tanggal perolehan atau perubahan nilai per tahun.`, "/assets");
    }

    const creditCards = wallets.filter((w) => /kartu kredit|credit card/i.test(w.name));
    if (creditCards.length) {
      add("credit-card-detail", "Disarankan", "Detail kartu kredit belum lengkap", "Kartu kredit terdeteksi, tetapi limit, tanggal tagihan, dan jatuh tempo belum tersedia di data aplikasi.", "/wallets");
    }

    const debts = wallets.filter((w) => /utang|pinjaman|paylater|cicilan|loan|debt/i.test(w.name));
    if (debts.length) {
      add("debt-detail", "Disarankan", "Detail utang/cicilan belum lengkap", "Utang atau cicilan terdeteksi, tetapi tenor, bunga/margin, dan jatuh tempo belum tersedia.", "/wallets");
    }

    const debtMissing = debts.filter((d) => d.active && (!d.dueDate || !Number.isFinite(Number(d.annualInterestRate)) || !Number.isFinite(Number(d.minimumPayment)));
    if (debtMissing.length) add("debt-incomplete", "Penting", "Data utang belum lengkap", debtMissing.map((d) => d.name).join(", ") + " belum memiliki jatuh tempo, bunga, atau cicilan minimum yang lengkap.", "/finance");
    const overdue = debts.filter((d) => d.active && d.dueDate && new Date(d.dueDate + "T00:00:00").getTime() < new Date().setHours(0,0,0,0));
    if (overdue.length) add("debt-overdue", "Penting", "Ada jatuh tempo utang yang terlewat", overdue.map((d) => d.name).join(", ") + " memiliki tanggal jatuh tempo yang sudah lewat.", "/finance");
    const cardIncomplete = debts.filter((d) => d.active && d.type === "credit_card" && (!(Number(d.creditLimit) > 0) || !d.statementDate));
    if (cardIncomplete.length) add("debt-card-incomplete", "Penting", "Detail kartu kredit belum lengkap", cardIncomplete.map((d) => d.name).join(", ") + " belum memiliki limit atau tanggal cetak tagihan.", "/finance");

    const insurance = transactions.filter((t) => /asuransi|insurance|langganan|subscription/i.test(`${t.category} ${t.description}`));
    if (insurance.length) {
      add("schedule-detail", "Disarankan", "Jadwal pembayaran belum terstruktur", "Ada transaksi asuransi/langganan, tetapi jadwal pembayaran belum tersimpan sebagai data terstruktur.", "/transaction");
    }

    if (!assets.targets.length || assets.targets.some((t) => Number(t.targetAmount || 0) <= 0)) {
      add("target-empty", "Penting", "Target Aset belum diisi", "Isi nominal target yang jelas agar progres dan rekomendasi aset dapat dihitung.", "/assets");
    } else if (assets.targets.some((t) => Number(t.targetAmount || 0) > 0 && Number(t.targetAmount) > 1000000000000000)) {
      add("target-unreasonable", "Disarankan", "Ada Target Aset yang tidak masuk akal", "Periksa kembali nominal target yang sangat besar agar tidak menghasilkan progres yang menyesatkan.", "/assets");
    }

    add("profile-baseline", "Disarankan", "Baseline keuangan belum tersedia", "Penghasilan, pengeluaran bulanan, dan tanggungan belum tersimpan sebagai data terstruktur sehingga analisis rasio belum bisa dihitung.", "/settings");
    add("ratio-unavailable", "Info", "Rasio belum bisa dihitung", "Dana darurat, rasio utang, dan rasio tabungan membutuhkan baseline keuangan yang lengkap. Lengkapi data dulu agar tidak muncul angka contoh.", "/settings");

    const duplicateMap = new Map<string, number>();
    for (const t of transactions) {
      const key = [t.date, t.wallet, t.type, Number(t.amount), t.category, t.description].map((v) => String(v || "").trim().toLowerCase()).join("|");
      duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1);
    }
    const duplicateCount = Array.from(duplicateMap.values()).filter((n) => n > 1).reduce((s, n) => s + n - 1, 0);
    if (duplicateCount) {
      add("duplicates", "Disarankan", "Ada transaksi yang mungkin ganda", `${duplicateCount} transaksi memiliki tanggal, nominal, rekening, tipe, dan detail yang sama.`, "/transaction");
    }

    const simulatedText = [...transactions.map((t) => `${t.description} ${t.category}`), ...assets.investmentAssets.map((a) => a.name), ...assets.realAssets.map((a) => a.name)].join(" ");
    if (/\b(demo|dummy|sample|contoh|simulasi|test)\b/i.test(simulatedText)) {
      add("simulated-data", "Penting", "Ada data contoh/simulasi di akun", "Ditemukan label yang mengindikasikan data contoh atau simulasi tercampur dengan data user.", "/transaction");
    }

    return result.sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]);
  }, [loading, walletsLoading, debtsLoading, isRealData, wallets, transactions, assets, debts]);

  const score = useMemo(() => {
    if (!isRealData) return 0;
    return Math.max(0, 100 - findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  }, [findings, isRealData]);

  const important = findings.filter((f) => f.severity === "Penting").length;
  const recommended = findings.filter((f) => f.severity === "Disarankan").length;

  if (loading || walletsLoading || debtsLoading) {
    return <div className="flex min-h-[45vh] items-center justify-center"><div className="h-24 w-full max-w-xl animate-pulse rounded-3xl bg-charcoal/[0.06]" /></div>;
  }

  if (error && !isRealData) {
    return <Card><div className="py-10 text-center"><AlertTriangle className="mx-auto text-rose-500" size={28}/><p className="mt-3 font-semibold text-forest-900">Data belum bisa diperiksa</p><p className="mt-1 text-sm text-charcoal/55">{error}</p><button onClick={() => window.location.reload()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#123524] px-4 py-2.5 text-xs font-semibold text-white"><RefreshCw size={14}/> Coba lagi</button></div></Card>;
  }

  if (!isRealData) {
    return <Card><div className="py-10 text-center"><CircleAlert className="mx-auto text-charcoal/35" size={28}/><p className="mt-3 font-semibold text-forest-900">Lengkapi data dulu</p><p className="mt-1 text-sm text-charcoal/55">Checkup baru bisa berjalan setelah akun terhubung dengan data keuanganmu.</p><button onClick={() => navigate("/settings")} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#123524] px-4 py-2.5 text-xs font-semibold text-white">Buka Profil & Pengaturan <ChevronRight size={14}/></button></div></Card>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="page-title">{id ? "Checkup Keuangan" : "Financial Checkup"}</h1>
        <p className="page-sub">{id ? "Periksa kelengkapan dan konsistensi data keuanganmu." : "Check your financial data completeness and consistency."}</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-forest-100 bg-forest-50">
            <div className="text-center"><p className="text-3xl font-bold text-forest-900">{score}</p><p className="text-[10px] font-semibold text-charcoal/45">/ 100</p></div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-forest-900">{score >= 85 ? "Data cukup rapi" : score >= 60 ? "Masih ada yang perlu dilengkapi" : "Data perlu dibereskan"}</p>
            <p className="mt-1 text-[12px] text-charcoal/55">{important} temuan penting · {recommended} disarankan</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-charcoal/[0.07]"><div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${score}%` }}/></div>
          </div>
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-charcoal/8 px-4 py-3.5"><h2 className="text-[14px] font-semibold text-forest-900">Temuan Checkup</h2></div>
        {findings.length === 0 ? (
          <div className="px-4 py-12 text-center"><CheckCircle2 className="mx-auto text-forest-600" size={30}/><p className="mt-3 font-semibold text-forest-900">Tidak ada masalah ditemukan</p><p className="mt-1 text-sm text-charcoal/50">Data utama sudah konsisten.</p></div>
        ) : findings.map((finding) => (
          <div key={finding.id} className="flex items-start gap-3 border-b border-charcoal/8 px-4 py-4 last:border-0">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${finding.severity === "Penting" ? "bg-rose-50 text-rose-600" : finding.severity === "Disarankan" ? "bg-amber-50 text-amber-600" : "bg-forest-50 text-forest-600"}`}>
              {finding.severity === "Penting" ? <CircleAlert size={17}/> : finding.severity === "Disarankan" ? <AlertTriangle size={17}/> : <Info size={17}/>}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="text-[13px] font-semibold text-forest-900">{finding.title}</p><span className="rounded-full bg-charcoal/[0.06] px-2 py-1 text-[9.5px] font-semibold text-charcoal/50">{finding.severity}</span></div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-charcoal/55">{finding.description}</p>
            </div>
            <button type="button" onClick={() => navigate(finding.route)} className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-[#123524] px-3.5 text-[11px] font-semibold text-white">Perbaiki <ChevronRight size={13}/></button>
          </div>
        ))}
      </Card>
    </div>
  );
}
