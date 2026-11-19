import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, GraduationCap, HeartPulse, Home, Info, PiggyBank, Plus, Shield, Trash2, WalletCards, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { formatRupiah } from "../lib/format";
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
  { type: "Jiwa", icon: HeartPulse, text: "Menjaga keluarga tetap terpenuhi kebutuhannya jika pencari nafkah meninggal dunia." },
  { type: "Kesehatan", icon: Shield, text: "Menanggung biaya rawat agar tabungan tidak habis untuk berobat." },
  { type: "Sakit kritis", icon: HeartPulse, text: "Santunan tunai saat didiagnosis penyakit berat, untuk biaya dan masa pemulihan." },
];

type InsurancePolicy = { id: string; name: string; type: "Jiwa" | "Kesehatan" | "Sakit kritis"; sumAssured: number };
const POLICY_KEY = "wealthplanner_existing_insurance_policies_v1";

function loadPolicies(): InsurancePolicy[] {
  try {
    const raw = localStorage.getItem(POLICY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePolicies(policies: InsurancePolicy[]) {
  localStorage.setItem(POLICY_KEY, JSON.stringify(policies));
}

function CurrencyInput({ value, onChange, placeholder = "0" }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  return <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-charcoal/45">Rp</span><input inputMode="numeric" value={value ? value.toLocaleString("id-ID") : ""} placeholder={placeholder} onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} className="w-full rounded-lg border border-charcoal/12 bg-white py-2.5 pl-9 pr-3 text-[13px] text-charcoal outline-none focus:border-forest-400 dark:bg-[rgb(var(--c-surface))] dark:text-[rgb(var(--c-charcoal))]" /></div>;
}

export function FinancialProtection() {
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
  const [quick, setQuick] = useState<{ id: string; existing: number; prepared: number } | null>(null);
  const [policies, setPolicies] = useState<InsurancePolicy[]>(() => loadPolicies());
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [policyFormOpen, setPolicyFormOpen] = useState(false);
  const [policyName, setPolicyName] = useState("");
  const [policyType, setPolicyType] = useState<InsurancePolicy["type"]>("Jiwa");
  const [policySum, setPolicySum] = useState(0);
  const [policyError, setPolicyError] = useState("");
  const [openPlanId, setOpenPlanId] = useState<string | null>(() => loadFinancialPlans()[0]?.id || null);
  const [openProtection, setOpenProtection] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState<string | null>(null);

  const queryPlan = new URLSearchParams(location.search).get("plan");
  useEffect(() => {
    if (queryPlan) {
      const found = plans.find((p) => p.calculatorId === queryPlan);
      if (found) { setOpenPlanId(found.id); setTimeout(() => document.getElementById(`plan-${found.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100); }
    }
  }, [queryPlan, plans]);

  const totalProtectionNeed = useMemo(() => plans.reduce((sum, p) => { const base = p.type === "home" ? (p.obligationAmount || p.targetAmount || 0) : (p.targetAmount || p.obligationAmount || 0); return sum + Math.max(base - (p.preparedAssets || 0), 0); }, 0), [plans]);
  const legacyExisting = useMemo(() => plans.reduce((sum, p) => sum + (p.existingProtection || 0), 0), [plans]);
  const totalExisting = useMemo(() => policies.length ? policies.reduce((sum, p) => sum + p.sumAssured, 0) : legacyExisting, [policies, legacyExisting]);
  const totalNeed = Math.max(totalProtectionNeed - totalExisting, 0);
  const protectedPct = totalProtectionNeed > 0 ? Math.min(100, Math.round((totalExisting / totalProtectionNeed) * 100)) : 0;

  function openAdd() { setAdding(true); setEditingId(null); setSelectedType(null); }
  function choose(type: string) { setSelectedType(type); setTarget(0); setPrepared(0); setExisting(0); setTimeframe(type === "hajj" ? 5 : 10); }
  function addPlan() {
    if (!selectedType || target <= 0) return;
    const label = manualOptions.find((x) => x.type === selectedType)?.label || getPlanTypeLabel(selectedType as any) || "Tujuan Keuangan";
    const existingPlan = editingId ? plans.find((p) => p.id === editingId) : undefined;
    saveFinancialPlan({ id: editingId || undefined, calculatorId: existingPlan?.calculatorId || `manual-${selectedType}-${Date.now()}`, type: (selectedType === "other" ? "cashflow" : selectedType) as any, name: label, targetAmount: target, preparedAssets: prepared, existingProtection: existing, timeframe });
    const next = loadFinancialPlans(); setPlans(next); if (!editingId) setOpenPlanId(next[0]?.id || null); setAdding(false); setSelectedType(null); setEditingId(null);
  }
  function saveQuick() {
    if (!quick) return;
    const plan = plans.find((x) => x.id === quick.id);
    if (!plan) { setQuick(null); return; }
    saveFinancialPlan({ ...plan, id: plan.id, existingProtection: quick.existing, preparedAssets: quick.prepared });
    setPlans(loadFinancialPlans()); setQuick(null);
  }
  function deletePlan(id: string) { removeFinancialPlan(id); const next = loadFinancialPlans(); setPlans(next); if (openPlanId === id) setOpenPlanId(next[0]?.id || null); }
  function editPlan(p: FinancialPlan) {
    if (p.calculatorId.startsWith("manual-")) {
      setAdding(true); setEditingId(p.id); setSelectedType(p.type === "cashflow" ? "other" : p.type); setTarget(p.targetAmount || p.obligationAmount || 0); setPrepared(p.preparedAssets || 0); setExisting(p.existingProtection || 0); setTimeframe(p.timeframe || 10); return;
    }
    const params = new URLSearchParams(); if (p.type === "home" && p.kprMode === "existing") params.set("mode", "existing"); params.set("planId", p.id); navigate(`/calculator/${encodeURIComponent(p.calculatorId)}?${params.toString()}`);
  }
  function addPolicy() {
    if (!policyName.trim()) { setPolicyError("Nama polis wajib diisi."); return; }
    if (!(policySum > 0)) { setPolicyError("Uang pertanggungan harus lebih dari 0."); return; }
    const next = [...policies, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: policyName.trim(), type: policyType, sumAssured: policySum }];
    setPolicies(next); savePolicies(next); setPolicyName(""); setPolicySum(0); setPolicyError(""); setPolicyFormOpen(false);
  }
  function removePolicy(id: string) { const next = policies.filter((p) => p.id !== id); setPolicies(next); savePolicies(next); }

  const hintText: Record<string, string> = {
    need: "Total dana perlindungan yang dibutuhkan keluarga jika terjadi risiko, dihitung dari semua rencanamu.",
    existing: "Uang pertanggungan dari polis yang sudah kamu miliki.",
    gap: "Selisih antara kebutuhan dan asuransi existing. Ini bagian yang belum terlindungi.",
  };
  const toggleHint = (key: string) => setHintOpen((prev) => prev === key ? null : key);

  return <div className="financial-protection-page flex flex-col gap-3">
    <Card className="overflow-hidden !p-4">
      <div className="flex flex-col gap-0">
        <div className="flex items-center justify-between gap-3 border-b border-charcoal/8 py-3">
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-charcoal/55"><span>Kebutuhan asuransi</span><button type="button" onClick={() => toggleHint("need")} aria-label="Info kebutuhan asuransi" aria-expanded={hintOpen === "need"} className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-charcoal/15 text-[10px] font-semibold text-charcoal/50"><Info size={11}/></button></div>
          <p className="shrink-0 text-right text-[14px] font-semibold tabular-nums text-charcoal">{formatRupiah(totalProtectionNeed)}</p>
        </div>
        {hintOpen === "need" && <div className="rounded-[10px] bg-forest-50 px-3 py-2.5 text-[12px] leading-[1.5] text-charcoal/60">{hintText.need}</div>}

        <div className="flex items-center justify-between gap-3 border-b border-charcoal/8 py-3">
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-charcoal/55"><span>Asuransi existing</span><button type="button" onClick={() => toggleHint("existing")} aria-label="Info asuransi existing" aria-expanded={hintOpen === "existing"} className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-charcoal/15 text-[10px] font-semibold text-charcoal/50"><Info size={11}/></button></div>
          <div className="flex min-w-0 items-center gap-2"><span className="text-[11px] text-charcoal/45">{policies.length} polis</span><p className="shrink-0 text-right text-[14px] font-semibold tabular-nums text-charcoal">{formatRupiah(totalExisting)}</p><button type="button" onClick={() => setPoliciesOpen((v) => !v)} aria-label={policiesOpen ? "Tutup daftar polis" : "Buka daftar polis"} aria-expanded={policiesOpen} className={`flex h-6 w-6 items-center justify-center text-charcoal/45 transition-transform ${policiesOpen ? "rotate-180" : ""}`}><ChevronDown size={17}/></button></div>
        </div>
        {hintOpen === "existing" && <div className="rounded-[10px] bg-forest-50 px-3 py-2.5 text-[12px] leading-[1.5] text-charcoal/60">{hintText.existing}</div>}
        {policiesOpen && <div className="pb-1">
          {policies.length === 0 ? <p className="py-2.5 text-[12.5px] text-charcoal/50">Belum ada polis</p> : <div className="divide-y divide-charcoal/8">{policies.map((p) => <div key={p.id} className="flex items-center gap-2.5 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-charcoal">{p.name}</p><p className="text-[11.5px] text-charcoal/50">{p.type}</p></div><span className="shrink-0 text-[13px] font-semibold tabular-nums text-charcoal">{formatRupiah(p.sumAssured)}</span><button type="button" onClick={() => removePolicy(p.id)} aria-label={`Hapus polis ${p.name}`} className="flex h-7 w-7 shrink-0 items-center justify-center text-charcoal/45"><X size={17}/></button></div>)}</div>}
          <button type="button" onClick={() => { setPolicyFormOpen((v) => !v); setPolicyError(""); }} className="mt-2 flex w-full items-center justify-center gap-1 rounded-[12px] bg-forest-50 py-2.5 text-[12.5px] font-semibold text-forest-700"><Plus size={14}/> Tambah polis</button>
          {policyFormOpen && <div className="mt-2 flex flex-col gap-2.5 rounded-[14px] bg-charcoal/[0.03] p-3"><input value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="Nama polis" aria-label="Nama polis" className="w-full rounded-[10px] border border-charcoal/12 bg-white px-3 py-2.5 text-[13px] text-charcoal outline-none dark:bg-[rgb(var(--c-surface))] dark:text-[rgb(var(--c-charcoal))]"/><select value={policyType} onChange={(e) => setPolicyType(e.target.value as InsurancePolicy["type"])} aria-label="Jenis polis" className="w-full rounded-[10px] border border-charcoal/12 bg-white px-3 py-2.5 text-[13px] text-charcoal outline-none dark:bg-[rgb(var(--c-surface))] dark:text-[rgb(var(--c-charcoal))]"><option>Jiwa</option><option>Kesehatan</option><option>Sakit kritis</option></select><CurrencyInput value={policySum} onChange={setPolicySum} placeholder="Uang pertanggungan (Rp)"/>{policyError && <p role="alert" className="text-[11.5px] text-rose-700">{policyError}</p>}<div className="flex gap-2"><button type="button" onClick={() => { setPolicyFormOpen(false); setPolicyError(""); }} className="flex-1 rounded-[10px] border border-charcoal/10 bg-white px-3 py-2.5 text-[12.5px] font-semibold text-charcoal dark:bg-[rgb(var(--c-surface))]">Batal</button><button type="button" onClick={addPolicy} className="flex-1 rounded-[10px] bg-charcoal px-3 py-2.5 text-[12.5px] font-semibold text-white dark:bg-[rgb(var(--c-charcoal))] dark:text-[rgb(var(--c-bg))]">Simpan</button></div></div>}
        </div>}

        <div className="py-4">
          <div className="flex items-center gap-2 text-[12.5px] text-charcoal/55"><span>Gap kebutuhan</span><button type="button" onClick={() => toggleHint("gap")} aria-label="Info gap kebutuhan" aria-expanded={hintOpen === "gap"} className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-charcoal/15 text-[10px] font-semibold text-charcoal/50"><Info size={11}/></button></div>
          {hintOpen === "gap" && <div className="mt-2 rounded-[10px] bg-forest-50 px-3 py-2.5 text-[12px] leading-[1.5] text-charcoal/60">{hintText.gap}</div>}
          <div className={`mt-1.5 text-[28px] font-bold tracking-[-0.02em] tabular-nums ${totalNeed > 0 ? "text-rose-700" : "text-forest-700"}`}>{formatRupiah(totalNeed)}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-charcoal/10"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${protectedPct}%` }}/></div>
          <div className="mt-2 flex justify-between text-[11.5px] text-charcoal/50"><span>Terlindungi {protectedPct}%</span><span>Target 100%</span></div>
        </div>
        <a href="https://www.wealthplanner.id/konsultasiasuransi" target="_blank" rel="noreferrer" className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] bg-charcoal px-5 text-[14px] font-semibold text-white">Konsultasi asuransi <ArrowRight size={14}/></a>
      </div>
    </Card>

    <div className="flex items-center justify-between gap-3 px-0.5 pt-2"><h3 className="section-title">Rencana</h3><button type="button" onClick={openAdd} aria-label="Tambah rencana" className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-3 py-1.5 text-[11.5px] font-semibold text-forest-700"><Plus size={13}/> Tambah</button></div>
    {adding && <Card className="!p-4"><div className="flex flex-col gap-3"><div><h4 className="text-[14px] font-semibold text-forest-900">Apa yang ingin kamu lindungi?</h4></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{manualOptions.map((o) => <button key={o.type} type="button" onClick={() => choose(o.type)} className={`rounded-xl border p-3 text-left ${selectedType === o.type ? "border-forest-500 bg-white dark:bg-[rgb(var(--c-surface))]" : "border-charcoal/10 bg-white/70 dark:bg-[rgb(var(--c-surface))]/70"}`}><p className="text-[13px] font-semibold text-forest-900">{o.label}</p><p className="mt-1 text-[11px] leading-4 text-charcoal/50">{o.desc}</p></button>)}</div>{selectedType && <div className="mt-1 grid gap-3 border-t border-charcoal/8 pt-4 sm:grid-cols-2"><div><label className="text-[12px] font-medium">Target / kewajiban</label><div className="mt-1"><CurrencyInput value={target} onChange={setTarget}/></div></div><div><label className="text-[12px] font-medium">Dana/aset yang sudah disiapkan</label><div className="mt-1"><CurrencyInput value={prepared} onChange={setPrepared}/></div></div><div><label className="text-[12px] font-medium">Proteksi yang sudah dimiliki</label><div className="mt-1"><CurrencyInput value={existing} onChange={setExisting}/></div></div><div><label className="text-[12px] font-medium">Jangka waktu</label><select value={timeframe} onChange={(e)=>setTimeframe(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-charcoal/12 bg-white px-3 py-2.5 text-[13px] dark:bg-[rgb(var(--c-surface))] dark:text-[rgb(var(--c-charcoal))]"><option value={1}>1 tahun</option><option value={5}>5 tahun</option><option value={10}>10 tahun</option><option value={15}>15 tahun</option><option value={20}>20 tahun</option></select></div><div className="sm:col-span-2 flex gap-2"><button type="button" onClick={addPlan} disabled={target<=0} className="rounded-lg bg-forest-600 px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40">Simpan Rencana</button><button type="button" onClick={()=>{setAdding(false);setEditingId(null);setSelectedType(null);}} className="rounded-lg border border-charcoal/10 bg-white px-4 py-2.5 text-[13px]">Batal</button></div></div>}</div></Card>}
    {plans.length === 0 && !adding && <Card className="!p-4"><div className="py-4 text-center"><p className="text-[14px] font-medium text-forest-900">Belum ada rencana yang disimpan.</p><p className="mt-1 text-[12px] text-charcoal/50">Mulai dari Kalkulator Finansial atau klik “+ Tambah”.</p></div></Card>}
    <div className="flex flex-col gap-2.5">{plans.map((p) => { const Icon=icons[p.type]||Shield; const base=p.type === "home" ? (p.obligationAmount || p.targetAmount || 0) : (p.targetAmount || p.obligationAmount || 0); const gap=Math.max(base-(p.preparedAssets||0)-(p.existingProtection||0),0); const pct=base>0?Math.min(100,Math.round(((p.preparedAssets||0)+(p.existingProtection||0))/base*100)):0; const open=openPlanId===p.id; return <Card id={`plan-${p.id}`} key={p.id} className="!p-0 overflow-hidden"><button type="button" onClick={() => setOpenPlanId(open ? null : p.id)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left"><div className="min-w-0 flex-1"><p className="text-[14px] font-semibold text-charcoal">{p.name}</p><p className="mt-0.5 text-[12px] text-charcoal/50">{p.type === "home" ? "Total Pembiayaan / Sisa Pinjaman" : "Target"} {formatRupiah(base)}</p></div><span className="shrink-0 text-[13px] font-semibold tabular-nums text-rose-700">−{formatRupiah(gap).replace("Rp ", "")}</span><ChevronDown size={17} className={`shrink-0 text-charcoal/45 transition-transform ${open ? "rotate-180" : ""}`}/></button>{open && <div className="border-t border-charcoal/8 px-4 pb-4"><div className="flex items-center justify-between gap-3 border-b border-charcoal/8 py-3"><span className="text-[12px] text-charcoal/55">Sudah disiapkan</span><span className="text-[13px] font-semibold tabular-nums text-charcoal">{formatRupiah(p.preparedAssets||0)}</span></div><div className="flex items-center justify-between gap-3 border-b border-charcoal/8 py-3"><div><p className="text-[12px] text-charcoal/55">Proteksi ada</p><button type="button" onClick={(e)=>{e.stopPropagation();setQuick({id:p.id,existing:p.existingProtection||0,prepared:p.preparedAssets||0})}} className="mt-1 text-[11px] font-semibold text-forest-700">Ubah proteksi</button></div><span className="text-[13px] font-semibold tabular-nums text-charcoal">{formatRupiah(p.existingProtection||0)}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-charcoal/10"><div className="h-full rounded-full bg-accent transition-all" style={{width:`${pct}%`}}/></div><div className="mt-2 flex justify-between text-[11px] text-charcoal/50"><span>Progress {pct}%</span><span>Target 100%</span></div>{quick?.id===p.id && <div className="mt-3 rounded-[14px] bg-charcoal/[0.03] p-3"><div className="grid gap-3 sm:grid-cols-2"><div><label className="text-[12px] font-medium">Proteksi yang sudah dimiliki</label><div className="mt-1"><CurrencyInput value={quick.existing} onChange={(v)=>setQuick({...quick,existing:v})}/></div></div><div><label className="text-[12px] font-medium">Dana/aset yang sudah disiapkan</label><div className="mt-1"><CurrencyInput value={quick.prepared} onChange={(v)=>setQuick({...quick,prepared:v})}/></div></div></div><div className="mt-3 flex gap-2"><button type="button" onClick={saveQuick} className="rounded-lg bg-forest-600 px-4 py-2 text-[12px] font-semibold text-white">Simpan</button><button type="button" onClick={()=>setQuick(null)} className="rounded-lg border border-charcoal/10 bg-white px-4 py-2 text-[12px]">Batal</button></div></div>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>editPlan(p)} className="inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-4 py-2.5 text-[12.5px] font-semibold text-white">Lihat rencana <ArrowRight size={13}/></button><button type="button" onClick={()=>deletePlan(p.id)} aria-label={`Hapus rencana ${p.name}`} className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 text-charcoal/45"><Trash2 size={15}/></button></div></div>}</Card>})}</div>

    <div className="flex items-center justify-between gap-3 px-0.5 pt-3"><h3 className="section-title">Perlindungan lain</h3></div>
    <div className="flex snap-x gap-2.5 overflow-x-auto pb-1 pr-1 [scrollbar-width:none]">{protectionCards.map((card) => { const Icon=card.icon; const open=openProtection===card.type; return <button key={card.type} type="button" onClick={()=>setOpenProtection(open ? null : card.type)} aria-expanded={open} className={`w-[128px] shrink-0 snap-start rounded-[16px] border bg-white p-3 text-left dark:bg-[rgb(var(--c-surface))] ${open ? "border-forest-500" : "border-charcoal/10"}`}><Icon size={22} className="mb-5 text-forest-600"/><span className="flex items-center justify-between gap-2 text-[13px] font-medium text-charcoal"><span>{card.type}</span><ChevronDown size={14} className={`text-charcoal/40 transition-transform ${open ? "rotate-180" : ""`}/></span></button>})}</div>
    {openProtection && <div className="rounded-[14px] border border-charcoal/10 bg-white px-3.5 py-3 text-[12.5px] leading-[1.55] text-charcoal/60 dark:bg-[rgb(var(--c-surface))]">{protectionCards.find((x) => x.type === openProtection)?.text}</div>}

    <a href="https://gri.my.id/f1/GJ5115" target="_blank" rel="noreferrer" className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] border border-charcoal/10 bg-white px-5 py-3 text-center text-[13px] font-semibold text-charcoal dark:bg-[rgb(var(--c-surface))]">Hitung kebutuhan asuransi <ArrowRight size={15}/></a>
  </div>;
}
