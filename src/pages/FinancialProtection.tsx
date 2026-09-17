import { useEffect, useMemo, useState } from "react";
import { ArrowRight, GraduationCap, Home, PiggyBank, Shield, Trash2, WalletCards } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { formatCompact, formatRupiah } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { FinancialPlan, getPlanTypeLabel, loadFinancialPlans, removeFinancialPlan, saveFinancialPlan } from "../lib/financialPlans";

const icons: Record<string, any> = { home: Home, education: GraduationCap, retirement: PiggyBank, hajj: Shield, investment: WalletCards, cashflow: WalletCards, income_protection: Shield, inheritance: Shield };
const manualOptions = [
  { type: "education", label: "Dana Pendidikan Anak", desc: "Target pendidikan yang ingin tetap berjalan." },
  { type: "hajj", label: "Dana Pelunasan Haji", desc: "Target pelunasan yang ingin dijaga." },
  { type: "home", label: "KPR & Rumah", desc: "Kewajiban rumah yang ingin tetap aman." },
  { type: "retirement", label: "Dana Pensiun", desc: "Target dana untuk masa pensiun." },
  { type: "marriage", label: "Pernikahan", desc: "Rencana biaya pernikahan." },
  { type: "vehicle", label: "Kendaraan", desc: "Target pembelian atau cicilan kendaraan." },
  { type: "other", label: "Tujuan Lainnya", desc: "Tambahkan tujuan keuangan lainnya." },
];

const protectionCards = [
  {
    icon: "❤️",
    title: "Asuransi Jiwa",
    intro: "Jaga kondisi finansial keluarga saat kamu sudah tidak bisa lagi mendampingi mereka.",
    body: "Asuransi jiwa bukan hanya untuk yang sudah menikah atau punya anak. Ini adalah bagian dari life planning untuk memastikan ada dana yang tetap tersedia ketika risiko terburuk terjadi.",
    benefits: ["Santunan jiwa untuk penerima manfaat", "Membantu menjaga cash flow keluarga setelah kehilangan pencari nafkah", "Membantu kebutuhan warisan", "Dapat direncanakan sebagai bagian dari wakaf", "Besaran perlindungan dapat disesuaikan dengan kebutuhan dan kemampuan finansial"],
    closing: "Intinya: bukan soal “sudah punya tanggungan atau belum”, tapi apa yang ingin kamu tinggalkan ketika suatu hari sudah tidak ada.",
  },
  {
    icon: "🩺",
    title: "Asuransi Sakit Kritis",
    intro: "Siapkan dana ketika penyakit kritis datang, tanpa harus mengorbankan seluruh aset yang sudah kamu bangun.",
    body: "Penyakit kritis bukan hanya soal biaya pengobatan. Ada kemungkinan penghasilan berhenti, aktivitas kerja terganggu, dan kebutuhan hidup tetap berjalan. Karena itu, perencanaan penyakit kritis perlu melihat biaya medis + kehilangan penghasilan + kebutuhan hidup selama pemulihan.",
    benefits: ["Santunan tunai ketika memenuhi kondisi penyakit kritis sesuai polis", "Membantu menggantikan sebagian penghasilan selama masa pemulihan", "Membantu membayar biaya non-medis", "Menjaga tabungan dan investasi agar tidak perlu dicairkan secara terpaksa", "Perlindungan dapat disesuaikan dengan kebutuhan finansial"],
    closing: "Karena saat sakit, yang perlu dilindungi bukan cuma kesehatan—tapi juga kondisi finansial.",
  },
  {
    icon: "🏥",
    title: "Asuransi Kesehatan",
    intro: "Siapkan biaya kesehatan tanpa harus mengganggu rencana keuangan yang sudah kamu bangun.",
    body: "BPJS dapat menjadi fondasi perlindungan kesehatan. Namun, setiap orang memiliki kebutuhan dan preferensi layanan yang berbeda. Asuransi kesehatan dapat menjadi lapisan perlindungan tambahan sesuai kebutuhan dan kemampuan finansial.",
    benefits: ["Perlindungan biaya rawat inap sesuai ketentuan polis", "Pilihan fasilitas dan rumah sakit sesuai jaringan produk", "Dapat mencakup manfaat rawat jalan pada produk tertentu", "Membantu mengurangi risiko pengeluaran medis besar", "Dapat disesuaikan dengan kebutuhan individu maupun keluarga"],
    closing: "Tujuannya bukan menggantikan BPJS, tapi melengkapi perlindungan sesuai kebutuhanmu.",
  },
  {
    icon: "🕋",
    title: "Program Persiapan Haji & Umroh",
    intro: "Bukan cuma menabung untuk berangkat, tapi memastikan dana ibadahmu siap ketika waktunya tiba.",
    body: "Biaya Haji dan Umroh dapat berubah seiring waktu. Karena itu, target dana sebaiknya direncanakan sejak awal—mulai dari target keberangkatan, estimasi biaya, inflasi, sampai strategi pendanaan.",
    benefits: ["Menentukan target dana Haji/Umroh", "Menghitung kebutuhan dana berdasarkan target keberangkatan", "Memperhitungkan potensi kenaikan biaya", "Menentukan target tabungan/investasi secara berkala", "Menyiapkan strategi perlindungan apabila terjadi risiko sebelum keberangkatan", "Menyesuaikan strategi dengan kemampuan cash flow"],
    closing: "Karena ibadah yang direncanakan dengan baik bukan hanya soal “ingin berangkat”, tapi juga memastikan kita siap secara finansial ketika waktunya tiba.",
  },
  {
    icon: "🤲",
    title: "Perlindungan yang Menjadi Wakaf",
    intro: "Bukan hanya melindungi yang kita cintai, tapi juga meninggalkan manfaat yang terus mengalir.",
    body: "Perlindungan dapat direncanakan agar sebagian manfaatnya menjadi wakaf, sesuai produk dan prinsip syariah yang berlaku.",
    benefits: ["Wakaf sebagian manfaat polis", "Berlandaskan prinsip syariah", "Perlindungan hari ini, amal jariyah untuk kemudian hari"],
    closing: "Perlindungan bukan hanya tentang apa yang kita terima hari ini, tapi juga manfaat yang bisa terus mengalir kemudian.",
  },
];

function CurrencyInput({ value, onChange, placeholder = "0" }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  return <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-charcoal/45">Rp</span><input inputMode="numeric" value={value ? value.toLocaleString("id-ID") : ""} placeholder={placeholder} onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} className="w-full rounded-lg border border-charcoal/12 bg-white py-2.5 pl-9 pr-3 text-[13px] text-charcoal outline-none focus:border-forest-400 dark:bg-[rgb(var(--c-surface))] dark:text-[rgb(var(--c-charcoal))]" /></div>;
}

export function FinancialProtection() {
  const { totalIncome, totalExpense, assets } = useFinanceData();
  const location = useLocation();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<FinancialPlan[]>(() => loadFinancialPlans());
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [target, setTarget] = useState(0);
  const [prepared, setPrepared] = useState(0);
  const [existing, setExisting] = useState(0);
  const [timeframe, setTimeframe] = useState(10);

  const queryPlan = new URLSearchParams(location.search).get("plan");
  useEffect(() => {
    if (queryPlan) {
      const found = plans.find((p) => p.calculatorId === queryPlan);
      if (found) setTimeout(() => document.getElementById(`plan-${found.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [queryPlan, plans]);

  const totalProtectionNeed = useMemo(() => plans.reduce((sum, p) => { const base = p.type === "home" ? (p.obligationAmount || p.targetAmount || 0) : (p.targetAmount || p.obligationAmount || 0); return sum + Math.max(base - (p.preparedAssets || 0), 0); }, 0), [plans]);
  const totalExisting = useMemo(() => plans.reduce((sum, p) => sum + (p.existingProtection || 0), 0), [plans]);
  const totalNeed = Math.max(totalProtectionNeed - totalExisting, 0);

  function openAdd() { setAdding(true); setEditingId(null); setSelectedType(null); }
  function choose(type: string) { setSelectedType(type); setTarget(0); setPrepared(0); setExisting(0); setTimeframe(type === "hajj" ? 5 : 10); }
  function addPlan() {
    if (!selectedType || target <= 0) return;
    const label = manualOptions.find((x) => x.type === selectedType)?.label || getPlanTypeLabel(selectedType as any) || "Tujuan Keuangan";
    const existingPlan = editingId ? plans.find((p) => p.id === editingId) : undefined;
    saveFinancialPlan({ id: editingId || undefined, calculatorId: existingPlan?.calculatorId || `manual-${selectedType}-${Date.now()}`, type: (selectedType === "other" ? "cashflow" : selectedType) as any, name: label, targetAmount: target, preparedAssets: prepared, existingProtection: existing, timeframe });
    setPlans(loadFinancialPlans()); setAdding(false); setSelectedType(null); setEditingId(null);
  }
  function deletePlan(id: string) { removeFinancialPlan(id); setPlans(loadFinancialPlans()); }
  function editPlan(p: FinancialPlan) {
    if (p.calculatorId.startsWith("manual-")) {
      setAdding(true); setEditingId(p.id); setSelectedType(p.type === "cashflow" ? "other" : p.type); setTarget(p.targetAmount || p.obligationAmount || 0); setPrepared(p.preparedAssets || 0); setExisting(p.existingProtection || 0); setTimeframe(p.timeframe || 10); return;
    }
    const params = new URLSearchParams();
    if (p.type === "home" && p.kprMode === "existing") params.set("mode", "existing");
    params.set("planId", p.id);
    const query = `?${params.toString()}`;
    navigate(`/calculator/${encodeURIComponent(p.calculatorId)}${query}`);
  }

  return <div className="flex flex-col gap-6">
    <div><h1 className="text-2xl font-semibold text-forest-900">Financial Protection</h1><p className="mt-1 text-[14px] text-charcoal/60">Lihat rencana yang ingin kamu jaga dan bagian yang masih perlu dipersiapkan.</p></div>

    <Card className="overflow-hidden border-forest-100 bg-gradient-to-br from-white via-forest-50/50 to-rose-50/30">
      <div className="flex flex-col gap-5">
        <div><div className="mb-2 inline-flex items-center gap-2 rounded-full bg-forest-50 px-3 py-1.5 text-[12px] font-semibold text-forest-700"><Shield size={14}/> Protection Planner</div><h2 className="text-[22px] font-semibold tracking-tight text-forest-900">Setiap rencana punya risiko.</h2><p className="mt-2 max-w-3xl text-[13px] leading-5 text-charcoal/60">Protection Planner membantu kamu melihat bagian dari rencana keuangan yang masih perlu dipersiapkan jika terjadi sesuatu yang tidak terduga.</p></div>
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-forest-100 bg-white/90 p-4"><p className="text-[11px] text-charcoal/50">Kebutuhan perlindungan</p><p className="mt-1 text-xl font-bold text-forest-900">{formatCompact(totalProtectionNeed)}</p></div><div className="rounded-2xl border border-lilac-100 bg-lilac-50/50 p-4"><p className="text-[11px] text-charcoal/50">Proteksi yang sudah dimiliki</p><p className="mt-1 text-xl font-bold text-forest-900">{formatCompact(totalExisting)}</p></div><div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4"><p className="text-[11px] text-charcoal/50">Masih perlu dilindungi</p><p className="mt-1 text-xl font-bold text-rose-700">{formatCompact(totalNeed)}</p></div></div>
        <div className="flex justify-center"><a href="https://gri.my.id/f1/GJ5115" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-700">Konsultasi dengan Life Planner <ArrowRight size={14}/></a></div>
      </div>
    </Card>

    <Card>
      <div className="flex items-center justify-between gap-4"><div><h3 className="text-[16px] font-semibold text-forest-900">Rencana yang ingin kamu lindungi</h3><p className="mt-1 text-[12px] text-charcoal/55">Tambahkan satu per satu. Rencana dari kalkulator akan otomatis muncul di sini.</p></div><button type="button" onClick={openAdd} className="inline-flex items-center gap-2 rounded-lg bg-forest-600 px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-700">+ Tambah Rencana</button></div>
      {adding && <div className="mt-5 rounded-xl border border-forest-100 bg-forest-50/40 p-4"><h4 className="font-semibold text-forest-900">Apa yang ingin kamu lindungi?</h4><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{manualOptions.map((o) => <button key={o.type} type="button" onClick={() => choose(o.type)} className={`rounded-xl border p-3 text-left ${selectedType === o.type ? "border-forest-500 bg-white dark:bg-[rgb(var(--c-surface))]" : "border-charcoal/10 bg-white/70 dark:bg-[rgb(var(--c-surface))]/70"}`}><p className="text-[13px] font-semibold text-forest-900">{o.label}</p><p className="mt-1 text-[11px] leading-4 text-charcoal/50">{o.desc}</p></button>)}</div>
        {selectedType && <div className="mt-4 grid gap-4 border-t border-charcoal/8 pt-4 sm:grid-cols-2"><div><label className="text-[12px] font-medium">Target / kewajiban</label><div className="mt-1"><CurrencyInput value={target} onChange={setTarget}/></div></div><div><label className="text-[12px] font-medium">Dana/aset yang sudah disiapkan</label><div className="mt-1"><CurrencyInput value={prepared} onChange={setPrepared}/></div></div><div><label className="text-[12px] font-medium">Proteksi yang sudah dimiliki</label><div className="mt-1"><CurrencyInput value={existing} onChange={setExisting}/></div></div><div><label className="text-[12px] font-medium">Jangka waktu</label><select value={timeframe} onChange={(e)=>setTimeframe(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-charcoal/12 bg-white px-3 py-2.5 text-[13px] dark:bg-[rgb(var(--c-surface))] dark:text-[rgb(var(--c-charcoal))]"><option value={1}>1 tahun</option><option value={5}>5 tahun</option><option value={10}>10 tahun</option><option value={15}>15 tahun</option><option value={20}>20 tahun</option></select></div><div className="sm:col-span-2 flex gap-2"><button type="button" onClick={addPlan} disabled={target<=0} className="rounded-lg bg-forest-600 px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40">Simpan Rencana</button><button type="button" onClick={()=>{setAdding(false);setEditingId(null);setSelectedType(null);}} className="rounded-lg border border-charcoal/10 bg-white px-4 py-2.5 text-[13px]">Batal</button></div></div>}
      </div>}
      {plans.length === 0 && !adding && <div className="mt-5 rounded-xl border border-dashed border-charcoal/15 p-8 text-center"><p className="text-[14px] font-medium text-forest-900">Belum ada rencana yang disimpan.</p><p className="mt-1 text-[12px] text-charcoal/50">Mulai dari Kalkulator Finansial atau klik “+ Tambah Rencana”.</p></div>}
      <div className="mt-5 grid gap-3">{plans.map((p) => { const Icon=icons[p.type]||Shield; const base=p.type === "home" ? (p.obligationAmount || p.targetAmount || 0) : (p.targetAmount || p.obligationAmount || 0); const gap=Math.max(base-(p.preparedAssets||0)-(p.existingProtection||0),0); return <div id={`plan-${p.id}`} key={p.id} className="rounded-xl border border-charcoal/10 bg-white p-4 dark:bg-[rgb(var(--c-surface))]"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-50 text-forest-700"><Icon size={18}/></div><div><p className="text-[14px] font-semibold text-forest-900">{p.name}</p><p className="mt-0.5 text-[11px] text-charcoal/45">{p.calculatorId.startsWith("manual-")?"Ditambahkan manual":"Dari Kalkulator Finansial"}{p.timeframe?` · ${p.timeframe} tahun`:""}</p></div></div><div className="flex items-center gap-1"><button type="button" onClick={()=>editPlan(p)} className="rounded-lg px-2.5 py-2 text-[11px] font-semibold text-forest-700 hover:bg-forest-50">Edit</button><button type="button" onClick={()=>deletePlan(p.id)} className="rounded-lg p-2 text-charcoal/35 hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus rencana"><Trash2 size={15}/></button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><div><p className="text-[10px] uppercase tracking-wide text-charcoal/40">{p.type === "home" ? "Total Pembiayaan / Sisa Pinjaman" : "Target"}</p><p className="mt-1 text-[13px] font-semibold">{formatRupiah(base)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-charcoal/40">Sudah disiapkan</p><p className="mt-1 text-[13px] font-semibold">{formatRupiah(p.preparedAssets||0)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-charcoal/40">Proteksi</p><p className="mt-1 text-[13px] font-semibold">{formatRupiah(p.existingProtection||0)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-charcoal/40">Masih perlu dilindungi</p><p className={`mt-1 text-[14px] font-bold ${gap>0?"text-rose-700":"text-forest-700"}`}>{formatRupiah(gap)}</p></div></div><button type="button" onClick={()=>navigate(`/protection?plan=${encodeURIComponent(p.calculatorId)}`)} className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-forest-700">Lihat rencana <ArrowRight size={13}/></button></div>})}</div>
    </Card>


    <Card>
      <h3 className="text-[16px] font-semibold text-forest-900">Lengkapi Perlindunganmu</h3>
      <p className="mt-1 text-[12px] text-charcoal/55">Kenali beberapa area perlindungan yang dapat membantu menjaga aset, penghasilan, kesehatan, dan kondisi finansial keluarga.</p>
      <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3 pr-1 [scrollbar-width:thin]">
        {protectionCards.map((card) => <article key={card.title} className="w-[min(84vw,360px)] shrink-0 snap-start rounded-2xl border border-charcoal/10 bg-white p-5 shadow-sm">
          <div className="text-2xl" aria-hidden="true">{card.icon}</div>
          <h4 className="mt-3 text-[15px] font-semibold text-forest-900">{card.title}</h4>
          <p className="mt-2 text-[12px] font-medium leading-5 text-charcoal/70">{card.intro}</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-forest-700">Manfaat yang dapat direncanakan</p>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-charcoal/60">{card.benefits.map((x) => <li key={x}>✓ {x}</li>)}</ul>
          <p className="mt-4 border-t border-charcoal/8 pt-3 text-[11px] italic leading-4 text-charcoal/55">{card.closing}</p>
        </article>)}
      </div>
    </Card>

    <Card><h3 className="text-[16px] font-semibold text-forest-900">Ringkasan Perlindungan</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-charcoal/3 p-4"><p className="text-[11px] text-charcoal/50">Total kebutuhan perlindungan</p><p className="mt-1 text-[17px] font-semibold">{formatCompact(totalProtectionNeed)}</p></div><div className="rounded-xl bg-charcoal/3 p-4"><p className="text-[11px] text-charcoal/50">Proteksi yang sudah dimiliki</p><p className="mt-1 text-[17px] font-semibold">{formatCompact(totalExisting)}</p></div><div className="rounded-xl bg-forest-50 p-4"><p className="text-[11px] text-charcoal/50">Masih perlu dilindungi</p><p className="mt-1 text-[17px] font-semibold text-forest-800">{formatCompact(totalNeed)}</p></div></div><p className="mt-4 text-[12px] leading-5 text-charcoal/55">Angka ini bukan berarti kamu harus memenuhi seluruhnya dengan asuransi. Kamu bisa mengombinasikan aset, tabungan, penghasilan pasangan, dan perlindungan yang sudah dimiliki sesuai kondisi keuanganmu.</p></Card>

    <Card><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-[16px] font-semibold text-forest-900">Our Website</h3><p className="mt-1 text-[12px] text-charcoal/55">Pelajari layanan dan informasi Wealthplanner lebih lanjut.</p></div><a href="https://www.wealthplanner.id" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-forest-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-forest-700 hover:bg-forest-50">Visit Wealthplanner.id <ArrowRight size={14}/></a></div><div className="mt-3 flex items-center gap-3 rounded-xl bg-forest-50/60 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-900 text-sm font-bold text-white">W</div><span className="text-[13px] font-semibold text-forest-900">wealthplanner.id</span></div></Card>
  </div>;
}
