/* Real calculator engine ported from wealthplanner.id public calculator. */
// @ts-nocheck
import React from "react";
import { ArrowRight, Check, Plus, Activity, TrendingUp, Shield, Home, GraduationCap, Clock, CreditCard, CircleArrowUp, Scale, ChevronRight } from "lucide-react";
import { useFinanceData } from "../lib/useFinanceData";
import { loadFinancialPlans } from "../lib/financialPlans";
import { getAppLanguage } from "../lib/format";

export const CALCULATOR_META = [
  { id: "checkup", title: "Financial Check-Up", desc: "Cek kesehatan cashflow, utang, dana darurat, dan likuiditas.", titleEn: "Financial Check-Up", descEn: "Check the health of your cash flow, debt, emergency fund, and liquidity." },
  { id: "rumah", title: "KPR", desc: "Simulasikan KPR konvensional atau syariah dengan skenario cicilan.", titleEn: "Mortgage", descEn: "Simulate conventional or Sharia-compliant mortgages and compare monthly payments." },
  { id: "edu", title: "Dana Pendidikan", desc: "Hitung kebutuhan biaya pendidikan sampai anak lulus.", titleEn: "Education Fund", descEn: "Calculate education costs until your child graduates." },
  { id: "pension", title: "Dana Pensiun", desc: "Proyeksikan kebutuhan pensiun dan tabungan bulanan.", titleEn: "Retirement Fund", descEn: "Project your retirement needs and monthly savings." },
  { id: "warisan", title: "Perencanaan Warisan", desc: "Simulasikan pembagian aset berdasarkan input ahli waris.", titleEn: "Inheritance Planning", descEn: "Simulate how assets are divided based on your heirs." },
  { id: "haji", title: "Haji & Umroh", desc: "Rencanakan target biaya dan budget pelunasan.", titleEn: "Hajj & Umrah", descEn: "Plan your target cost and payoff budget." },
  { id: "zakat", title: "Zakat dan Wakaf", desc: "Simulasikan zakat penghasilan, zakat maal, dan wakaf.", titleEn: "Zakat & Waqf", descEn: "Simulate income zakat, wealth zakat (zakat maal), and waqf." },
  { id: "invest", title: "Investasi", desc: "Hitung kebutuhan investasi rutin untuk mencapai target.", titleEn: "Investing", descEn: "Calculate the regular investment needed to reach your target." },
  { id: "insurance", title: "Kebutuhan Asuransi", desc: "Estimasi kebutuhan uang pertanggungan berdasarkan income.", titleEn: "Insurance Needs", descEn: "Estimate the coverage amount you need based on income." }
];

const COLORS = ["#7C9CFF", "#C6F24E", "#FFB800", "#E5A4FF", "#5EE5B0", "#FF9A6B"];

const HUB_SECTIONS = [
  { key: "tools", title: { id: "TOOLS", en: "TOOLS" }, items: [
    { id: "checkup", icon: Activity, text: { id: { title: "Financial Checkup", desc: "Cek cashflow, utang, dana darurat, dan likuiditas" }, en: { title: "Financial Checkup", desc: "Check cash flow, debt, emergency fund, and liquidity" } } },
    { id: "invest", icon: TrendingUp, text: { id: { title: "Investasi", desc: "Setoran rutin untuk capai target" }, en: { title: "Investing", desc: "Regular contributions to reach your goal" } } },
    { id: "insurance", icon: Shield, text: { id: { title: "Asuransi", desc: "Uang pertanggungan ideal dari income" }, en: { title: "Insurance", desc: "Ideal coverage amount based on income" } } },
  ] },
  { key: "life-plans", title: { id: "RENCANA HIDUP", en: "LIFE PLANS" }, items: [
    { id: "rumah", icon: Home, text: { id: { title: "Rumah", desc: "KPR atau sewa, konvensional maupun syariah" }, en: { title: "Home", desc: "Mortgage or rent, conventional or Sharia-compliant" } } },
    { id: "edu", icon: GraduationCap, text: { id: { title: "Dana Pendidikan", desc: "Biaya sampai anak lulus" }, en: { title: "Education Fund", desc: "Costs until your child graduates" } } },
    { id: "pension", icon: Clock, text: { id: { title: "Dana Pensiun", desc: "Kebutuhan pensiun & tabungan bulanan" }, en: { title: "Retirement Fund", desc: "Retirement needs & monthly savings" } } },
    { id: "haji", icon: CreditCard, text: { id: { title: "Haji", desc: "Target biaya & budget pelunasan" }, en: { title: "Hajj", desc: "Target cost & payoff budget" } } },
    { id: "zakat", icon: CircleArrowUp, text: { id: { title: "Zakat dan Wakaf", desc: "Zakat maal, penghasilan, dan wakaf" }, en: { title: "Zakat & Waqf", desc: "Zakat on wealth, income, and waqf" } } },
    { id: "warisan", icon: Scale, text: { id: { title: "Warisan", desc: "Pembagian aset ke ahli waris" }, en: { title: "Inheritance", desc: "Dividing assets among heirs" } } },
  ] },
] as const;


function formatIDR(n) {
  return Number(n || 0).toLocaleString("id-ID");
}
function formatThousands(n) {
  return Number(n || 0).toLocaleString("id-ID");
}
function Button({ children, variant="primary", size, onClick, icon, iconRight, style }) {
  return <button type="button" onClick={onClick} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,borderRadius:10,border:variant==="outline"?"1px solid rgba(15,61,46,.18)":"1px solid transparent",padding:size==="sm"?"9px 13px":"11px 15px",fontSize:13,fontWeight:600,cursor:"pointer",background:variant==="primary"?"rgb(var(--c-accent-text))":variant==="secondary"?"rgb(var(--c-cream))":"transparent",color:variant==="primary"?"white":"rgb(var(--c-charcoal))",...style}}>{icon}{children}{iconRight}</button>;
}
function Tag({ children, variant="default" }) { return <span style={{display:"inline-flex",alignItems:"center",borderRadius:999,padding:"5px 9px",fontSize:10,fontWeight:700,letterSpacing:".04em",background:variant==="accent"?"rgb(var(--c-forest-50))":"rgb(var(--c-cream))",color:"rgb(var(--c-forest-800))",border:variant==="outline"?"1px solid rgb(var(--c-border))":"1px solid transparent"}}>{children}</span>; }
function Section({ children, style }) { return <section style={style}><div style={{maxWidth:1200,margin:"0 auto"}}>{children}</div></section>; }
function NumberInput({ label, value, onChange, prefix, suffix, min=0, step=1, hint }) {
  const [raw,setRaw]=React.useState(null);
  const display=raw!==null?raw:formatThousands(value);
  return <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"rgb(var(--c-forest-800))",marginBottom:7}}>{label}</label><div style={{display:"flex",alignItems:"stretch"}}>{prefix&&<div style={{padding:"0 11px",display:"flex",alignItems:"center",background:"rgb(var(--c-cream))",border:"1px solid rgb(var(--c-border))",borderRight:0,borderRadius:"10px 0 0 10px",color:"rgb(var(--c-muted))",fontSize:12}}>{prefix}</div>}<input inputMode="numeric" value={display} onChange={e=>{const d=e.target.value.replace(/[^0-9]/g,"");setRaw(d);if(d!=="")onChange(Number(d));}} onBlur={()=>{const n=raw===""||raw===null?min:Number(raw);onChange(Math.max(min,n));setRaw(null)}} style={{width:"100%",border:"1px solid rgb(var(--c-border))",borderRadius:prefix?(suffix?0:"0 10px 10px 0"):(suffix?"10px 0 0 10px":10),padding:"11px 12px",outline:"none",fontSize:13,boxSizing:"border-box"}}/>{suffix&&<div style={{padding:"0 11px",display:"flex",alignItems:"center",background:"rgb(var(--c-cream))",border:"1px solid rgb(var(--c-border))",borderLeft:0,borderRadius:"0 10px 10px 0",color:"rgb(var(--c-muted))",fontSize:12}}>{suffix}</div>}</div>{hint&&<div style={{fontSize:11,color:"rgb(var(--c-muted))",marginTop:5}}>{hint}</div>}</div>;
}
function Slider({ label,value,onChange,min,max,step=1,format }) { return <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:12,fontWeight:600,color:"rgb(var(--c-forest-800))"}}>{label}</span><span style={{fontSize:12,fontWeight:700,color:"rgb(var(--c-charcoal))"}}>{format?format(value):value}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%"}}/></div>; }
function ResultTile({ label,value,sub }) { return <div style={{background:"rgb(var(--c-forest-50))",border:"1px solid rgb(var(--c-forest-100))",borderRadius:16,padding:"22px 22px 24px"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:".08em",color:"rgb(var(--c-forest-800))"}}>{label}</div><div style={{fontSize:"clamp(30px,4vw,48px)",lineHeight:1.05,fontWeight:800,color:"rgb(var(--c-accent-text))",marginTop:9}}>{value}</div>{sub&&<div style={{fontSize:12,color:"rgb(var(--c-forest-800))",marginTop:9}}>{sub}</div>}</div>; }
function ScoreRow({ label, value, status, target }) {
  const color = status === "good" ? "#2e9e6b" : status === "ok" ? "#e0a100" : "#d64545";
  return <div className="card card-tight row-between" style={{background:"rgb(var(--c-surface))",border:"1px solid rgb(var(--c-border))",borderRadius:14,padding:"12px 14px",alignItems:"center"}}>
    <div><div style={{fontSize:14,fontWeight:600,color:"rgb(var(--c-charcoal))"}}>{label}</div><div className="muted mono" style={{fontSize:11,marginTop:2}}>target {target}</div></div>
    <div style={{display:"flex",alignItems:"center",gap:12}}><span className="mono" style={{fontWeight:600,color:"rgb(var(--c-charcoal))"}}>{value}</span><span style={{width:10,height:10,borderRadius:999,background:color,display:"inline-block"}}/></div>
  </div>;
}
function Card({children,style}) { return <div className="wp-calc-card" style={{background:"rgb(var(--c-surface))",border:"1px solid rgb(var(--c-border))",borderRadius:16,padding:18,...style}}>{children}</div>; }

function CalculatorBody({ id, onSaveResult, onNavigate }) {
  switch (id) {
    case "checkup": return <CheckupCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
    case "rumah": return <RumahCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
    case "edu": return <EduCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
    case "pension": return <PensionCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
    case "warisan": return <WarisanCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
    case "haji": return <HajiCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
    case "zakat": return <ZakatCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
    case "invest": return <InvestCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
    case "insurance": return <InsuranceCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
    default: return <CheckupCalc onSaveResult={onSaveResult} onNavigate={onNavigate} />;
  }
}

// ============================================================
// 1. FINANCIAL CHECKUP
// ============================================================
function CheckupCalc({ onSaveResult, onNavigate }) {
  const { totalIncome, totalExpense, assets, isRealData, month } = useFinanceData();
  const [language, setLanguage] = React.useState(getAppLanguage());
  const [loans, setLoans] = React.useState([
    { id: "kpr", name: "KPR", payment: 5503098, years: 20, principal: 800000000 },
    { id: "kendaraan", name: "Kendaraan", payment: 1500000, years: 2, principal: 30000000 },
  ]);
  const [readiness, setReadiness] = React.useState(65);
  const [protectionScore, setProtectionScore] = React.useState(0);
  const [hasProtectionScore, setHasProtectionScore] = React.useState(false);
  const [showGradeInfo, setShowGradeInfo] = React.useState(false);
  const isId = language === "id";
  const finite = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const money = (v) => new Intl.NumberFormat(isId ? "id-ID" : "en-US", { maximumFractionDigits: 0 }).format(finite(v));
  const decimal = (v) => new Intl.NumberFormat(isId ? "id-ID" : "en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(finite(v));
  const percent = (v) => decimal(v) + "%";

  React.useEffect(() => {
    const updateLanguage = () => setLanguage(getAppLanguage());
    window.addEventListener("wealthplanner:language-changed", updateLanguage);
    return () => window.removeEventListener("wealthplanner:language-changed", updateLanguage);
  }, []);
  React.useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("wp-calc-insurance") || "null");
      const valid = stored && Number.isFinite(Number(stored.protectionScore));
      setProtectionScore(valid ? Math.min(20, Math.max(0, Number(stored.protectionScore))) : 0);
      setHasProtectionScore(!!valid);
    } catch { setProtectionScore(0); setHasProtectionScore(false); }
  }, []);

  const income = Math.max(0, finite(isRealData ? totalIncome : 20000000));
  const expenses = Math.max(0, finite(isRealData ? totalExpense : 16000000));
  const cash = isRealData ? (assets?.liquidAssets || []).reduce((s, x) => s + Math.max(0, finite(x?.value)), 0) : 40000000;
  const investments = isRealData ? (assets?.investmentAssets || []).reduce((s, x) => s + Math.max(0, finite(x?.value)), 0) : 0;
  const safeLoans = loans.map((l) => ({ ...l, payment: Math.max(0, finite(l.payment)), years: Math.min(50, Math.max(0, finite(l.years))), principal: Math.max(0, finite(l.principal)) }));
  const totalPayments = safeLoans.reduce((s, l) => s + l.payment, 0);
  const debtOutstanding = safeLoans.reduce((s, l) => s + l.principal, 0);
  const dsr = income > 0 ? totalPayments / income * 100 : totalPayments > 0 ? 100 : 0;
  const emergencyMonths = expenses > 0 ? cash / expenses : 0;
  const savingRate = income > 0 ? Math.max(0, (income - expenses) / income * 100) : 0;
  const emergencyPoints = Math.round(Math.min(1, emergencyMonths / 6) * 20);
  const dsrPoints = Math.round(dsr <= 20 ? 20 : dsr <= 30 ? 20 - (dsr - 20) * .6 : dsr <= 40 ? 14 - (dsr - 30) * .6 : dsr < 50 ? 8 - (dsr - 40) * .8 : 0);
  const savingPoints = Math.round(Math.min(1, savingRate / 25) * 20);
  const insurancePoints = Math.round(protectionScore);
  const readinessPoints = Math.round(Math.min(100, Math.max(0, finite(readiness))) / 100 * 20);
  const score = [emergencyPoints, dsrPoints, savingPoints, insurancePoints, readinessPoints].reduce((s, v) => s + Math.min(20, Math.max(0, finite(v))), 0);
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "E";
  const gradeName = (isId ? { A: "Sangat Sehat", B: "Baik", C: "Sehat", D: "Waspada", E: "Kritis" } : { A: "Excellent", B: "Good", C: "Healthy", D: "Needs attention", E: "Critical" })[grade];
  const nextThreshold = score < 70 ? 70 : score < 85 ? 85 : null;
  const pointsToNext = nextThreshold === null ? 0 : nextThreshold - score;
  const dsrStatus = dsr <= 30 ? (isId ? "Sehat" : "Healthy") : dsr <= 40 ? (isId ? "Waspada" : "Caution") : (isId ? "Tinggi" : "High");

  React.useEffect(() => {
    try { window.localStorage.setItem("wp-calc-checkup", JSON.stringify({ debtOutstanding })); } catch { /* storage unavailable */ }
  }, [debtOutstanding]);

  const updateLoan = (id, key, value) => setLoans((prev) => prev.map((l) => l.id === id ? { ...l, [key]: value } : l));
  const addLoan = () => setLoans((prev) => prev.length >= 10 ? prev : [...prev, { id: "loan-" + Date.now() + "-" + prev.length, name: "", payment: 0, years: 0, principal: 0 }]);
  const inputStyle = { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "10px", border: "1px solid rgb(var(--c-border))", borderRadius: 10, background: "rgb(var(--c-surface))", color: "rgb(var(--c-charcoal))", fontSize: 13 };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "rgb(var(--c-muted))", marginBottom: 5 };
  const rows = [
    { key: "emergency", label: isId ? "Dana darurat" : "Emergency fund", value: decimal(emergencyMonths) + (isId ? " bulan" : " months"), points: emergencyPoints, hint: isId ? "Target 6 bulan pengeluaran" : "Target: 6 months of expenses" },
    { key: "dsr", label: isId ? "Rasio cicilan (DSR)" : "Debt service ratio (DSR)", value: percent(dsr), points: dsrPoints, hint: isId ? "Idealnya maksimal 30% penghasilan" : "Ideally no more than 30% of income" },
    { key: "saving", label: isId ? "Tingkat menabung" : "Savings rate", value: percent(savingRate), points: savingPoints, hint: isId ? "Target 25% atau lebih" : "Target: 25% or higher" },
    { key: "insurance", label: isId ? "Proteksi asuransi" : "Insurance protection", value: insurancePoints + "/20", points: insurancePoints, hint: hasProtectionScore ? (isId ? "Berdasarkan skor proteksi tersimpan" : "Based on saved protection score") : (isId ? "Belum dihitung di kalkulator Proteksi" : "Not yet calculated in Protection calculator") },
    { key: "readiness", label: isId ? "Kesiapan finansial" : "Financial readiness", value: Math.round(readiness) + "%", points: readinessPoints, hint: isId ? "Penilaian kesiapan finansialmu" : "Your self-assessed financial readiness" },
  ];

  return <CalcLayout inputs={<div style={{ display: "grid", gap: 16 }}>
    <div style={{ padding: "11px 13px", background: "rgb(var(--c-cream))", borderRadius: 12, border: "1px solid rgb(var(--c-border))", fontSize: 11, color: "rgb(var(--c-muted))", lineHeight: 1.6 }}>
      {isId ? "Sumber data" : "Data source"}: {isRealData ? "Dashboard Finance · " + month : (isId ? "mode demo" : "demo mode")}. {isId ? "Penghasilan, pengeluaran, kas, dan investasi mengikuti data dashboard." : "Income, expenses, cash, and investments follow dashboard data."}
    </div>
    <div>
      <div className="row-between" style={{ marginBottom: 8 }}><h4 style={{ margin: 0 }}>{isId ? "Cicilan dan utang" : "Loans and debt"}</h4><span style={{ fontSize: 11, color: "rgb(var(--c-muted))" }}>{loans.length}/10</span></div>
      {safeLoans.map((loan, index) => <div key={loan.id} style={{ padding: "12px 0", borderBottom: "1px dashed rgb(var(--c-border))" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input aria-label={isId ? "Nama pinjaman " + (index + 1) : "Loan name " + (index + 1)} value={loan.name} onChange={(e) => updateLoan(loan.id, "name", e.target.value)} placeholder={isId ? "Nama pinjaman" : "Loan name"} style={inputStyle}/>
          <button type="button" onClick={() => setLoans((prev) => prev.filter((l) => l.id !== loan.id))} aria-label={isId ? "Hapus pinjaman" : "Remove loan"} style={{ border: "1px solid rgb(var(--c-border))", background: "rgb(var(--c-surface))", color: "rgb(var(--c-muted))", borderRadius: 9, padding: "9px 10px", cursor: "pointer", whiteSpace: "nowrap", fontSize: 11 }}>{isId ? "Hapus" : "Remove"}</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 9 }}>
          <div><label style={labelStyle}>{isId ? "Cicilan/bulan" : "Monthly payment"}</label><NumberInput label="" prefix="Rp" value={loan.payment} onChange={(v) => updateLoan(loan.id, "payment", v)} step={100000}/></div>
          <div><label style={labelStyle}>{isId ? "Sisa tenor" : "Remaining term"}</label><NumberInput label="" value={loan.years} onChange={(v) => updateLoan(loan.id, "years", Math.min(50, Math.max(0, v)))} suffix={isId ? "th" : "yrs"} step={1}/></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={labelStyle}>{isId ? "Sisa pokok utang" : "Outstanding principal"}</label><NumberInput label="" prefix="Rp" value={loan.principal} onChange={(v) => updateLoan(loan.id, "principal", v)} step={5000000}/></div>
        </div>
      </div>)}
      <button type="button" onClick={addLoan} disabled={loans.length >= 10} style={{ marginTop: 12, width: "100%", padding: 11, borderRadius: 11, border: "1px dashed rgb(var(--c-border))", background: "transparent", color: "rgb(var(--c-accent-text))", fontWeight: 700, cursor: loans.length >= 10 ? "not-allowed" : "pointer", opacity: loans.length >= 10 ? .5 : 1 }}>+ {isId ? "Tambah pinjaman" : "Add loan"}</button>
      <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: "rgb(var(--c-forest-50))", border: "1px solid rgb(var(--c-forest-100))" }}>
        <div style={{ fontSize: 11, color: "rgb(var(--c-muted))" }}>{isId ? "Total cicilan per bulan" : "Total monthly payments"}</div><div style={{ fontSize: 22, fontWeight: 800, color: "rgb(var(--c-charcoal))", marginTop: 4 }}>Rp {money(totalPayments)}</div>
        <div className="row-between" style={{ marginTop: 10, gap: 8, fontSize: 12 }}><span>DSR · {percent(dsr)}</span><strong style={{ color: "rgb(var(--c-accent-text))" }}>{dsrStatus}</strong></div>
        <div style={{ height: 8, background: "rgb(var(--c-border))", borderRadius: 99, position: "relative", marginTop: 9 }}><div style={{ height: "100%", width: Math.min(100, Math.max(0, dsr)) + "%", background: dsr <= 30 ? "rgb(var(--c-accent))" : dsr <= 40 ? "rgb(var(--c-muted))" : "rgb(var(--c-down))", borderRadius: 99 }}/><div aria-hidden="true" style={{ position: "absolute", left: "30%", top: -3, height: 14, borderLeft: "2px solid rgb(var(--c-charcoal))" }}/></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgb(var(--c-muted))", marginTop: 5 }}><span>0%</span><span>30%</span><span>100%</span></div>
      </div>
    </div>
    <div style={{ padding: 15, border: "1px solid rgb(var(--c-border))", borderRadius: 14 }}>
      <div className="row-between" style={{ marginBottom: 8 }}><label htmlFor="checkup-readiness" style={{ fontWeight: 700, fontSize: 13 }}>{isId ? "Kesiapan finansial" : "Financial readiness"}</label><strong style={{ color: "rgb(var(--c-accent-text))" }}>{Math.round(readiness)}%</strong></div>
      <input id="checkup-readiness" aria-label={isId ? "Kesiapan finansial" : "Financial readiness"} type="range" min="0" max="100" step="5" value={readiness} onChange={(e) => setReadiness(Number(e.target.value))} style={{ width: "100%", accentColor: "rgb(var(--c-accent))" }}/>
      <div style={{ fontSize: 11, color: "rgb(var(--c-muted))", lineHeight: 1.5 }}>{isId ? "Geser sesuai penilaianmu terhadap kesiapan mencapai tujuan finansial." : "Adjust based on how ready you feel to reach your financial goals."}</div>
    </div>
  </div>} results={<div style={{ display: "grid", gap: 16, minWidth: 0 }}>
    <div style={{ background: "rgb(var(--c-forest-50))", border: "1px solid rgb(var(--c-forest-100))", borderRadius: 24, padding: 20, overflow: "hidden" }}>
      <div className="row-between" style={{ alignItems: "flex-start", gap: 10 }}><div><div style={{ fontSize: 11, letterSpacing: ".08em", fontWeight: 700, color: "rgb(var(--c-muted))" }}>{isId ? "SKOR KEUANGANMU" : "YOUR FINANCIAL SCORE"}</div><div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{gradeName}</div></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ fontSize: 48, lineHeight: 1, fontWeight: 800, color: "rgb(var(--c-accent-text))" }}>{grade}</div><button type="button" aria-expanded={showGradeInfo} aria-label={isId ? "Penjelasan nilai" : "Grade explanation"} onClick={() => setShowGradeInfo((v) => !v)} style={{ width: 25, height: 25, borderRadius: "50%", border: "1px solid rgb(var(--c-border))", background: "rgb(var(--c-surface))", color: "rgb(var(--c-charcoal))", cursor: "pointer" }}>!</button></div></div>
      {showGradeInfo && <p style={{ fontSize: 12, lineHeight: 1.6, color: "rgb(var(--c-muted))", margin: "10px 0 0" }}>{isId ? "A: sangat sehat (85–100); B: baik (70–84); C: sehat (55–69); D: perlu perhatian (40–54); E: kritis (di bawah 40)." : "A: excellent (85–100); B: good (70–84); C: healthy (55–69); D: needs attention (40–54); E: critical (below 40)."}</p>}
      <div style={{ display: "flex", justifyContent: "center", margin: "16px auto 8px" }}><svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label={isId ? "Skor " + score + " dari 100" : "Score " + score + " out of 100"}><circle cx="85" cy="85" r="72" fill="none" stroke="rgb(var(--c-border))" strokeWidth="14"/><circle cx="85" cy="85" r="72" fill="none" stroke="rgb(var(--c-accent))" strokeWidth="14" strokeLinecap="round" strokeDasharray={(score / 100 * 452.4) + " 452.4"} transform="rotate(-90 85 85)"/><text x="85" y="82" textAnchor="middle" fontSize="38" fontWeight="800" fill="rgb(var(--c-accent-text))">{score}</text><text x="85" y="106" textAnchor="middle" fontSize="13" fill="rgb(var(--c-muted))">/100</text></svg></div>
      <div style={{ textAlign: "center", fontSize: 12, color: "rgb(var(--c-muted))" }}>{nextThreshold === null ? (isId ? "Grade tertinggi — pertahankan!" : "Top grade — keep it up!") : (isId ? "Butuh " + pointsToNext + " poin lagi untuk grade " + (nextThreshold === 70 ? "B" : "A") + "." : pointsToNext + " more points to grade " + (nextThreshold === 70 ? "B" : "A") + ".")}</div>
    </div>
    <div style={{ border: "1px solid rgb(var(--c-border))", borderRadius: 18, padding: 16 }}><h4 style={{ margin: "0 0 14px", color: "rgb(var(--c-charcoal))" }}>{isId ? "Rincian skor" : "Score breakdown"}</h4><div style={{ display: "grid", gap: 15 }}>{rows.map((row) => <div key={row.key}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}><span style={{ fontSize: 12, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{row.label}</span><span style={{ fontSize: 12, fontWeight: 800, color: "rgb(var(--c-accent-text))", whiteSpace: "nowrap" }}>{row.value} · {row.points}/20</span></div><div style={{ height: 7, borderRadius: 99, background: "rgb(var(--c-border))", marginTop: 7, overflow: "hidden" }}><div style={{ height: "100%", width: (row.points / 20 * 100) + "%", background: row.points / 20 >= .8 ? "rgb(var(--c-accent))" : row.points / 20 >= .5 ? "rgb(var(--c-muted))" : "rgb(var(--c-down))", borderRadius: 99 }}/></div><div style={{ marginTop: 4, fontSize: 10, color: "rgb(var(--c-muted))" }}>{row.hint}</div></div>)}</div></div>
    <div style={{ padding: 15, borderRadius: 14, background: "rgb(var(--c-cream))", border: "1px solid rgb(var(--c-border))", fontSize: 12, lineHeight: 1.6, color: "rgb(var(--c-charcoal))" }}><strong>{isId ? "Tahukah kamu?" : "Did you know?"}</strong><div style={{ marginTop: 5 }}>{isId ? "Kesehatan finansial bukan hanya soal besarnya penghasilan, tetapi juga kemampuan mengelola cicilan, menyiapkan dana darurat, dan menjaga proteksi." : "Financial health is not just about income; it also depends on managing debt, building an emergency fund, and maintaining protection."}</div></div>
    <a href="https://www.wealthplanner.id/konsultasiasuransi" target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 14, background: "rgb(var(--c-forest-800))", color: "#fff", fontWeight: 700, textDecoration: "none" }}>{isId ? "Diskusikan rencana keuanganmu" : "Discuss your financial plan"} →</a>
  </div>} onSave={() => onSaveResult({ id: "checkup", title: isId ? "Pemeriksaan Kesehatan Keuangan" : "Financial Check-Up", value: isId ? "Skor " + score + "/100 · " + grade : "Score " + score + "/100 · " + grade, plan: { type: "cashflow", targetAmount: 0, monthlyAmount: income, preparedAssets: cash + investments, timeframe: 1 } })} onNavigate={onNavigate} calcId="checkup" relatedId="checkup"/>;
}

// ============================================================
// 2. SIMULASI RUMAH (KPR vs Sewa Comparison)
// ============================================================
function RumahCalc({ onSaveResult, onNavigate }) {
  const [language, setLanguage] = React.useState(getAppLanguage());
  React.useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const isId = language === "id";
  const initialKprMode = new URLSearchParams(window.location.search).get("mode") === "existing" ? "existing" : "new";
  const [kprMode,setKprMode]=React.useState(initialKprMode);
  const [homePrice,setHomePrice]=React.useState(1000000000); const [downPayment,setDownPayment]=React.useState(200000000); const [loanAmount,setLoanAmount]=React.useState(800000000);
  const [outstanding,setOutstanding]=React.useState(650000000); const [remainingYears,setRemainingYears]=React.useState(15); const [currentRate,setCurrentRate]=React.useState(7); const [currentInstallment,setCurrentInstallment]=React.useState(0);
  const [financingType,setFinancingType]=React.useState("conventional"); const [fixedRate,setFixedRate]=React.useState(5.5); const [fixedYears,setFixedYears]=React.useState(5); const [floatingRate,setFloatingRate]=React.useState(9); const [tenor,setTenor]=React.useState(20); const [syariahMargin,setSyariahMargin]=React.useState(5); const [rentalPrice,setRentalPrice]=React.useState(5000000); const [annualRentIncrease,setAnnualRentIncrease]=React.useState(5); const [investmentReturn,setInvestmentReturn]=React.useState(6); const [annualHomeAppreciation,setAnnualHomeAppreciation]=React.useState(0);
  React.useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const planId = params.get("planId");
    if (!planId) return;
    const saved = loadFinancialPlans().find((p:any) => p.id === planId);
    if (!saved) return;
    if (saved.kprMode) setKprMode(saved.kprMode);
    if (saved.financingType) setFinancingType(saved.financingType);
    if (typeof saved.homePrice === "number") setHomePrice(saved.homePrice);
    if (typeof saved.downPayment === "number") setDownPayment(saved.downPayment);
    if (typeof saved.loanAmount === "number") setLoanAmount(saved.loanAmount);
    if (typeof saved.outstanding === "number") setOutstanding(saved.outstanding);
    if (typeof saved.remainingYears === "number") setRemainingYears(saved.remainingYears);
    if (typeof saved.currentRate === "number") setCurrentRate(saved.currentRate);
    if (typeof saved.currentInstallment === "number") setCurrentInstallment(saved.currentInstallment);
    if (typeof saved.fixedRate === "number") setFixedRate(saved.fixedRate);
    if (typeof saved.fixedYears === "number") setFixedYears(saved.fixedYears);
    if (typeof saved.floatingRate === "number") setFloatingRate(saved.floatingRate);
    if (typeof saved.tenor === "number") setTenor(saved.tenor);
    if (typeof saved.syariahMargin === "number") setSyariahMargin(saved.syariahMargin);
    if (typeof saved.rentalPrice === "number") setRentalPrice(saved.rentalPrice);
    if (typeof saved.annualRentIncrease === "number") setAnnualRentIncrease(saved.annualRentIncrease);
    if (typeof saved.investmentReturn === "number") setInvestmentReturn(saved.investmentReturn);
    if (typeof saved.annualHomeAppreciation === "number") setAnnualHomeAppreciation(saved.annualHomeAppreciation);
  },[]);
  React.useEffect(()=>{if(kprMode==="new")setLoanAmount(Math.max(0,Number(homePrice||0)-Number(downPayment||0)));},[homePrice,downPayment,kprMode]);
  const safeLoan=kprMode==="existing"?Math.max(0,Number(outstanding||0)):Math.max(0,Math.min(Number(loanAmount||0),Number(homePrice||0)));
  const effectiveTenor=kprMode==="existing"?Math.max(1,Number(remainingYears||1)):Math.max(1,Number(tenor||1)); const months=effectiveTenor*12;
  const monthlyPaymentFor=(principal,rate,n)=>{if(principal<=0||n<=0)return 0;const r=rate/100/12;return r===0?principal/n:principal*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1)};
  const balanceAfterPayments=(principal,rate,payment,n)=>{if(principal<=0||n<=0)return principal;const r=rate/100/12;if(r===0)return Math.max(0,principal-payment*n);return Math.max(0,principal*Math.pow(1+r,n)-payment*((Math.pow(1+r,n)-1)/r));};
  let monthlyPayment=0,totalPaid=0,totalInterest=0,schedule=[];
  const monthlyPayments=[];
  if(kprMode==="existing") { monthlyPayment=currentInstallment>0?currentInstallment:monthlyPaymentFor(safeLoan,currentRate,months); let balance=safeLoan; for(let m=1;m<=months;m++){const mr=currentRate/100/12;const interest=mr>0?balance*mr:0;let principal=Math.max(0,monthlyPayment-interest);if(m===months||principal>balance)principal=balance;const actual=principal+interest;monthlyPayments.push(actual);balance=Math.max(0,balance-principal);totalPaid+=actual;totalInterest+=interest;if(m===1||m===12||m===60||m===120||m===months)schedule.push({month:m,label:m%12===0?`${isId?"Tahun":"Year"} ${m/12}`:`${isId?"Bulan":"Month"} ${m}`,rate:currentRate,payment:actual,principal,interest,balance});} }
  else if(financingType==="conventional") {const fixedMonths=Math.min(months,Math.max(0,Number(fixedYears||0)*12));const initialRate=fixedMonths>0?fixedRate:floatingRate;const initialPayment=monthlyPaymentFor(safeLoan,initialRate,months);let balance=safeLoan,currentPayment=initialPayment;for(let m=1;m<=months;m++){const fixed=fixedMonths>0&&m<=fixedMonths;const rate=fixed?fixedRate:floatingRate;if(!fixed&&m===fixedMonths+1)currentPayment=monthlyPaymentFor(balance,floatingRate,months-m+1);const mr=rate/100/12;const interest=mr>0?balance*mr:0;let principal=currentPayment-interest;if(m===months||principal>balance)principal=balance;const actual=principal+interest;monthlyPayments.push(actual);balance=Math.max(0,balance-principal);totalPaid+=actual;totalInterest+=interest;if(m===1||m===12||m===60||m===120||m===180||m===months)schedule.push({month:m,label:m%12===0?`${isId?"Tahun":"Year"} ${m/12}`:`${isId?"Bulan":"Month"} ${m}`,rate,payment:actual,principal,interest,balance});}monthlyPayment=initialPayment;}
  else {const margin=safeLoan*(syariahMargin/100)*effectiveTenor;const selling=safeLoan+margin;monthlyPayment=selling/months;totalPaid=selling;totalInterest=margin;for(let m=1;m<=months;m++)monthlyPayments.push(monthlyPayment);schedule=[1,12,60,120,months].filter((m,i,a)=>m>0&&m<=months&&a.indexOf(m)===i).map(m=>({month:m,label:m%12===0?`${isId?"Tahun":"Year"} ${m/12}`:`${isId?"Bulan":"Month"} ${m}`,rate:syariahMargin,payment:monthlyPayment,principal:safeLoan/months,interest:margin/months,balance:Math.max(0,selling-monthlyPayment*m)}));}
  const fixedPayment=kprMode==="existing"?monthlyPayment:financingType==="conventional"?monthlyPaymentFor(safeLoan,(fixedYears>0?fixedRate:floatingRate),months):monthlyPayment;
  const fixedMonths=Math.min(months,Math.max(0,Number(fixedYears||0)*12));const remainingAfterFixed=Math.max(0,months-fixedMonths);const balanceAfterFixed=financingType==="conventional"&&fixedMonths>0?balanceAfterPayments(safeLoan,fixedRate,fixedPayment,fixedMonths):safeLoan;const floatingPayment=financingType==="conventional"&&remainingAfterFixed>0?monthlyPaymentFor(balanceAfterFixed,floatingRate,remainingAfterFixed):fixedPayment;
  // Plan 2 invests the unused DP upfront and only the positive monthly difference between KPR and rent. Rent increases annually; investment return compounds monthly.
  const initialInvestment=kprMode==="new"?Math.max(0,Number(downPayment||0)):0;
  const comparisonData=[];let cumulativeKPR=0,cumulativeRental=0,investmentBalance=initialInvestment,totalInvested=initialInvestment;
  for(let m=1;m<=months;m++){
    const currentRent=Number(rentalPrice||0)*Math.pow(1+Math.max(0,Number(annualRentIncrease||0))/100,Math.floor((m-1)/12));
    const currentKprPayment=monthlyPayments[m-1]??monthlyPayment;
    cumulativeKPR+=currentKprPayment;cumulativeRental+=currentRent;
    const monthlyInvestment=Math.max(0,currentKprPayment-currentRent);
    investmentBalance*=Math.pow(1+Math.max(-99,Number(investmentReturn||0))/100,1/12);
    investmentBalance+=monthlyInvestment;totalInvested+=monthlyInvestment;
    if(m===1||m===12||m===60||m===120||m===180||m===months)comparisonData.push({month:m,monthLabel:m%12===0?`${isId?"Tahun":"Year"} ${m/12}`:`${isId?"Bulan":"Month"} ${m}`,kprCumulative:cumulativeKPR,rentalCumulative:cumulativeRental,investmentBalance,totalInvested,currentRent,monthlyInvestment});
  }
  const finalInvestmentValue=investmentBalance;const finalTotalInvested=totalInvested;const finalInvestmentGain=finalInvestmentValue-finalTotalInvested;
  const newInputs = <>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
      <button type="button" onClick={()=>setFinancingType("conventional")} style={{padding:"11px 10px",borderRadius:10,border:financingType==="conventional"?"2px solid rgb(var(--c-accent-text))":"1px solid rgb(var(--c-border))",background:financingType==="conventional"?"rgb(var(--c-forest-50))":"white",fontSize:12,fontWeight:700}}>{isId?"KPR Konvensional":"Conventional Mortgage"}</button>
      <button type="button" aria-pressed={financingType==="syariah"} onClick={()=>setFinancingType("syariah")} style={{padding:"11px 10px",borderRadius:10,border:financingType==="syariah"?"2px solid rgb(var(--c-accent-text))":"1px solid rgb(var(--c-border))",background:financingType==="syariah"?"rgb(var(--c-forest-50))":"white",fontSize:12,fontWeight:700}}>{isId?"KPR Syariah":"Sharia Mortgage"}</button>
    </div>
    <NumberInput label={isId?"Harga rumah / nilai properti":"Home price / property value"} prefix="Rp" value={homePrice} onChange={setHomePrice} step={10000000}/>
    <NumberInput label={isId?"Uang muka (DP)":"Down payment"} prefix="Rp" value={downPayment} onChange={setDownPayment} step={10000000}/>
    <NumberInput label={isId?"Total pinjaman / pembiayaan":"Total loan / financing"} prefix="Rp" value={loanAmount} onChange={setLoanAmount} step={10000000}/>
    <Slider label="Tenor" value={tenor} onChange={setTenor} min={1} max={30} format={v=>`${v} ${isId?"tahun":"years"}`}/>
    {financingType==="conventional" ? <>
      <Slider label={isId?"Bunga fixed":"Fixed interest rate"} value={fixedRate} onChange={setFixedRate} min={0} max={15} step={.25} format={v=>`${v}%/tahun`}/>
      <Slider label={isId?"Periode fixed":"Fixed-rate period"} value={fixedYears} onChange={setFixedYears} min={0} max={Math.max(1,tenor)} format={v=>v===0?(isId?"Tanpa periode fixed":"No fixed period"):`${v} ${isId?"tahun":"years"}`}/>
      <Slider label={isId?"Bunga floating setelah fixed":"Floating rate after fixed"} value={floatingRate} onChange={setFloatingRate} min={0} max={20} step={.25} format={v=>`${v}%/tahun`}/>
    </> : <Slider label={isId?"Estimasi margin murabahah":"Estimated murabaha margin"} value={syariahMargin} onChange={setSyariahMargin} min={0} max={15} step={.25} format={v=>`${v}%/${isId?"tahun (ilustrasi)":"year (illustrative)"}`}/>}
  </>;
  const existingInputs = <>
    <NumberInput label={isId?"Sisa pokok pinjaman / pembiayaan":"Outstanding loan / financing principal"} prefix="Rp" value={outstanding} onChange={setOutstanding} step={10000000}/>
    <Slider label={isId?"Sisa tenor":"Remaining term"} value={remainingYears} onChange={setRemainingYears} min={1} max={30} format={v=>`${v} ${isId?"tahun":"years"}`}/>
    <Slider label={isId?"Suku bunga saat ini":"Current interest rate"} value={currentRate} onChange={setCurrentRate} min={0} max={20} step={.25} format={v=>`${v}%/tahun`}/>
    <NumberInput label={isId?"Cicilan saat ini / bulan (opsional)":"Current monthly payment (optional)"} prefix="Rp" value={currentInstallment} onChange={setCurrentInstallment} step={100000}/>
  </>;
  return <CalcLayout inputs={< >
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
      <button type="button" aria-pressed={kprMode==="new"} onClick={()=>setKprMode("new")} style={{padding:"11px 10px",borderRadius:10,border:kprMode==="new"?"2px solid rgb(var(--c-accent-text))":"1px solid rgb(var(--c-border))",background:kprMode==="new"?"rgb(var(--c-forest-50))":"white",fontSize:12,fontWeight:700}}>{isId?"KPR Baru":"New Mortgage"}</button>
      <button type="button" aria-pressed={kprMode==="existing"} onClick={()=>setKprMode("existing")} style={{padding:"11px 10px",borderRadius:10,border:kprMode==="existing"?"2px solid rgb(var(--c-accent-text))":"1px solid rgb(var(--c-border))",background:kprMode==="existing"?"rgb(var(--c-forest-50))":"white",fontSize:12,fontWeight:700}}>{isId?"KPR Berjalan":"Existing Mortgage"}</button>
    </div>
    <div style={{fontSize:13,fontWeight:800,color:"rgb(var(--c-charcoal))",marginBottom:-5}}>{isId?"Plan 1: KPR":"Plan 1: Mortgage"}</div>
    {kprMode==="new" ? newInputs : existingInputs}
    <div className="divider" style={{margin:"4px 0"}}/><div style={{fontSize:13,fontWeight:800,color:"rgb(var(--c-charcoal))",marginBottom:-5}}>{isId?"Plan 2: Sewa + Investasi":"Plan 2: Rent + Invest"}</div><NumberInput label={isId?"Biaya sewa rumah per bulan":"Monthly rent"} prefix="Rp" value={rentalPrice} onChange={setRentalPrice} step={500000}/><NumberInput label={isId?"Kenaikan sewa per tahun":"Annual rent increase"} value={annualRentIncrease} onChange={setAnnualRentIncrease} suffix="%/tahun" step={1} hint={isId?"Asumsi kenaikan sewa setiap tahun.":"Assumed annual rent increase."}/><NumberInput label={isId?"Imbal hasil investasi per tahun":"Annual investment return"} value={investmentReturn} onChange={setInvestmentReturn} suffix="%/tahun" step={1} hint={isId?"Asumsi imbal hasil investasi; tidak dijamin. DP dan selisih cicilan KPR dengan sewa diinvestasikan.":"Assumed investment return; not guaranteed. The down payment and positive difference between mortgage payments and rent are invested."}/><NumberInput label={isId?"Kenaikan harga rumah per tahun":"Annual home price appreciation"} value={annualHomeAppreciation} onChange={setAnnualHomeAppreciation} suffix="%/tahun" step={1} hint={isId?"Asumsi kenaikan nilai rumah; default 0% agar tidak mengasumsikan harga pasti naik.":"Assumed home value appreciation; defaults to 0% without assuming prices will rise."}/>
  </>} results={<>
    <div className="row" style={{gap:12,marginBottom:12,flexWrap:"wrap"}}><ResultTile label={isId?"TOTAL PEMBIAYAAN / PINJAMAN":"TOTAL LOAN / FINANCING"} value={`Rp ${formatIDR(Math.round(safeLoan))}`} sub={kprMode==="existing"?(isId?"Sisa pokok pembiayaan saat ini":"Outstanding financing principal"):(isId?"Pokok pinjaman setelah DP":"Loan principal after down payment")}/><ResultTile label={kprMode==="existing"?(isId?"CICILAN SAAT INI / BULAN":"CURRENT MONTHLY PAYMENT"):financingType==="conventional"?(isId?"CICILAN AWAL / BULAN":"INITIAL MONTHLY PAYMENT"):(isId?"ANGSURAN / BULAN":"MONTHLY INSTALLMENT")} value={`Rp ${formatIDR(Math.round(monthlyPayment))}`} sub={`${effectiveTenor} ${isId?"tahun":"years"}`}/></div>
    <div className="card" style={{marginTop:10}}><h4 style={{marginBottom:14}}>{isId?"Ringkasan Pembiayaan":"Financing Summary"}</h4><div className="stack" style={{gap:4}}>{kprMode==="new"&&<><BreakdownRow label={isId?"Harga properti":"Property price"} value={`Rp ${formatIDR(homePrice)}`}/><BreakdownRow label={isId?"Uang muka (DP)":"Down payment"} value={`Rp ${formatIDR(downPayment)}`}/></>}<BreakdownRow label={isId?"Total pembiayaan / pinjaman":"Total loan / financing"} value={`Rp ${formatIDR(Math.round(safeLoan))}`} highlight/><BreakdownRow label={kprMode==="existing"?(isId?"Sisa tenor":"Remaining term"):(isId?"Tenor":"Loan term")} value={`${effectiveTenor} ${isId?"tahun":"years"}`}/><BreakdownRow label={kprMode==="existing"?(isId?"Total pembayaran dari sekarang":"Total payments from now"):(isId?"Total pembayaran pembiayaan":"Total financing payments")} value={`Rp ${formatIDR(Math.round(totalPaid))}`} highlight/><BreakdownRow label={financingType==="conventional"?(isId?"Total bunga":"Total interest"):(isId?"Total margin ilustratif":"Total illustrative margin")} value={`Rp ${formatIDR(Math.round(totalInterest))}`}/>{financingType==="conventional"&&kprMode==="new"&&fixedYears>0&&fixedYears<tenor&&<BreakdownRow label={isId?"Estimasi cicilan setelah fixed":"Estimated payment after fixed period"} value={`Rp ${formatIDR(Math.round(floatingPayment))}/bln`} sub={`${isId?"Skenario floating":"Floating-rate scenario"} ${floatingRate}%/${isId?"tahun":"year"}`}/>}</div></div>
    {financingType==="conventional"&&<div className="card" style={{marginTop:16,padding:12}}>
      <h4 style={{margin:"0 0 12px",fontSize:14,fontWeight:800,color:"rgb(var(--c-charcoal))"}}>{kprMode==="existing"?(isId?"Proyeksi KPR Berjalan":"Existing Mortgage Projection"):"Fixed → Floating"}</h4>
      <div style={{display:"grid",gap:10}}>
        {schedule.map((r,i)=><div key={`${r.month}-${i}`} style={{border:"1px solid rgb(var(--c-border))",borderRadius:14,padding:12,background:"rgb(var(--c-surface))",minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:12}}>
            <strong style={{fontSize:13,color:"rgb(var(--c-charcoal))"}}>{r.label.replace(/^Tahun /,"Year ").replace(/^Bulan /,"Month ") && (isId?r.label:r.label.replace(/^Tahun /,"Year ").replace(/^Bulan /,"Month "))}</strong>
            <span style={{fontSize:11,fontWeight:800,padding:"4px 8px",borderRadius:999,background:"rgb(var(--c-forest-50))",color:"rgb(var(--c-forest-800))",whiteSpace:"nowrap"}}>{r.rate}%{isId?"/tahun":"/year"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>
            {[{label:isId?"Cicilan":"Payment",value:r.payment},{label:isId?"Bunga":"Interest",value:r.interest},{label:isId?"Pokok":"Principal",value:r.principal}].map((v,j)=><div key={j} style={{minWidth:0}}>
              <div style={{fontSize:10,color:"rgb(var(--c-muted))",marginBottom:4}}>{v.label}</div>
              <div style={{fontSize:11,fontWeight:700,color:"rgb(var(--c-charcoal))",fontVariantNumeric:"tabular-nums",overflowWrap:"anywhere"}}>Rp {formatIDR(Math.round(v.value))}</div>
            </div>)}
          </div>
        </div>)}
      </div>
    </div>}
    {kprMode==="new"&&financingType==="syariah"&&<div className="card" style={{marginTop:16,background:"rgb(var(--c-cream))"}}><h4 style={{marginBottom:8}}>{isId?"Bagaimana KPR Syariah bekerja?":"How does Sharia mortgage work?"}</h4><p style={{fontSize:12,lineHeight:1.6,color:"rgb(var(--c-forest-800))",margin:0}}>{isId?"Pada skenario murabahah, margin disepakati di awal dan pembayaran mengikuti struktur akad produk. Angka di sini adalah ilustrasi edukatif, bukan penawaran lembaga tertentu.":"In a murabaha scenario, the margin is agreed upfront and payments follow the product contract. This is an educational illustration, not an offer from a specific provider."}</p></div>}
    <div className="card" style={{marginTop:16,padding:16}}>
      <h4 style={{margin:"0 0 6px",fontSize:14,fontWeight:800,color:"rgb(var(--c-charcoal))"}}>{isId?"KPR vs Sewa":"Mortgage vs Rent"}</h4>
      <p style={{fontSize:11,lineHeight:1.5,color:"rgb(var(--c-muted))",margin:"0 0 12px"}}>{isId?"Perbandingan jika KPR vs Sewa (DP diinvestasikan dari selisih cicilan KPR dengan biaya sewa setiap bulan).":"Compare buying versus renting, investing the down payment and positive monthly difference."}</p>
      <div style={{display:"grid",gap:10}}>
        {comparisonData.map((r,i)=>{const balanceRow=schedule.find((item:any)=>item.month===r.month);const houseValue=Number(homePrice||0)*Math.pow(1+Math.max(-99,Number(annualHomeAppreciation||0))/100,r.month/12);const remainingBalance=balanceRow?.balance??(r.month===months?0:safeLoan);const homeEquity=Math.max(0,houseValue-Math.max(0,remainingBalance));return <div key={`${r.month}-${i}`} style={{border:"1px solid rgb(var(--c-border))",borderRadius:14,padding:12,background:"rgb(var(--c-surface))",minWidth:0}}>
          <strong style={{display:"block",fontSize:13,color:"rgb(var(--c-charcoal))",marginBottom:10}}>{r.monthLabel}</strong>
          <div style={{display:"grid",gap:9}}>
            {[{label:isId?"Total dibayar KPR":"Total mortgage paid",value:r.kprCumulative},{label:isId?"Total dibayar sewa":"Total rent paid",value:r.rentalCumulative},{label:isId?"Ekuitas rumah*":"Home equity*",value:homeEquity},{label:isId?"Nilai investasi":"Investment value",value:r.investmentBalance}].map((v,j)=><div key={j} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,minWidth:0}}>
              <span style={{fontSize:11,color:"rgb(var(--c-muted))",flex:"1 1 45%"}}>{v.label}</span>
              <strong style={{fontSize:11,color:j===3?"rgb(var(--c-accent-text))":"rgb(var(--c-charcoal))",textAlign:"right",fontVariantNumeric:"tabular-nums",overflowWrap:"anywhere",maxWidth:"58%"}}>Rp {formatIDR(Math.round(v.value))}</strong>
            </div>)}
          </div>
        </div>})}
      </div>
      <p style={{fontSize:11,lineHeight:1.5,color:"rgb(var(--c-muted))",margin:"10px 0 0"}}>{isId?"*Estimasi nilai rumah dikurangi sisa pokok pinjaman. Nilai rumah memakai asumsi kenaikan harga yang kamu isi.":"*Estimated home value minus remaining loan principal. Home value uses your assumed annual appreciation."}</p>
      <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid rgb(var(--c-border))"}}>
        <h4 style={{marginBottom:8}}>{isId?"Proyeksi Investasi Plan 2":"Plan 2 Investment Projection"}</h4>
        <div className="stack" style={{gap:4}}>
          <BreakdownRow label={isId?"Investasi awal dari DP":"Initial investment from down payment"} value={`Rp ${formatIDR(Math.round(initialInvestment))}`}/>
          <BreakdownRow label={isId?"Total tambahan investasi berkala":"Total additional periodic investments"} value={`Rp ${formatIDR(Math.round(finalTotalInvested-initialInvestment))}`}/>
          <BreakdownRow label={isId?"Estimasi nilai investasi di akhir periode":"Estimated investment value at end"} value={`Rp ${formatIDR(Math.round(finalInvestmentValue))}`} highlight/>
          <BreakdownRow label={isId?"Estimasi hasil investasi":"Estimated investment gain"} value={`Rp ${formatIDR(Math.round(finalInvestmentGain))}`} sub={`${isId?"Asumsi return":"Assumed return"} ${investmentReturn}% ${isId?"per tahun, dikompaun bulanan":"per year, compounded monthly"}`}/>
        </div>
        <p style={{fontSize:11,lineHeight:1.5,color:"rgb(var(--c-muted))",margin:"10px 0 0"}}>{isId?"Investasi berkala dihitung otomatis dari selisih positif cicilan KPR dan sewa pada bulan yang sama. Kenaikan sewa dan return investasi mengikuti asumsi yang kamu masukkan. Belum memperhitungkan apresiasi harga rumah maupun biaya kepemilikan.":"Periodic investments use the positive difference between mortgage payments and rent. Rent increases and investment returns follow your assumptions. Home appreciation and ownership costs are excluded."}</p>
      </div>
    </div>
    <div style={{marginTop:16,padding:"12px 16px",background:"rgb(var(--c-cream))",borderRadius:14,fontSize:11,color:"rgb(var(--c-muted))",lineHeight:1.55}}>{isId?"Disclaimer: hasil adalah simulasi/estimasi edukatif, bukan penawaran pembiayaan. Biaya provisi, administrasi, asuransi, pajak, notaris, dan biaya lain belum diperhitungkan.":"Disclaimer: this is an educational estimate, not a financing offer. Provision, administration, insurance, tax, notary, and other costs are excluded."}</div>
    <div style={{marginTop:14,padding:12,borderRadius:14,background:"rgb(var(--c-forest-50))",color:"rgb(var(--c-forest-800))",fontSize:12,lineHeight:1.55}}><strong style={{display:"block",marginBottom:5}}>{isId?"Tahukah kamu?":"Did you know?"}</strong>{isId?"Pelunasan KPR tidak selalu otomatis menyelesaikan seluruh kewajiban ketika pencari nafkah meninggal. Siapkan strategi pelunasan KPR dan proteksi jiwa agar keluarga tetap punya pilihan untuk mempertahankan rumahnya.":"Paying off a mortgage is not always automatic when the primary earner dies. Plan for mortgage repayment and life protection so your family can retain the option to keep their home."}</div>
    <a href="https://www.wealthplanner.id/konsultasiasuransi" target="_blank" rel="noopener" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:12,minHeight:46,padding:"12px 16px",borderRadius:12,background:"rgb(var(--c-forest-800))",color:"white",fontSize:13,fontWeight:800,textDecoration:"none"}}>{isId?"Konsultasikan Rencana":"Discuss Your Plan"} <ArrowRight size={16}/></a>
  </>} onSave={()=>onSaveResult({id:"rumah",title:"KPR",value:`Rp ${formatIDR(Math.round(safeLoan))} · Rp ${formatIDR(Math.round(monthlyPayment))}/bln`,plan:{type:"home",targetAmount:kprMode==="existing"?safeLoan:homePrice,obligationAmount:safeLoan,monthlyAmount:monthlyPayment,timeframe:effectiveTenor,preparedAssets:kprMode==="new"?downPayment:0,financingType,kprMode,homePrice,downPayment,loanAmount,outstanding,remainingYears,currentRate,currentInstallment,fixedRate,fixedYears,floatingRate,tenor,syariahMargin,rentalPrice,annualRentIncrease,investmentReturn,annualHomeAppreciation}})} onNavigate={onNavigate} calcId="rumah" relatedId="kpr"/>;
}

// ============================================================
// 3. INVESTMENT PLANNER
// ============================================================
// Illustrative potential returns only; adjust these assumptions to your product research.
const DEFAULT_INSTRUMENTS = [
  { id: "money-market", nameKey: "moneyMarket", name: "", returnPct: 4.5, weight: 20 },
  { id: "sukuk", nameKey: "fixedIncome", name: "", returnPct: 6.5, weight: 25 },
  { id: "equity", nameKey: "equity", name: "", returnPct: 10, weight: 35 },
  { id: "gold", nameKey: "gold", name: "", returnPct: 6, weight: 15 },
  { id: "other", nameKey: "other", name: "", returnPct: 7, weight: 5 },
];

function InvestCalc({ onSaveResult, onNavigate }) {
  const [language, setLanguage] = React.useState(getAppLanguage());
  React.useEffect(() => {
    const update = () => setLanguage(getAppLanguage());
    window.addEventListener("wealthplanner:language-changed", update);
    return () => window.removeEventListener("wealthplanner:language-changed", update);
  }, []);
  const isId = language === "id";
  const [starting, setStarting] = React.useState(120000000);
  const [monthly, setMonthly] = React.useState(2000000);
  const [years, setYears] = React.useState(10);
  const [instruments, setInstruments] = React.useState(() => DEFAULT_INSTRUMENTS.map((item) => ({ ...item })));
  const [returnHelpOpen, setReturnHelpOpen] = React.useState(false);
  const [allocationHelpOpen, setAllocationHelpOpen] = React.useState(false);
  const [nextId, setNextId] = React.useState(1);

  const instrumentNames = {
    moneyMarket: isId ? "Pasar Uang" : "Money Market",
    fixedIncome: isId ? "Sukuk / pendapatan tetap" : "Sukuk / fixed income",
    equity: isId ? "Saham / reksa dana saham" : "Stocks / equity funds",
    gold: isId ? "Emas" : "Gold",
    other: isId ? "Lainnya (properti, dll.)" : "Others (property, etc.)",
    new: isId ? "Instrumen baru" : "New instrument",
  };
  const nameFor = (item) => item.name !== "" ? item.name : (instrumentNames[item.nameKey] || instrumentNames.new);
  const totalWeight = instruments.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const weightedReturn = totalWeight > 0
    ? instruments.reduce((sum, item) => sum + (Number(item.returnPct) || 0) * (Number(item.weight) || 0), 0) / totalWeight
    : 0;
  const safeStarting = Math.max(0, Number(starting) || 0);
  const safeMonthly = Math.max(0, Number(monthly) || 0);
  const safeYears = Math.max(1, Math.min(30, Number(years) || 1));
  const annualRate = Math.max(0, Number(weightedReturn) || 0) / 100;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  const months = safeYears * 12;
  const fvContributions = (periods) => monthlyRate === 0
    ? safeMonthly * periods
    : safeMonthly * ((Math.pow(1 + monthlyRate, periods) - 1) / monthlyRate);
  const finalValue = Math.max(0, safeStarting * Math.pow(1 + annualRate, safeYears) + fvContributions(months));
  const totalContributed = safeStarting + safeMonthly * months;
  const investmentReturn = finalValue - totalContributed;
  const series = Array.from({ length: safeYears + 1 }, (_, year) => ({
    year,
    value: Math.max(0, safeStarting * Math.pow(1 + annualRate, year) + fvContributions(year * 12)),
    contributed: safeStarting + safeMonthly * 12 * year,
  }));
  const chartMax = Math.max(1, ...series.map((point) => Math.max(point.value, point.contributed)));
  const chartX = (year) => 12 + (year / safeYears) * 316;
  const chartY = (value) => 104 - (Math.max(0, value) / chartMax) * 88;
  const valuePoints = series.map((point) => chartX(point.year) + "," + chartY(point.value)).join(" ");
  const contributedPoints = series.map((point) => chartX(point.year) + "," + chartY(point.contributed)).join(" ");
  const formatPercent = (value, digits = 2) => {
    const formatted = (Number.isFinite(value) ? value : 0).toFixed(digits);
    return formatted.replace(".", isId ? "," : ".") + "%";
  };
  const updateInstrument = (id, field, value) => {
    setInstruments((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };
  const addInstrument = () => {
    if (instruments.length >= 10) return;
    setInstruments((current) => [...current, { id: "custom-" + nextId, nameKey: "new", name: "", returnPct: 5, weight: 0 }]);
    setNextId((id) => id + 1);
  };
  const normalizeWeights = () => {
    if (totalWeight <= 0) return;
    const exact = instruments.map((item) => (Number(item.weight) || 0) * 100 / totalWeight);
    const rounded = exact.map((weight) => Math.round(weight));
    const largestIndex = instruments.reduce((largest, item, index) =>
      (Number(item.weight) || 0) > (Number(instruments[largest].weight) || 0) ? index : largest, 0);
    rounded[largestIndex] += 100 - rounded.reduce((sum, weight) => sum + weight, 0);
    setInstruments((current) => current.map((item, index) => ({ ...item, weight: Math.max(0, rounded[index]) })));
  };

  const fieldStyle = {
    width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid rgb(var(--c-border))",
    borderRadius: 8, background: "rgb(var(--c-cream))", color: "rgb(var(--c-charcoal))",
    padding: "6px 7px", fontSize: 12, lineHeight: 1.35,
  };
  const smallLabelStyle = { fontSize: 11, lineHeight: 1.25, color: "rgb(var(--c-muted))", minWidth: 0, overflowWrap: "anywhere" };
  const helpButtonStyle = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18,
    flex: "0 0 18px", borderRadius: 999, border: "1px solid rgb(var(--c-border))",
    background: "rgb(var(--c-forest-50))", color: "rgb(var(--c-forest-800))",
    fontSize: 11, fontWeight: 800, cursor: "pointer", padding: 0,
  };
  const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid rgb(var(--c-border))", minWidth: 0 };

  return (
    <CalcLayout
      inputs={
        <>
          <NumberInput label={isId ? "Total investasi saat ini" : "Current investment"} prefix="Rp" value={starting} onChange={setStarting} step={5000000} />
          <NumberInput label={isId ? "Setoran bulanan" : "Monthly contribution"} prefix="Rp" value={monthly} onChange={setMonthly} step={250000} />
          <Slider label={isId ? "Jangka waktu" : "Time horizon"} value={safeYears} onChange={setYears} min={1} max={30} step={1} format={(v) => isId ? v + " tahun" : v + " years"} />
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--c-forest-800))" }}>{isId ? "Return (rata-rata tertimbang)" : "Return (weighted average)"}</span>
              <button type="button" aria-expanded={returnHelpOpen} onClick={() => setReturnHelpOpen((open) => !open)} style={helpButtonStyle} aria-label={isId ? "Penjelasan return" : "Return explanation"}>!</button>
            </div>
            {returnHelpOpen && <div style={{ padding: "9px 10px", border: "1px solid rgb(var(--c-border))", borderRadius: 10, background: "rgb(var(--c-cream))", color: "rgb(var(--c-forest-800))", fontSize: 12, lineHeight: 1.5 }}>{isId ? "Rata-rata tertimbang dari tabel potensi return dan bobot di bawah. Ubah bobot, return ikut berubah." : "Weighted average of the potential returns and weights in the table below. Change the weights and the return will update."}</div>}
            <div aria-readonly="true" style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid rgb(var(--c-border))", borderRadius: 10, padding: "10px 12px", background: "rgb(var(--c-cream))" }}>
              <div style={{ height: 6, flex: 1, minWidth: 0, borderRadius: 99, background: "rgb(var(--c-border))", overflow: "hidden" }}><div style={{ width: Math.max(0, Math.min(100, weightedReturn / 30 * 100)) + "%", height: "100%", borderRadius: 99, background: "rgb(var(--c-accent-text))" }} /></div>
              <strong style={{ whiteSpace: "nowrap", fontSize: 13, color: "rgb(var(--c-charcoal))" }}>{formatPercent(weightedReturn)}/{isId ? "tahun" : "year"}</strong>
            </div>
          </div>
          <Card style={{ marginTop: 10, padding: 14, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 14, color: "rgb(var(--c-charcoal))" }}>{isId ? "Alokasi aset" : "Asset allocation"}</h4>
              <button type="button" aria-expanded={allocationHelpOpen} onClick={() => setAllocationHelpOpen((open) => !open)} style={helpButtonStyle} aria-label={isId ? "Penjelasan alokasi aset" : "Asset allocation explanation"}>!</button>
            </div>
            {allocationHelpOpen && <div style={{ marginBottom: 10, padding: "9px 10px", border: "1px solid rgb(var(--c-border))", borderRadius: 10, background: "rgb(var(--c-cream))", color: "rgb(var(--c-forest-800))", fontSize: 12, lineHeight: 1.5 }}>{isId ? "Ubah nama instrumen, potensi return, dan bobot sesuai rencanamu. Total bobot harus 100%. Return rata-rata dihitung otomatis dari bobot dan ikut mengubah proyeksi di atas." : "Edit instrument names, potential returns, and weights to fit your plan. Total weight must be 100%. The weighted average return is calculated automatically and updates the projection above."}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,.9fr) minmax(0,.8fr) 28px", gap: 6, alignItems: "center", minWidth: 0, marginBottom: 4 }}>
              <span style={smallLabelStyle}>{isId ? "Instrumen" : "Instrument"}</span>
              <span style={smallLabelStyle}>{isId ? "Potensi return" : "Potential return"}</span>
              <span style={{ ...smallLabelStyle, textAlign: "right" }}>{isId ? "Bobot" : "Weight"}</span><span />
            </div>
            <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
              {instruments.map((item) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,.9fr) minmax(0,.8fr) 28px", gap: 6, alignItems: "center", minWidth: 0 }}>
                  <input aria-label={isId ? "Nama instrumen" : "Instrument name"} value={nameFor(item)} onChange={(event) => updateInstrument(item.id, "name", event.target.value)} style={{ ...fieldStyle, textAlign: "left" }} />
                  <div style={{ position: "relative", minWidth: 0 }}>
                    <input aria-label={isId ? "Potensi return (%)" : "Potential return (%)"} type="number" min={0} max={30} step={0.5} value={item.returnPct} onChange={(event) => updateInstrument(item.id, "returnPct", event.target.value === "" ? 0 : Math.max(0, Math.min(30, Number(event.target.value) || 0)))} style={{ ...fieldStyle, paddingRight: 21, textAlign: "right" }} />
                    <span aria-hidden="true" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 11, color: "rgb(var(--c-muted))" }}>%</span>
                  </div>
                  <div style={{ position: "relative", minWidth: 0 }}>
                    <input aria-label={isId ? "Bobot (%)" : "Weight (%)"} type="number" min={0} max={100} step={5} value={item.weight} onChange={(event) => updateInstrument(item.id, "weight", event.target.value === "" ? 0 : Math.max(0, Math.min(100, Number(event.target.value) || 0)))} style={{ ...fieldStyle, paddingRight: 21, textAlign: "right" }} />
                    <span aria-hidden="true" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 11, color: "rgb(var(--c-muted))" }}>%</span>
                  </div>
                  <button type="button" aria-label={isId ? "Hapus instrumen" : "Remove instrument"} title={isId ? "Hapus instrumen" : "Remove instrument"} disabled={instruments.length <= 1} onClick={() => setInstruments((current) => current.length > 1 ? current.filter((entry) => entry.id !== item.id) : current)} style={{ width: 28, height: 30, border: "1px solid rgb(var(--c-border))", borderRadius: 8, background: "rgb(var(--c-cream))", color: "rgb(var(--c-charcoal))", cursor: instruments.length <= 1 ? "not-allowed" : "pointer", opacity: instruments.length <= 1 ? 0.4 : 1, fontSize: 13, padding: 0 }}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" disabled={instruments.length >= 10} onClick={addInstrument} style={{ width: "100%", marginTop: 9, border: "1px dashed rgb(var(--c-accent))", borderRadius: 10, background: "transparent", color: "rgb(var(--c-accent-text))", padding: "9px 10px", fontSize: 12, fontWeight: 700, cursor: instruments.length >= 10 ? "not-allowed" : "pointer", opacity: instruments.length >= 10 ? 0.45 : 1 }}>{isId ? "+ Tambah instrumen" : "+ Add instrument"}</button>
            <div style={{ ...rowStyle, flexWrap: "wrap", alignItems: "flex-start", marginTop: 4 }}>
              <span style={{ fontSize: 12, color: "rgb(var(--c-forest-800))" }}>{isId ? "Total bobot" : "Total weight"}</span>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 6, minWidth: 0 }}>
                {totalWeight === 100
                  ? <span style={{ display: "inline-flex", borderRadius: 999, padding: "4px 8px", background: "rgb(var(--c-forest-50))", color: "rgb(var(--c-forest-800))", fontSize: 10.5, fontWeight: 700 }}>{isId ? "Sesuai 100%" : "Matches 100%"}</span>
                  : <><span style={{ display: "inline-flex", borderRadius: 8, padding: "4px 7px", background: "rgb(var(--c-cream))", border: "1px solid rgb(var(--c-border))", color: "rgb(var(--c-charcoal))", fontSize: 10.5, fontWeight: 700 }}>{isId ? "Total bobot " + totalWeight + "% — harus 100%" : "Total weight " + totalWeight + "% — must be 100%"}</span>{totalWeight > 0 && <button type="button" onClick={normalizeWeights} style={{ border: "1px solid rgb(var(--c-border))", borderRadius: 8, padding: "5px 7px", background: "rgb(var(--c-surface))", color: "rgb(var(--c-forest-800))", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>{isId ? "Samakan ke 100%" : "Normalize to 100%"}</button>}</>}
              </div>
            </div>
            <div style={{ ...rowStyle, borderBottom: 0, paddingBottom: 0 }}>
              <span style={{ fontSize: 12, color: "rgb(var(--c-forest-800))" }}>{isId ? "Rata-rata tertimbang (return)" : "Weighted average (return)"}</span>
              <strong style={{ fontSize: 12, color: "rgb(var(--c-accent-text))", whiteSpace: "nowrap" }}>{formatPercent(weightedReturn)}/{isId ? "tahun" : "year"}</strong>
            </div>
          </Card>
        </>
      }
      results={
        <>
          <ResultTile
            label={(isId ? "Proyeksi nilai investasi" : "Projected investment value") + " (" + safeYears + " " + (isId ? "tahun" : "years") + ")"}
            value={formatIDR(Math.round(finalValue))}
            sub={(isId ? "Modal disetor" : "Capital contributed") + " " + formatIDR(Math.round(totalContributed)) + " · " + (isId ? "asumsi, bukan jaminan" : "assumption, not a guarantee")}
          />
          <Card style={{ marginTop: 10, padding: 14, minWidth: 0, overflow: "hidden" }}>
            <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "rgb(var(--c-charcoal))" }}>{isId ? "Grafik proyeksi" : "Projection chart"}</h4>
            <svg viewBox="0 0 340 125" width="100%" height="auto" role="img" aria-label={isId ? "Grafik nilai investasi dan modal disetor per tahun" : "Chart of investment value and capital contributed by year"} style={{ display: "block", maxWidth: "100%", overflow: "hidden" }}>
              <line x1="12" y1="104" x2="328" y2="104" stroke="rgb(var(--c-border))" strokeWidth="1" />
              <polyline points={contributedPoints} fill="none" stroke="rgb(var(--c-muted))" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
              <polyline points={valuePoints} fill="none" stroke="rgb(var(--c-accent-text))" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              <text x="12" y="121" fontSize="10" fill="rgb(var(--c-muted))">{isId ? "Tahun 0" : "Year 0"}</text>
              <text x="328" y="121" textAnchor="end" fontSize="10" fill="rgb(var(--c-muted))">{isId ? "Tahun " + safeYears : "Year " + safeYears}</text>
            </svg>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", alignItems: "center", fontSize: 11, color: "rgb(var(--c-forest-800))", marginTop: 4 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: "rgb(var(--c-accent-text))" }} />{isId ? "Nilai investasi" : "Investment value"}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: "rgb(var(--c-muted))" }} />{isId ? "Modal disetor" : "Capital contributed"}</span>
            </div>
          </Card>
          <Card style={{ marginTop: 10, padding: 14, minWidth: 0 }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "rgb(var(--c-charcoal))" }}>{isId ? "Ringkasan investasi" : "Investment summary"}</h4>
            <div className="stack" style={{ gap: 0 }}>
              <BreakdownRow label={isId ? "Dana awal" : "Starting amount"} value={formatIDR(Math.round(safeStarting))} />
              <BreakdownRow label={isId ? "Total setoran" : "Total contributions"} value={formatIDR(Math.round(safeMonthly * months))} sub={months + " " + (isId ? "bulan" : "months") + " × " + formatIDR(Math.round(safeMonthly))} />
              <BreakdownRow label={isId ? "Return dari investasi" : "Investment return"} value={formatIDR(Math.round(investmentReturn))} sub={formatPercent(weightedReturn) + " / " + (isId ? "tahun" : "year")} highlight />
              <div className="divider" style={{ margin: "8px 0" }} />
              <BreakdownRow label={isId ? "Total akhir" : "Final total"} value={formatIDR(Math.round(finalValue))} highlight />
            </div>
          </Card>
          <p style={{ margin: "8px 0 0", fontSize: 10.5, lineHeight: 1.5, color: "rgb(var(--c-muted))" }}>{isId ? "Potensi return adalah asumsi ilustratif, bukan jaminan. Simulasi edukatif, bukan rekomendasi produk investasi." : "Potential returns are illustrative assumptions, not guarantees. This is an educational simulation, not an investment product recommendation."}</p>
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "rgb(var(--c-forest-50))", color: "rgb(var(--c-forest-800))", fontSize: 12, lineHeight: 1.55 }}>
            {isId ? "Tahukah kamu? Investasi yang bagus bukan sekadar menghasilkan return tinggi. Susun target nominal dan waktunya, lalu sesuaikan strategi investasi dengan profil risiko serta kebutuhan likuiditasmu." : "Did you know? A good investment is not just about high returns. Set a target amount and timeline, then match your investment strategy to your risk profile and liquidity needs."}
          </div>
          <a href="https://www.wealthplanner.id/konsultasiasuransi" target="_blank" rel="noopener" style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 10, textAlign: "center", textDecoration: "none", borderRadius: 12, padding: "12px 14px", fontSize: 13, fontWeight: 700, background: "rgb(var(--c-accent))", color: "rgb(var(--c-accent-ink))" }}>{isId ? "Konsultasikan Rencana" : "Consult Your Plan"}</a>

        </>
      }
      onSave={() => onSaveResult({
        id: "invest",
        title: isId ? "Investasi" : "Investment",
        value: formatIDR(Math.round(finalValue)),
        plan: { type: "investment", targetAmount: finalValue, monthlyAmount: safeMonthly, timeframe: safeYears, preparedAssets: safeStarting },
      })}
      onNavigate={onNavigate}
      calcId="invest"
      relatedId="invest"
    />
  );
}

// ============================================================
// 4. INSURANCE CALCULATOR (WITH INFLATION)
// ============================================================
function InsuranceCalc({ onSaveResult, onNavigate }) {
  const [income, setIncome] = React.useState(10000000);
  const [dependents, setDependents] = React.useState(2);
  const [debts, setDebts] = React.useState(50000000);
  const [existing, setExisting] = React.useState(0);
  const [yearsCover, setYearsCover] = React.useState(10);
  const [inflationRate, setInflationRate] = React.useState(3);

  const annualIncome = income * 12;
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsCover);
  const adjustedAnnualIncome = annualIncome * inflationMultiplier;
  const dimNeed = adjustedAnnualIncome * yearsCover + debts + (dependents * 50000000);
  const gap = Math.max(dimNeed - existing, 0);

  return (
    <CalcLayout
      inputs={
        <>
          <NumberInput label="Pemasukan bulanan" prefix="Rp" value={income} onChange={setIncome} step={500000} />
          <NumberInput label="Jumlah tanggungan (anak, ortu, dst.)" value={dependents} onChange={setDependents} min={0} step={1} />
          <NumberInput label="Total utang aktif" prefix="Rp" value={debts} onChange={setDebts} step={5000000} />
          <NumberInput label="Uang pertanggungan polis sekarang" prefix="Rp" value={existing} onChange={setExisting} step={50000000} />
          <Slider label="Penggantian income selama" value={yearsCover} onChange={setYearsCover} min={3} max={25} format={(v) => `${v} tahun`} />
          <Slider label="Estimasi inflasi tahunan" value={inflationRate} onChange={setInflationRate} min={0} max={10} step={0.5} format={(v) => `${v}%`} />
        </>
      }
      results={
        <>
          <ResultTile
            label="GAP UANG PERTANGGUNGAN"
            value={formatIDR(gap)}
            sub={gap > 0 ? "Tambahan UP yang ideal kamu beli — pakai term life untuk premi paling efisien." : "Coverage kamu sudah cukup. Tetap review tiap 2 tahun ya."}
            accent={gap > 0 ? "var(--accent)" : "var(--positive)"}
          />
          <div className="card" style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 16 }}>Breakdown kebutuhan (metode DIME)</h4>
            <BreakdownRow label="Income replacement" value={formatIDR(Math.round(adjustedAnnualIncome * yearsCover))} sub={`${yearsCover} tahun × ${formatIDR(Math.round(adjustedAnnualIncome))}/thn (sudah adjusted inflasi ${inflationRate}%)`} />
            <BreakdownRow label="Pelunasan utang" value={formatIDR(debts)} sub="Sisa hutang aktif" />
            <BreakdownRow label="Dana tanggungan" value={formatIDR(dependents * 50000000)} sub={`${dependents} orang × Rp 50jt`} />
            <div className="divider" style={{ margin: "12px 0" }} />
            <BreakdownRow label="Total kebutuhan" value={formatIDR(Math.round(dimNeed))} highlight />
            <BreakdownRow label="Coverage sekarang" value={`-${formatIDR(existing)}`} muted />
          </div>
        </>
      }
      onSave={() => onSaveResult({ id: "insurance", title: "Kebutuhan Asuransi", value: formatIDR(gap) + " gap", plan: { type: "income_protection", targetAmount: gap, income, timeframe: yearsCover, preparedAssets: existing } })}
      onNavigate={onNavigate}
      calcId="insurance"
      relatedId="insurance"
    />
  );
}

function BreakdownRow({ label, value, sub, highlight, muted }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid rgb(var(--c-border))", color: muted ? "rgb(var(--c-muted))" : "rgb(var(--c-charcoal))", minWidth: 0 }}>
      <div style={{ minWidth: 0, flex: "1 1 50%" }}>
        <div style={{ fontSize: 12, fontWeight: highlight ? 700 : 500, lineHeight: 1.4, overflowWrap: "anywhere" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, lineHeight: 1.45, color: "rgb(var(--c-muted))", marginTop: 3 }}>{sub}</div>}
      </div>
      <div style={{ minWidth: 0, maxWidth: "60%", textAlign: "right", fontSize: highlight ? 14 : 12, fontWeight: highlight ? 800 : 600, color: highlight ? "rgb(var(--c-accent-text))" : "rgb(var(--c-charcoal))", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

// ============================================================
// 5. EDUCATION FUND CALCULATOR
// ============================================================
function EduCalc({ onSaveResult, onNavigate }) {
  const currentYear = new Date().getFullYear();
  const levelDurations = { Preschool: 2, TK: 2, SD: 6, SMP: 3, SMA: 3, Kuliah: 4 };
  const levelOrder = ["Preschool", "TK", "SD", "SMP", "SMA", "Kuliah"];
  const frequencyOptions = [
    { value: "once", label: "Sekali bayar", payments: 1 },
    { value: "monthly", label: "Bulanan", payments: 12 },
    { value: "quarterly", label: "Kuartalan", payments: 4 },
    { value: "semester", label: "Semesteran", payments: 2 },
    { value: "annual", label: "Tahunan", payments: 1 },
  ];

  const [educationLevel, setEducationLevel] = React.useState("SD");
  const [startYear, setStartYear] = React.useState(currentYear + 1);
  const [inflation, setInflation] = React.useState(6);
  const [returnRate, setReturnRate] = React.useState(6);
  const [duration, setDuration] = React.useState(levelDurations.SD);
  const [costItems, setCostItems] = React.useState([
    { id: "pangkal", name: "Uang Pangkal", amount: 50000000, frequency: "once" },
    { id: "spp", name: "SPP", amount: 1500000, frequency: "monthly" },
    { id: "lainnya", name: "Lainnya", amount: 0, frequency: "annual" },
  ]);
  const [educationPlans, setEducationPlans] = React.useState([]);

  const safeStartYear = Math.floor(Number(startYear) || currentYear);
  const safeDuration = Math.max(1, Math.floor(Number(duration) || 1));
  const yearsUntilStart = Math.max(0, safeStartYear - currentYear);
  const inflationRate = Math.max(0, Number(inflation) || 0) / 100;
  const annualReturn = Math.max(0, Number(returnRate) || 0) / 100;
  const paymentCount = (frequency) => frequencyOptions.find((x) => x.value === frequency)?.payments ?? 1;
  const frequencyLabel = (frequency) => frequencyOptions.find((x) => x.value === frequency)?.label ?? frequency;
  const rupiah = (amount) => `Rp ${formatIDR(Math.round(Number.isFinite(Number(amount)) ? Number(amount) : 0))}`;

  const calculateStage = ({ level, year, years, inflationPct, returnPct, items }) => {
    const safeYear = Math.floor(Number(year) || currentYear);
    const safeYears = Math.max(1, Math.floor(Number(years) || 1));
    const infl = Math.max(0, Number(inflationPct) || 0) / 100;
    const ret = Math.max(0, Number(returnPct) || 0) / 100;
    const monthsUntilStart = Math.max(0, safeYear - currentYear) * 12;

    const yearlyCosts = Array.from({ length: safeYears }, (_, i) => {
      const targetYear = safeYear + i;
      const yearsFromNow = Math.max(0, targetYear - currentYear);
      const cost = items.reduce((sum, item) => {
        const nominal = Math.max(0, Number(item.amount) || 0);
        const inflated = nominal * Math.pow(1 + infl, yearsFromNow);
        const payments = item.frequency === "once" ? (i === 0 ? 1 : 0) : paymentCount(item.frequency);
        return sum + inflated * payments;
      }, 0);
      return { year: targetYear, cost };
    });

    const total = yearlyCosts.reduce((sum, item) => sum + item.cost, 0);
    const requiredAtStart = yearlyCosts.reduce((sum, item, i) => {
      const discount = Math.pow(1 + ret, i);
      return sum + (discount > 0 ? item.cost / discount : item.cost);
    }, 0);

    let monthlySaving;
    if (monthsUntilStart === 0) {
      monthlySaving = requiredAtStart;
    } else if (ret === 0) {
      monthlySaving = requiredAtStart / monthsUntilStart;
    } else {
      const im = Math.pow(1 + ret, 1 / 12) - 1;
      const denominator = Math.pow(1 + im, monthsUntilStart) - 1;
      monthlySaving = denominator > 0 ? requiredAtStart * im / denominator : requiredAtStart / monthsUntilStart;
    }

    return {
      id: `${level}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      level,
      startYear: safeYear,
      duration: safeYears,
      inflation: Number(inflationPct) || 0,
      returnRate: Number(returnPct) || 0,
      costItems: items.map((item) => ({ ...item, amount: Math.max(0, Number(item.amount) || 0) })),
      yearlyCosts,
      total,
      requiredAtStart,
      monthlySaving: Number.isFinite(monthlySaving) ? monthlySaving : requiredAtStart,
      monthsUntilStart,
    };
  };

  const currentStage = calculateStage({
    level: educationLevel,
    year: safeStartYear,
    years: safeDuration,
    inflationPct: inflation,
    returnPct: returnRate,
    items: costItems,
  });
  const savedEducationNeed = educationPlans.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const totalEducationNeed = savedEducationNeed + currentStage.total;

  const applyLevel = (level) => {
    setEducationLevel(level);
    setDuration(levelDurations[level] ?? 4);
  };
  const updateCostItem = (id, patch) => setCostItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addCostItem = () => setCostItems((prev) => [...prev, { id: `cost-${Date.now()}`, name: "Biaya Lainnya", amount: 0, frequency: "annual" }]);
  const removeCostItem = (id) => setCostItems((prev) => prev.length <= 1 ? prev : prev.filter((item) => item.id !== id));

  const addEducationPlan = () => {
    setEducationPlans((prev) => [...prev, { ...currentStage, id: `${educationLevel}-${Date.now()}` }]);
    const nextLevel = levelOrder[levelOrder.indexOf(educationLevel) + 1];
    if (nextLevel) {
      setEducationLevel(nextLevel);
      setDuration(levelDurations[nextLevel]);
    }
    setStartYear(safeStartYear + safeDuration);
  };
  const removeEducationPlan = (id) => setEducationPlans((prev) => prev.filter((item) => item.id !== id));

  const infoText = "Uang yang harus sudah ada di hari pertama jenjang dimulai. Karena sisa dana tetap diinvestasikan dengan return yang kamu isi sambil dipakai membayar biaya tiap tahun, jumlahnya lebih kecil dari total biaya.";

  const renderStage = (item, isCurrent = false) => (
    <details key={item.id} open={isCurrent ? true : undefined} style={{ borderTop: "1px solid rgb(var(--c-border))", minWidth: 0 }}>
      <summary style={{ listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 0", cursor: "pointer", minWidth: 0 }}>
        <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: "1 1 auto" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
            {item.level}{isCurrent && <Tag variant="accent">simulasi saat ini</Tag>}
          </span>
          <span style={{ fontSize: 10.5, color: "rgb(var(--c-muted))" }}>{item.startYear}–{item.startYear + item.duration - 1} · {item.duration} tahun</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7, flex: "0 0 auto" }}>
          <strong style={{ fontSize: 11.5, textAlign: "right", color: "rgb(var(--c-accent-text))" }}>{rupiah(item.total)}</strong>
          <span aria-hidden="true" style={{ color: "rgb(var(--c-muted))", fontSize: 12 }}>▾</span>
        </span>
      </summary>

      <div style={{ padding: "2px 0 12px", fontSize: 12, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgb(var(--c-muted))", textTransform: "uppercase", letterSpacing: ".04em", margin: "2px 0 4px" }}>Detail simulasi</div>
        {item.costItems.map((cost, i) => (
          <div key={`${cost.id}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px dashed rgb(var(--c-border))" }}>
            <span style={{ color: "rgb(var(--c-muted))", minWidth: 0, overflowWrap: "anywhere" }}>{cost.name || "Biaya"} ({frequencyLabel(cost.frequency).toLowerCase()})</span>
            <strong style={{ fontWeight: 600, textAlign: "right", flex: "0 0 auto" }}>{rupiah(cost.amount)}</strong>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px dashed rgb(var(--c-border))" }}>
          <span style={{ color: "rgb(var(--c-muted))" }}>Mulai pendidikan</span><strong>{item.startYear}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 0", borderBottom: "1px dashed rgb(var(--c-border))" }}>
          <span style={{ color: "rgb(var(--c-muted))" }}>Durasi pendidikan</span><strong>{item.duration} tahun</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0 5px", marginTop: 3, borderTop: "1px solid rgb(var(--c-border))" }}>
          <strong style={{ color: "rgb(var(--c-accent-text))" }}>Total kebutuhan {item.level}</strong>
          <strong style={{ color: "rgb(var(--c-accent-text))", textAlign: "right" }}>{rupiah(item.total)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: "1px dashed rgb(var(--c-border))" }}>
          <span style={{ color: "rgb(var(--c-muted))", flex: "1 1 auto", minWidth: 0 }}>
            Dana yang perlu terkumpul saat {item.level} dimulai
            <details style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 4, position: "relative" }}>
              <summary aria-label="Penjelasan dana yang perlu terkumpul" style={{ listStyle: "none", display: "inline-grid", placeItems: "center", width: 16, height: 16, borderRadius: "50%", background: "rgb(var(--c-forest-50))", color: "rgb(var(--c-accent-text))", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>!</summary>
              <div style={{ position: "absolute", zIndex: 5, top: 21, left: 0, width: "min(270px, 75vw)", padding: 10, borderRadius: 10, border: "1px solid rgb(var(--c-border))", background: "rgb(var(--c-surface))", color: "rgb(var(--c-charcoal))", fontSize: 11, lineHeight: 1.5, boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>{infoText}</div>
            </details>
          </span>
          <strong style={{ textAlign: "right", flex: "0 0 auto" }}>{rupiah(item.requiredAtStart)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "1px dashed rgb(var(--c-border))" }}>
          <span style={{ color: "rgb(var(--c-muted))" }}>Perlu menabung / bulan<span style={{ display: "block", fontSize: 10.5, marginTop: 2 }}>{item.monthsUntilStart} bulan sampai {item.level} dimulai</span></span>
          <strong style={{ textAlign: "right", flex: "0 0 auto" }}>{item.monthsUntilStart === 0 ? "Segera disiapkan" : rupiah(item.monthlySaving)}</strong>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgb(var(--c-muted))", textTransform: "uppercase", letterSpacing: ".04em", margin: "12px 0 4px" }}>Proyeksi biaya per tahun</div>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table style={{ width: "100%", minWidth: 220, borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ borderBottom: "1px solid rgb(var(--c-border))" }}><th style={{ textAlign: "left", padding: "5px 0", color: "rgb(var(--c-muted))" }}>Tahun</th><th style={{ textAlign: "right", padding: "5px 0", color: "rgb(var(--c-muted))" }}>Estimasi biaya</th></tr></thead>
            <tbody>{item.yearlyCosts.map((yearItem) => <tr key={yearItem.year} style={{ borderBottom: "1px dashed rgb(var(--c-border))" }}><td style={{ padding: "5px 0" }}>{yearItem.year}</td><td style={{ padding: "5px 0", textAlign: "right" }}>{rupiah(yearItem.cost)}</td></tr>)}</tbody>
          </table>
        </div>
        {!isCurrent && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><button type="button" onClick={() => removeEducationPlan(item.id)} style={{ border: 0, background: "transparent", color: "rgb(var(--c-down))", fontSize: 11, cursor: "pointer" }}>Hapus jenjang</button></div>}
      </div>
    </details>
  );

  const nearestStage = [...educationPlans, currentStage].sort((a, b) => a.startYear - b.startYear)[0];

  return <CalcLayout
    inputs={<>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div><div style={{ fontSize: 16, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>Tambah jenjang pendidikan</div><div style={{ fontSize: 11, color: "rgb(var(--c-muted))", marginTop: 3 }}>Atur komponen biaya dan frekuensi pembayaran sesuai kondisi sekolah/kampus.</div></div>
        {educationPlans.length > 0 && <Tag variant="accent">{educationPlans.length} jenjang ditambahkan</Tag>}
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgb(var(--c-forest-800))", marginBottom: 7 }}>Jenjang pendidikan</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
          {levelOrder.map((level) => <button key={level} type="button" onClick={() => applyLevel(level)} style={{ minWidth: 0, padding: "9px 6px", borderRadius: 9, border: educationLevel === level ? "2px solid rgb(var(--c-accent-text))" : "1px solid rgb(var(--c-border))", background: educationLevel === level ? "rgb(var(--c-forest-50))" : "rgb(var(--c-surface))", color: "rgb(var(--c-charcoal))", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{level}</button>)}
        </div>
      </div>
      <NumberInput label="Tahun mulai pendidikan" value={startYear} onChange={setStartYear} min={currentYear} step={1} hint={yearsUntilStart === 0 ? "Pendidikan dimulai tahun ini." : `Sekitar ${yearsUntilStart} tahun lagi.`} />
      <Slider label="Inflasi / kenaikan biaya pendidikan" value={inflation} onChange={setInflation} min={0} max={15} step={0.5} format={(v) => `${v}%/tahun`} />
      <Slider label="Estimasi return investasi" value={returnRate} onChange={setReturnRate} min={0} max={15} step={0.5} format={(v) => `${v}%/tahun`} />
      <Slider label="Durasi pendidikan" value={duration} onChange={setDuration} min={1} max={12} step={1} format={(v) => `${v} tahun`} />
      <div className="card" style={{ background: "rgb(var(--c-cream))", padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgb(var(--c-charcoal))", marginBottom: 10 }}>Komponen biaya</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {costItems.map((item) => <div key={item.id} style={{ border: "1px solid rgb(var(--c-border))", borderRadius: 10, padding: 8, minWidth: 0, boxSizing: "border-box" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, .9fr)", gap: 6, alignItems: "center" }}>
              <input value={item.name} onChange={(e) => updateCostItem(item.id, { name: e.target.value })} placeholder="Nama biaya" style={{ width: "100%", minWidth: 0, boxSizing: "border-box", borderRadius: 8, padding: "8px 9px", border: "1px solid rgb(var(--c-border))", background: "rgb(var(--c-surface))", color: "rgb(var(--c-charcoal))", fontSize: 12, fontWeight: 500 }} />
              <div style={{ minWidth: 0 }}><NumberInput label="" prefix="Rp" value={item.amount} onChange={(v) => updateCostItem(item.id, { amount: v })} step={100000} /></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <select value={item.frequency} onChange={(e) => updateCostItem(item.id, { frequency: e.target.value })} style={{ flex: 1, minWidth: 0, boxSizing: "border-box", borderRadius: 8, padding: "8px 9px", border: "1px solid rgb(var(--c-border))", background: "rgb(var(--c-surface))", color: "rgb(var(--c-charcoal))", fontSize: 12, fontWeight: 500 }}>
                {frequencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {costItems.length > 1 && <button type="button" onClick={() => removeCostItem(item.id)} style={{ border: 0, background: "transparent", color: "rgb(var(--c-down))", fontSize: 11, cursor: "pointer" }}>Hapus</button>}
            </div>
            <div style={{ fontSize: 10, color: "rgb(var(--c-muted))", marginTop: 5 }}>{item.frequency === "once" ? "Dibayar satu kali pada awal jenjang." : `${paymentCount(item.frequency)}x per tahun selama ${safeDuration} tahun.`}</div>
          </div>)}
        </div>
        <button type="button" onClick={addCostItem} style={{ marginTop: 10, border: "1px dashed rgb(var(--c-border))", background: "transparent", color: "rgb(var(--c-accent-text))", borderRadius: 9, padding: "8px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Tambah komponen biaya</button>
      </div>
      <div className="card" style={{ background: "rgb(var(--c-cream))", padding: 14 }}>
        <div style={{ fontSize: 11, color: "rgb(var(--c-muted))", marginBottom: 5 }}>Simulasi saat ini</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{educationLevel} · {safeStartYear}–{safeStartYear + safeDuration - 1}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "rgb(var(--c-accent-text))", marginTop: 4 }}>{rupiah(currentStage.total)}</div>
      </div>
      <Button onClick={addEducationPlan} icon={<Plus size={15} />} iconRight={<ArrowRight size={14} />}>Tambahkan {educationLevel}</Button>
    </>}
    results={<>
      <ResultTile label="TOTAL KEBUTUHAN PENDIDIKAN (GABUNGAN)" value={rupiah(totalEducationNeed)} sub={`${educationPlans.length} jenjang tersimpan + simulasi ${educationLevel} saat ini`} />
      <div className="card" style={{ marginTop: 16, padding: 14, minWidth: 0 }}>
        <h4 style={{ margin: "0 0 4px", fontSize: 14 }}>Rencana pendidikan</h4>
        {educationPlans.map((item) => renderStage(item))}
        {renderStage({ ...currentStage, id: "current-education-simulation" }, true)}
      </div>
      <div style={{ marginTop: 16, padding: "12px 16px", background: "rgb(var(--c-cream))", borderRadius: 14, fontSize: 11, color: "rgb(var(--c-muted))", lineHeight: 1.55 }}>Catatan: uang pangkal sekali bayar dihitung di tahun pertama. Biaya lain mengikuti frekuensi pembayaran × durasi. Inflasi dan return adalah asumsi, sesuaikan.</div>
    </>}
    onSave={() => onSaveResult({
      id: "edu",
      title: "Dana Pendidikan",
      value: formatIDR(Math.round(totalEducationNeed)),
      plan: {
        type: "education",
        targetAmount: totalEducationNeed,
        monthlyAmount: nearestStage?.monthlySaving ?? 0,
        timeframe: nearestStage?.monthsUntilStart ? nearestStage.monthsUntilStart / 12 : 0,
        targetYear: nearestStage?.startYear ?? safeStartYear,
        stages: educationPlans,
      },
    })}
    onNavigate={onNavigate}
    calcId="edu"
    relatedId="edu"
  />;
}

// ============================================================
// 6. PENSION CALCULATOR
// ============================================================
function PensionCalc({ onSaveResult, onNavigate }) {
  const [monthlyNeeded, setMonthlyNeeded] = React.useState(10000000);
  const [retirementAge, setRetirementAge] = React.useState(60);
  const [lifeExpectancy, setLifeExpectancy] = React.useState(85);
  const [currentAge, setCurrentAge] = React.useState(35);
  const [inflation, setInflation] = React.useState(3);
  const [returnRate, setReturnRate] = React.useState(6);

  const yearsToRetirement = retirementAge - currentAge;
  const yearsInRetirement = lifeExpectancy - retirementAge;
  const futureMonthly = monthlyNeeded * Math.pow(1 + inflation / 100, yearsToRetirement);
  const monthlyInRetirement = futureMonthly * Math.pow(1 + inflation / 100, yearsInRetirement / 2);
  const totalNeed = monthlyInRetirement * 12 * yearsInRetirement;
  const monthlyRate = returnRate / 100 / 12;
  const months = yearsToRetirement * 12;
  const monthlyPayment = totalNeed / (Math.pow(1 + monthlyRate, months) - 1) * monthlyRate;

  return (
    <CalcLayout
      inputs={
        <>
          <NumberInput label="Kebutuhan bulanan saat pensiun" prefix="Rp" value={monthlyNeeded} onChange={setMonthlyNeeded} step={500000} />
          <Slider label="Usia sekarang" value={currentAge} onChange={setCurrentAge} min={20} max={50} format={(v) => `${v} tahun`} />
          <Slider label="Target usia pensiun" value={retirementAge} onChange={setRetirementAge} min={30} max={70} format={(v) => `${v} tahun`} />
          <Slider label="Perkiraan usia harapan" value={lifeExpectancy} onChange={setLifeExpectancy} min={retirementAge + 10} max={100} format={(v) => `${v} tahun`} />
          <Slider label="Inflasi biaya hidup" value={inflation} onChange={setInflation} min={1} max={8} step={0.5} format={(v) => `${v}%`} />
          <Slider label="Return investasi" value={returnRate} onChange={setReturnRate} min={2} max={100} step={0.5} format={(v) => `${v}%`} />
        </>
      }
      results={
        <>
          <ResultTile
            label="TABUNGAN BULANAN DIBUTUHKAN"
            value={formatIDR(Math.round(monthlyPayment))}
            sub={`Mulai sekarang hingga umur ${retirementAge}`}
          />
          <div className="card" style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 16 }}>Simulasi Pensiun</h4>
            <BreakdownRow label="Tahun hingga pensiun" value={`${yearsToRetirement} tahun`} />
            <BreakdownRow label="Kebutuhan bulanan saat pensiun" value={formatIDR(Math.round(monthlyInRetirement))} sub={`Dari ${formatIDR(Math.round(futureMonthly))} (adjusted ${yearsInRetirement / 2} tahun inflasi)`} />
            <BreakdownRow label="Tahun pensiun" value={`${yearsInRetirement} tahun`} sub={`Usia ${retirementAge}-${lifeExpectancy}`} />
            <BreakdownRow label="Total dana yang dibutuhkan" value={formatIDR(Math.round(totalNeed))} highlight />
          </div>
        </>
      }
      onSave={() => onSaveResult({ id: "pension", title: "Pensiun", value: formatIDR(Math.round(monthlyPayment)) + "/bln", plan: { type: "retirement", targetAmount: totalNeed, monthlyAmount: monthlyPayment, timeframe: yearsToRetirement } })}
      onNavigate={onNavigate}
      calcId="pension"
      relatedId="pension"
    />
  );
}

// ============================================================
// 7. HAJI & UMROH CALCULATOR
// ============================================================
function HajiCalc({ onSaveResult, onNavigate }) {
  const [language, setLanguage] = React.useState(getAppLanguage());
  React.useEffect(() => {
    const updateLanguage = () => setLanguage(getAppLanguage());
    window.addEventListener("wealthplanner:language-changed", updateLanguage);
    return () => window.removeEventListener("wealthplanner:language-changed", updateLanguage);
  }, []);
  const isId = language === "id";

  const tahunSaatIni = new Date().getFullYear();
  const [daftarHaji, setDaftarHaji] = React.useState(40000000);
  const [nilaiManfaatSubsidi, setNilaiManfaatSubsidi] = React.useState(0);
  const [targetTahunInput, setTargetTahunInput] = React.useState(String(tahunSaatIni + 2));
  const [dpSetoran, setDpSetoran] = React.useState(10000000);
  const [inflasi, setInflasi] = React.useState(5);
  const [returnInvestasi, setReturnInvestasi] = React.useState(0);

  const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const targetParsed = targetTahunInput.trim() === "" ? tahunSaatIni : Number(targetTahunInput);
  const targetBerangkat = Number.isFinite(targetParsed) ? targetParsed : tahunSaatIni;
  const tahunMenuju = Math.max(0, targetBerangkat - tahunSaatIni);
  const biayaHaji = Math.max(0, finite(daftarHaji));
  const bantuanAwal = Math.max(0, finite(nilaiManfaatSubsidi));
  const dp = Math.max(0, finite(dpSetoran));
  const inflasiRate = Math.max(0, finite(inflasi));
  const returnRate = Math.max(0, finite(returnInvestasi));
  const totalBiayaDenganInflasi = finite(biayaHaji * Math.pow(1 + inflasiRate / 100, tahunMenuju));
  const estimasiBantuan = finite(bantuanAwal * Math.pow(1 + inflasiRate / 100, tahunMenuju));
  const estimasiBiayaJemaah = Math.max(finite(totalBiayaDenganInflasi - estimasiBantuan), 0);
  const sisaDana = Math.max(finite(estimasiBiayaJemaah - dp), 0);
  const totalBulan = tahunMenuju * 12;
  const returnBulanan = returnRate / 100 / 12;
  const annuityDenominator = Math.pow(1 + returnBulanan, totalBulan) - 1;
  const budgetBulananRaw = totalBulan <= 0
    ? sisaDana
    : returnBulanan === 0
      ? sisaDana / totalBulan
      : annuityDenominator > 0
        ? sisaDana * returnBulanan / annuityDenominator
        : 0;
  const budgetBulanan = Math.max(finite(budgetBulananRaw), 0);
  const budgetTanpaInvestasi = totalBulan > 0 ? finite(sisaDana / totalBulan) : 0;
  const hemat = Math.max(finite(budgetTanpaInvestasi - budgetBulanan), 0);
  const percent = (value) => {
    const rounded = Math.round(finite(value) * 10) / 10;
    return `${rounded.toLocaleString(isId ? "id-ID" : "en-US", { maximumFractionDigits: 1 })}%`;
  };
  const clampTargetYear = () => {
    const parsed = targetTahunInput.trim() === "" ? tahunSaatIni : Number(targetTahunInput);
    const safeYear = Number.isFinite(parsed) ? Math.round(parsed) : tahunSaatIni;
    setTargetTahunInput(String(Math.min(tahunSaatIni + 30, Math.max(tahunSaatIni, safeYear))));
  };

  const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "rgb(var(--c-forest-800))", marginBottom: 6 };
  const yearInputStyle = {
    width: "100%", boxSizing: "border-box", border: "1px solid rgb(var(--c-border))",
    borderRadius: 10, padding: "11px 12px", fontSize: 13,
    background: "rgb(var(--c-surface))", color: "rgb(var(--c-charcoal))",
  };
  const resultCardStyle = {
    minWidth: 0, background: "rgb(var(--c-forest-50))",
    border: "1px solid rgb(var(--c-forest-100))", borderRadius: 16, padding: 14,
    boxSizing: "border-box",
  };
  const resultLabelStyle = {
    minHeight: 30, fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
    color: "rgb(var(--c-forest-800))", textTransform: "uppercase", marginBottom: 8,
  };
  const resultValueStyle = { fontSize: 24, fontWeight: 800, lineHeight: 1.15, color: "rgb(var(--c-accent-text))", overflowWrap: "anywhere" };
  const subStyle = { fontSize: 11, color: "rgb(var(--c-forest-800))", lineHeight: 1.45, marginTop: 7, overflowWrap: "anywhere" };

  return (
    <CalcLayout
      inputs={
        <>
          <NumberInput label={isId ? "Biaya haji saat ini (acuan)" : "Current Hajj cost (reference)"} prefix="Rp" value={daftarHaji} onChange={setDaftarHaji} step={1000000} />
          <NumberInput
            label={isId ? "Perkiraan Nilai Manfaat Haji & Subsidi Pemerintah" : "Estimated Hajj Benefit Value & Government Subsidy"}
            prefix="Rp" value={nilaiManfaatSubsidi} onChange={setNilaiManfaatSubsidi} step={1000000}
            hint={isId ? "Masukkan estimasi gabungan bantuan pembiayaan. Isi 0 jika belum ada estimasi." : "Enter the combined estimate of financing assistance. Enter 0 if you have no estimate yet."}
          />
          <div>
            <label style={labelStyle}>{isId ? "Target tahun keberangkatan" : "Target departure year"}</label>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*"
              aria-label={isId ? "Target tahun keberangkatan" : "Target departure year"}
              placeholder={isId ? "Masukkan tahun" : "Enter year"}
              value={targetTahunInput}
              onChange={(event) => setTargetTahunInput(event.target.value.replace(/[^0-9]/g, ""))}
              onBlur={clampTargetYear}
              style={yearInputStyle}
            />
          </div>
          <NumberInput label={isId ? "DP / Setoran awal" : "Down payment / Initial deposit"} prefix="Rp" value={dpSetoran} onChange={setDpSetoran} step={1000000} />
          <Slider label={isId ? "Estimasi inflasi biaya haji" : "Estimated Hajj cost inflation"} value={inflasi} onChange={setInflasi} min={0} max={10} step={0.5} format={percent} />
          <Slider label={isId ? "Estimasi return investasi tahunan" : "Estimated annual investment return"} value={returnInvestasi} onChange={setReturnInvestasi} min={0} max={20} step={0.5} format={percent} />
        </>
      }
      results={
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 10 }}>
            <div style={resultCardStyle}>
              <div style={resultLabelStyle}>{isId ? "Target berangkat" : "Target departure"}</div>
              <div style={resultValueStyle}>{targetBerangkat}</div>
              <div style={subStyle}>
                {tahunMenuju === 0 ? (isId ? "Tahun ini" : "This year") : (isId ? `Dalam ${tahunMenuju} tahun` : `In ${tahunMenuju} ${tahunMenuju === 1 ? "year" : "years"}`)}
              </div>
            </div>
            <div style={resultCardStyle}>
              <div style={resultLabelStyle}>{isId ? "Estimasi biaya jemaah (setelah bantuan)" : "Estimated pilgrim cost (after assistance)"}</div>
              <div style={resultValueStyle}>{formatIDR(Math.round(estimasiBiayaJemaah))}</div>
              <div style={subStyle}>
                {isId ? "Estimasi total biaya" : "Estimated total cost"} {formatIDR(Math.round(totalBiayaDenganInflasi))} − {isId ? "bantuan" : "assistance"} {formatIDR(Math.round(estimasiBantuan))}
              </div>
            </div>
          </div>
          <Card style={{ marginTop: 10, padding: 14, gap: 10 }}>
            <h4 style={{ margin: 0, color: "rgb(var(--c-forest-800))" }}>{isId ? "Rencana Pelunasan" : "Payoff Plan"}</h4>
            <BreakdownRow label={isId ? "DP / Setoran awal" : "Down payment / Initial deposit"} value={formatIDR(Math.round(dp))} />
            <BreakdownRow label={isId ? "Sisa dana dibutuhkan" : "Remaining funds needed"} value={formatIDR(Math.round(sisaDana))} />
            <BreakdownRow label={isId ? "Budget bulanan yang diperlukan" : "Required monthly budget"} value={formatIDR(Math.round(budgetBulanan))} highlight />
            {returnRate > 0 && hemat > 0 && <BreakdownRow label={isId ? `Lebih hemat berkat investasi ${percent(returnRate)}/thn` : `Saved thanks to ${percent(returnRate)}/yr investment return`} value={`−${formatIDR(Math.round(hemat))}/${isId ? "bln" : "mo"}`} muted />}
          </Card>
          <div style={{ marginTop: 10, padding: "10px 12px", background: "rgb(var(--c-cream))", border: "1px solid rgb(var(--c-border))", borderRadius: 12, fontSize: 11.5, lineHeight: 1.5, color: "rgb(var(--c-forest-800))" }}>
            {isId
              ? "Untuk Haji Reguler, total biaya penyelenggaraan (BPIH) tidak selalu sama dengan biaya yang dibayar jemaah (Bipih). Masukkan perkiraan gabungan Nilai Manfaat Haji dan subsidi pemerintah jika ingin memperhitungkan bantuan tersebut. Nilai aktual dapat berubah setiap tahun; proyeksi bantuan di kalkulator ini hanya asumsi, bukan angka resmi untuk tahun keberangkatan mendatang."
              : "For Regular Hajj, the total operating cost (BPIH) is not always the same as the amount paid by the pilgrim (Bipih). Enter a combined estimate of Hajj Benefit Value and government subsidy if you want to include that assistance. Actual values may change every year; the assistance projection in this calculator is only an assumption, not an official figure for a future departure year."}
          </div>
          <div style={{ marginTop: 10, padding: 12, background: "rgb(var(--c-forest-50))", borderRadius: 12, fontSize: 12, lineHeight: 1.55, color: "rgb(var(--c-forest-800))" }}>
            {isId
              ? "Tahukah kamu? Persiapan haji bukan hanya soal biaya pelunasan, tetapi juga kesiapan menghadapi risiko kesehatan dan meninggal dunia. Rencanakan dana haji sekaligus pelajari opsi proteksi dan skema badal haji sesuai ketentuan yang berlaku."
              : "Did you know? Hajj preparation is not only about the final payment, but also readiness for health risks and death. Plan your Hajj funds while learning about protection options and badal Hajj arrangements, subject to applicable rules."}
          </div>
          <a href="https://www.wealthplanner.id/konsultasiasuransi" target="_blank" rel="noopener" aria-label={isId ? "Konsultasikan Rencana" : "Consult Your Plan"} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 10, textAlign: "center", background: "rgb(var(--c-accent))", color: "rgb(var(--c-accent-ink))", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            {isId ? "Konsultasikan Rencana" : "Consult Your Plan"}
          </a>
        </>
      }
      onSave={() => onSaveResult({
        id: "haji",
        title: isId ? "Haji & Umroh" : "Hajj & Umrah",
        value: `${targetBerangkat} · Rp ${formatIDR(Math.round(budgetBulanan))}/${isId ? "bln" : "mo"}`,
        plan: { type: "hajj", targetAmount: estimasiBiayaJemaah, monthlyAmount: budgetBulanan, timeframe: tahunMenuju, preparedAssets: dp, targetYear: targetBerangkat },
      })}
      onNavigate={onNavigate}
      calcId="haji"
      relatedId={null}
    />
  );
}
// ============================================================
// 8. WARISAN CALCULATOR (REBUILT — CLEAN, SIMPLE, PIE CHART)
// ============================================================
// Redeploy trigger: refresh WarisanCalc production build.
function WarisanCalc({ onSaveResult, onNavigate }) {
  const [language, setLanguage] = React.useState(getAppLanguage());
  React.useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const isId = language === "id";
  // INPUT STATE
  const [totalAset, setTotalAset] = React.useState(1000000000);
  const [hutang, setHutang] = React.useState(0);
  const [biayaPemakaman, setBiayaPemakaman] = React.useState(10000000);
  const [genderPewaris, setGenderPewaris] = React.useState("laki"); // "laki" → pasangan=Istri; "perempuan" → pasangan=Suami
  const [jumlahIstri, setJumlahIstri] = React.useState(1);
  const [suamiHidup, setSuamiHidup] = React.useState(true);
  const [jumlahAnakLaki, setJumlahAnakLaki] = React.useState(1);
  const [jumlahAnakPerempuan, setJumlahAnakPerempuan] = React.useState(1);
  const [ayahHidup, setAyahHidup] = React.useState(true);
  const [ibuHidup, setIbuHidup] = React.useState(true);
  const [modeWarisan, setModeWarisan] = React.useState("syariah");
  const [targetWarisan, setTargetWarisan] = React.useState(1000000000);

  // CALCULATIONS
  const hartaBersih = Math.max(0, totalAset - hutang - biayaPemakaman);
  const totalAnak = jumlahAnakLaki + jumlahAnakPerempuan;
  const adaAnak = totalAnak > 0;
  const adaAnakLaki = jumlahAnakLaki > 0;

  // ===== FARAIDH LOGIC =====
  // Aturan dasar (sesuai tabel):
  //  Pasangan: Suami 1/4 (ada anak) / 1/2 (tdk); Istri 1/8 (ada anak) / 1/4 (tdk)
  //  Ibu:      1/6 (ada anak) / 1/3 (tdk)
  //  Ayah:     1/6 (ada anak)  / Sisa/Ashabah (tdk ada anak)
  //  Anak:     Jika ada anak laki — semua ashabah, laki 2× perempuan
  //            Jika hanya anak perempuan — 1 anak: 1/2; 2+ anak: 2/3 (dibagi rata),
  //                                        sisa ke ashabah (ayah jika hidup)

  // 1) Pasangan
  let pasanganInfo = null;
  if (genderPewaris === "laki" && jumlahIstri > 0) {
    const total = adaAnak ? 1/8 : 1/4;
    pasanganInfo = {
      tipe: "istri",
      jumlah: jumlahIstri,
      totalFraksi: total,
      perOrang: total / jumlahIstri,
      label: adaAnak ? "1/8" : "1/4",
    };
  } else if (genderPewaris === "perempuan" && suamiHidup) {
    const total = adaAnak ? 1/4 : 1/2;
    pasanganInfo = {
      tipe: "suami",
      jumlah: 1,
      totalFraksi: total,
      perOrang: total,
      label: adaAnak ? "1/4" : "1/2",
    };
  }
  const pasanganFraksi = pasanganInfo ? pasanganInfo.totalFraksi : 0;

  // 2) Ibu
  const ibuFraksi = ibuHidup ? (adaAnak ? 1/6 : 1/3) : 0;

  // 3) Ayah — porsi tetap hanya jika ada anak
  const ayahTetap = (ayahHidup && adaAnak) ? 1/6 : 0;

  // 4) Anak
  let anakInfo = null;
  if (adaAnak) {
    if (adaAnakLaki) {
      // Semua anak ashabah, berbagi sisa setelah furudh
      const sisaUntukAnak = Math.max(0, 1 - pasanganFraksi - ibuFraksi - ayahTetap);
      const unit = sisaUntukAnak / (2 * jumlahAnakLaki + jumlahAnakPerempuan);
      anakInfo = {
        mode: "ashabah",
        fraksiLaki: 2 * unit,
        fraksiPerempuan: unit,
        totalFraksi: sisaUntukAnak,
      };
    } else {
      // Hanya anak perempuan → fardh
      const total = jumlahAnakPerempuan === 1 ? 1/2 : 2/3;
      anakInfo = {
        mode: "furudh",
        totalFraksi: total,
        perOrang: total / jumlahAnakPerempuan,
        label: jumlahAnakPerempuan === 1 ? "1/2" : "2/3",
      };
    }
  }
  const anakFraksi = anakInfo ? anakInfo.totalFraksi : 0;

  // Sisa untuk Ayah (ashabah) — bisa terjadi:
  //   • Tidak ada anak → ayah dapat seluruh sisa
  //   • Anak perempuan saja → ayah dapat 1/6 (tetap) + sisa setelah anak perempuan
  const ayahSisa = ayahHidup
    ? Math.max(0, 1 - pasanganFraksi - ibuFraksi - ayahTetap - anakFraksi)
    : 0;
  // Ayah hanya boleh mengambil sisa kalau "berhak ashabah" — yaitu saat tidak ada anak laki
  const ayahDapatSisa = ayahHidup && !adaAnakLaki ? ayahSisa : 0;

  // ===== BUILD DISPLAY ROWS =====
  const ahliWaris = [];

  // Pasangan
  if (pasanganInfo) {
    if (pasanganInfo.tipe === "istri") {
      for (let i = 0; i < pasanganInfo.jumlah; i++) {
        ahliWaris.push({
          nama: `Istri${pasanganInfo.jumlah > 1 ? " " + (i + 1) : ""}`,
          status: "Ashabul Furudh",
          fraksiText: pasanganInfo.jumlah > 1
            ? `${pasanganInfo.label} ÷ ${pasanganInfo.jumlah}`
            : pasanganInfo.label,
          fraksi: pasanganInfo.perOrang,
        });
      }
    } else {
      ahliWaris.push({
        nama: "Suami",
        status: "Ashabul Furudh",
        fraksiText: pasanganInfo.label,
        fraksi: pasanganInfo.totalFraksi,
      });
    }
  }

  // Ayah — gabung porsi tetap + sisa
  if (ayahHidup) {
    const ayahTotal = ayahTetap + ayahDapatSisa;
    if (ayahTotal > 1e-9) {
      let status, fraksiText;
      if (ayahTetap > 0 && ayahDapatSisa > 0) {
        status = "Ashabul Furudh + Ashabah";
        fraksiText = "1/6 + sisa";
      } else if (ayahTetap > 0) {
        status = "Ashabul Furudh";
        fraksiText = "1/6";
      } else {
        status = "Ashabah";
        fraksiText = "Sisa";
      }
      ahliWaris.push({ nama: "Ayah", status, fraksiText, fraksi: ayahTotal });
    }
  }

  // Ibu
  if (ibuHidup) {
    ahliWaris.push({
      nama: "Ibu",
      status: "Ashabul Furudh",
      fraksiText: adaAnak ? "1/6" : "1/3",
      fraksi: ibuFraksi,
    });
  }

  // Anak
  if (anakInfo) {
    if (anakInfo.mode === "ashabah") {
      for (let i = 0; i < jumlahAnakLaki; i++) {
        ahliWaris.push({
          nama: `Anak Laki-laki${jumlahAnakLaki > 1 ? " " + (i + 1) : ""}`,
          status: "Ashabah",
          fraksiText: `${(anakInfo.fraksiLaki * 100).toFixed(1)}%`,
          fraksi: anakInfo.fraksiLaki,
        });
      }
      for (let i = 0; i < jumlahAnakPerempuan; i++) {
        ahliWaris.push({
          nama: `Anak Perempuan${jumlahAnakPerempuan > 1 ? " " + (i + 1) : ""}`,
          status: "Ashabah",
          fraksiText: `${(anakInfo.fraksiPerempuan * 100).toFixed(1)}%`,
          fraksi: anakInfo.fraksiPerempuan,
        });
      }
    } else {
      // Hanya anak perempuan
      for (let i = 0; i < jumlahAnakPerempuan; i++) {
        ahliWaris.push({
          nama: `Anak Perempuan${jumlahAnakPerempuan > 1 ? " " + (i + 1) : ""}`,
          status: "Ashabul Furudh",
          fraksiText: jumlahAnakPerempuan > 1
            ? `${anakInfo.label} ÷ ${jumlahAnakPerempuan}`
            : anakInfo.label,
          fraksi: anakInfo.perOrang,
        });
      }
    }
  }

  // Koreksi 'aul: normalisasi bagian saat total furudh melebihi harta.
  const totalFraksiSebelumAul = ahliWaris.reduce((sum, aw) => sum + aw.fraksi, 0);
  const adaAul = totalFraksiSebelumAul > 1 + 1e-9;
  if (adaAul) ahliWaris.forEach((aw) => { aw.fraksi /= totalFraksiSebelumAul; aw.fraksiText = "Bagian disesuaikan ('aul)"; });

  // Tambahkan nominal
  ahliWaris.forEach((aw) => { aw.nominal = hartaBersih * aw.fraksi; });

  // PIE CHART DATA
  const pieData = ahliWaris.map((aw) => ({
    name: aw.nama,
    value: Math.round(aw.nominal),
    fraksi: aw.fraksi,
  }));

  const COLORS = ["rgb(var(--c-accent))", "rgb(var(--c-forest-800))", "rgb(var(--c-accent-text))", "rgb(var(--c-forest-50))", "rgb(var(--c-accent-ink))", "rgb(var(--c-muted))", "rgb(var(--c-charcoal))"];

  const pctTarget = targetWarisan > 0 ? Math.min(100, Math.round((Math.max(0, hartaBersih) / targetWarisan) * 100)) : 0;
  const kurangTarget = Math.max(0, targetWarisan - Math.max(0, hartaBersih));
  const totalNominalBagi = ahliWaris.reduce((sum, aw) => sum + aw.nominal, 0);
  const modeBtn = (active) => ({
    flex: 1, minWidth: 0, padding: "8px 6px", borderRadius: 10, border: 0, cursor: "pointer",
    font: "inherit", fontSize: 12, fontWeight: 700,
    background: active ? "rgb(var(--c-accent))" : "rgb(var(--c-cream))",
    color: active ? "rgb(var(--c-accent-ink))" : "rgb(var(--c-forest-800))",
  });
  const th = { padding: "6px 0", fontWeight: 600, color: "rgb(var(--c-forest-800))", fontSize: 11 };
  const td = { padding: "7px 0", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" };

  return (
    <CalcLayout
      calcId="warisan"
      onNavigate={onNavigate}
      onSave={() => onSaveResult({
        id: "warisan",
        title: "Perencanaan Warisan",
        value: modeWarisan === "umum"
          ? `Harta bersih ${formatIDR(Math.round(hartaBersih))} · ${pctTarget}% dari target`
          : `${ahliWaris.length} ahli waris · Total ${formatIDR(Math.round(totalNominalBagi))}`,
        plan: { type: "inheritance", targetAmount: modeWarisan === "umum" ? targetWarisan : totalAset, preparedAssets: totalAset - hutang, timeframe: 1 },
      })}
      inputs={
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setModeWarisan("umum")} style={modeBtn(modeWarisan === "umum")}>Umum</button>
            <button type="button" onClick={() => setModeWarisan("syariah")} style={modeBtn(modeWarisan === "syariah")}>Syariah (Faraidh)</button>
          </div>
          <NumberInput label="Total Aset" prefix="Rp" value={totalAset} onChange={setTotalAset} step={50000000} />
          <NumberInput label="Hutang" prefix="Rp" value={hutang} onChange={setHutang} step={10000000} />
          <NumberInput label="Biaya Pemakaman & Kewajiban" prefix="Rp" value={biayaPemakaman} onChange={setBiayaPemakaman} step={5000000} />
          <NumberInput label="Target Warisan" prefix="Rp" value={targetWarisan} onChange={setTargetWarisan} step={50000000} hint="Target digunakan untuk melihat kecukupan harta bersih." />
          {modeWarisan === "syariah" && (
            <>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--c-forest-800))", marginBottom: 7 }}>Jenis Kelamin Pewaris</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setGenderPewaris("laki")} style={modeBtn(genderPewaris === "laki")}>Laki-laki</button>
                  <button type="button" onClick={() => setGenderPewaris("perempuan")} style={modeBtn(genderPewaris === "perempuan")}>Perempuan</button>
                </div>
                <div style={{ fontSize: 11, marginTop: 5, lineHeight: 1.4, color: "rgb(var(--c-muted))" }}>Menentukan pasangan ahli waris: laki-laki → istri, perempuan → suami.</div>
              </div>
              {genderPewaris === "laki" ? (
                <Slider label="Jumlah Istri" value={jumlahIstri} onChange={setJumlahIstri} min={0} max={4} step={1} format={(v) => `${v}`} />
              ) : (
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                  <input type="checkbox" checked={suamiHidup} onChange={(e) => setSuamiHidup(e.target.checked)} style={{ width: 16, height: 16 }} /> Suami masih hidup
                </label>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                <Slider label="Anak Laki-laki" value={jumlahAnakLaki} onChange={setJumlahAnakLaki} min={0} max={10} step={1} format={(v) => `${v}`} />
                <Slider label="Anak Perempuan" value={jumlahAnakPerempuan} onChange={setJumlahAnakPerempuan} min={0} max={10} step={1} format={(v) => `${v}`} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                  <input type="checkbox" checked={ayahHidup} onChange={(e) => setAyahHidup(e.target.checked)} style={{ width: 16, height: 16 }} /> Ayah masih hidup
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                  <input type="checkbox" checked={ibuHidup} onChange={(e) => setIbuHidup(e.target.checked)} style={{ width: 16, height: 16 }} /> Ibu masih hidup
                </label>
              </div>
            </>
          )}
        </>
      }
      results={
        <div style={{ display: "grid", gap: 10 }}>
          <ResultTile
            label="Total harta bersih"
            value={formatIDR(Math.round(Math.max(0, hartaBersih)))}
            sub={`Aset ${formatIDR(totalAset)} − Hutang ${formatIDR(hutang)} − Pemakaman ${formatIDR(biayaPemakaman)}`}
          />
          {modeWarisan === "umum" && (
            <Card style={{ padding: 14 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Target Warisan</h4>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: "rgb(var(--c-muted))" }}>Harta bersih vs target</span><b>{pctTarget}%</b>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: "rgb(var(--c-border))", overflow: "hidden", marginBottom: 8 }}>
                <div style={{ width: `${pctTarget}%`, height: "100%", background: "rgb(var(--c-accent))" }} />
              </div>
              <BreakdownRow label="Target warisan" value={formatIDR(targetWarisan)} />
              <BreakdownRow label="Total harta bersih" value={formatIDR(Math.round(Math.max(0, hartaBersih)))} />
              <BreakdownRow label={kurangTarget > 0 ? "Kekurangan dari target" : "Target tercapai"} value={formatIDR(Math.round(kurangTarget))} highlight />
              <div style={{ fontSize: 11, marginTop: 8, color: "rgb(var(--c-muted))" }}>Pembagian ke ahli waris (faraidh) hanya ditampilkan pada mode Syariah.</div>
            </Card>
          )}
          {modeWarisan === "syariah" && (
            <Card style={{ padding: 14, overflow: "auto" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 14 }}>Pembagian Warisan (Faraidh)</h4>
              {ahliWaris.length > 0 ? (
                <>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgb(var(--c-border))" }}>
                        <th style={{ ...th, textAlign: "left" }}>Ahli Waris</th>
                        <th style={{ ...th, textAlign: "right" }}>Fraksi</th>
                        <th style={{ ...th, textAlign: "right" }}>%</th>
                        <th style={{ ...th, textAlign: "right" }}>Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ahliWaris.map((aw, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid rgb(var(--c-border))" }}>
                          <td style={{ padding: "7px 0", fontSize: 12, fontWeight: 600 }}>
                            <div>{aw.nama}</div>
                            <div style={{ fontSize: 10, fontWeight: 400, color: "rgb(var(--c-muted))" }}>{aw.status}</div>
                          </td>
                          <td style={{ ...td, textAlign: "right" }}>{aw.fraksiText}</td>
                          <td style={{ ...td, textAlign: "right" }}>{(aw.fraksi * 100).toFixed(1).replace(".", ",")}%</td>
                          <td style={{ ...td, textAlign: "right", color: "rgb(var(--c-accent-text))" }}>{formatIDR(Math.round(aw.nominal))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginTop: 8 }}>
                    <span>Total dibagikan</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{formatIDR(Math.round(totalNominalBagi))}</span>
                  </div>
                  {adaAul && <div style={{ fontSize: 11, marginTop: 6, color: "rgb(var(--c-muted))" }}>Terjadi 'aul: bagian dikurangi secara proporsional.</div>}
                </>
              ) : (
                <div style={{ fontSize: 12, color: "rgb(var(--c-muted))" }}>Belum ada ahli waris yang dipilih.</div>
              )}
            </Card>
          )}
          {modeWarisan === "syariah" && ahliWaris.length > 0 && (
            <Card style={{ padding: 14 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>Visualisasi Pembagian</h4>
              <SimplePieChart data={pieData} colors={COLORS} />
            </Card>
          )}
          <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgb(var(--c-cream))", borderLeft: "3px solid rgb(var(--c-accent))", fontSize: 11, lineHeight: 1.5, color: "rgb(var(--c-forest-800))" }}>
            <strong>Disclaimer:</strong> Simulasi ini bersifat edukatif dan dapat berbeda tergantung kondisi ahli waris serta ketentuan syariah yang berlaku. Untuk kasus kompleks, konsultasikan dengan ahli faraidh atau Pengadilan Agama.
          </div>
        </div>
      }
    />
  );
}

// Simple Pie Chart Component
function SimplePieChart({ data, colors }) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  if (!data.length || total <= 0) return null;

  let currentAngle = -90;
  const slices = data.map((item, idx) => {
    const percentage = item.value / total;
    const sliceAngle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return <path key={idx} d={pathData} fill={colors[idx % colors.length]} stroke="rgb(var(--c-surface))" strokeWidth="1.5" />;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", width: "100%", minWidth: 0 }}>
      <svg role="img" aria-label="Inheritance distribution chart" viewBox="0 0 200 200" style={{ display: "block", width: "min(100%, 220px)", height: "auto", aspectRatio: "1 / 1", flex: "0 1 auto" }}>
        {slices}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 9, width: "100%", minWidth: 0 }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0, fontSize: 12, color: "rgb(var(--c-charcoal))" }}>
            <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 3, background: colors[idx % colors.length], flex: "0 0 11px" }} />
            <span style={{ flex: "1 1 auto", minWidth: 0, overflowWrap: "anywhere" }}>{item.name}</span>
            <span style={{ flex: "0 0 auto", fontWeight: 700, color: "rgb(var(--c-forest-800))", fontVariantNumeric: "tabular-nums" }}>{(item.fraksi * 100).toFixed(1).replace(".", ",")}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 9. ZAKAT CALCULATOR
// ============================================================
function ZakatCalc({ onSaveResult, onNavigate }) {
  const [language, setLanguage] = React.useState(getAppLanguage());
  React.useEffect(() => {
    const update = () => setLanguage(getAppLanguage());
    window.addEventListener("wealthplanner:language-changed", update);
    return () => window.removeEventListener("wealthplanner:language-changed", update);
  }, []);
  const isId = language === "id";
  const [tab, setTab] = React.useState("income");
  const [income, setIncome] = React.useState(20000000);
  const [basis, setBasis] = React.useState("gross");
  const [basicNeeds, setBasicNeeds] = React.useState(9000000);
  const [goldPrice, setGoldPrice] = React.useState(2500000);
  const [rate, setRate] = React.useState(2.5);
  const [showIncomeInfo, setShowIncomeInfo] = React.useState(false);
  const [savings, setSavings] = React.useState(60000000);
  const [investments, setInvestments] = React.useState(120000000);
  const [goldSilver, setGoldSilver] = React.useState(30000000);
  const [receivables, setReceivables] = React.useState(0);
  const [debts, setDebts] = React.useState(10000000);
  const [showDebtInfo, setShowDebtInfo] = React.useState(false);
  const [waqfTarget, setWaqfTarget] = React.useState(30000000);
  const [waqfInstallment, setWaqfInstallment] = React.useState(250000);

  const fmt = (n) => formatIDR(Math.round(Number.isFinite(n) ? n : 0));
  const pct = (n) => `${Number(n).toLocaleString(isId ? "id-ID" : "en-US", { maximumFractionDigits: 1 })}%`;
  const monthlyNisab = 85 * goldPrice / 12;
  const incomeBasis = basis === "gross" ? income : Math.max(0, income - basicNeeds);
  const monthlyZakat = incomeBasis >= monthlyNisab ? incomeBasis * rate / 100 : 0;
  const annualZakat = monthlyZakat * 12;
  const totalAssets = savings + investments + goldSilver + receivables;
  const netWealth = Math.max(0, totalAssets - debts);
  const maalNisab = 85 * goldPrice;
  const maalZakat = netWealth >= maalNisab ? netWealth * 0.025 : 0;
  const waqfMonths = waqfTarget > 0 && waqfInstallment > 0 ? Math.ceil(waqfTarget / waqfInstallment) : 0;
  const waqfYears = Math.floor(waqfMonths / 12);
  const waqfRemainder = waqfMonths % 12;
  const duration = waqfMonths === 0 ? "-" : waqfRemainder === 0
    ? `${waqfYears} ${isId ? "tahun" : "years"} (${waqfMonths} ${isId ? "bulan" : "months"})`
    : `${waqfYears} ${isId ? "tahun" : "years"} ${waqfRemainder} ${isId ? "bulan" : "months"} (${waqfMonths} ${isId ? "bulan" : "months"})`;
  const tabButton = (key, label) => <button type="button" aria-pressed={tab === key} onClick={() => setTab(key)} style={{ minWidth: 0, padding: "10px 5px", borderRadius: 10, border: tab === key ? "1px solid rgb(var(--c-accent))" : "1px solid rgb(var(--c-border))", background: tab === key ? "rgb(var(--c-accent))" : "rgb(var(--c-surface))", color: tab === key ? "rgb(var(--c-accent-ink))" : "rgb(var(--c-charcoal))", font: "inherit", fontSize: 12, fontWeight: 700, lineHeight: 1.3, overflowWrap: "anywhere", cursor: "pointer" }}>{label}</button>;
  const infoButton = (open, toggle, label) => <button type="button" aria-label={label} aria-expanded={open} onClick={toggle} style={{ width: 20, height: 20, flex: "0 0 20px", borderRadius: 999, border: "1px solid rgb(var(--c-border))", background: "rgb(var(--c-cream))", color: "rgb(var(--c-forest-800))", font: "inherit", fontSize: 12, fontWeight: 800, cursor: "pointer", padding: 0 }}>!</button>;
  const infoBoxStyle = { padding: "10px 12px", borderRadius: 10, background: "rgb(var(--c-cream))", border: "1px solid rgb(var(--c-border))", color: "rgb(var(--c-charcoal))", fontSize: 11, lineHeight: 1.5, overflowWrap: "anywhere" };
  const noteStyle = { padding: "10px 12px", borderRadius: 10, background: "rgb(var(--c-cream))", color: "rgb(var(--c-forest-800))", fontSize: 11, lineHeight: 1.5 };
  const summaryTitle = { margin: "0 0 8px", fontSize: 14, color: "rgb(var(--c-charcoal))" };
  const statusChip = (due) => <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 9px", borderRadius: 999, background: "rgb(var(--c-forest-50))", border: "1px solid rgb(var(--c-border))", color: "rgb(var(--c-forest-800))", fontSize: 11, fontWeight: 700 }}>{due ? (isId ? "Wajib zakat" : "Zakat due") : (isId ? "Belum wajib" : "Not yet due")}</span>;
  const saveValue = tab === "income" ? `${fmt(monthlyZakat)}/bln` : tab === "maal" ? fmt(maalZakat) : `${fmt(waqfInstallment)} /bln · ${waqfMonths} ${isId ? "bulan" : "months"}`;

  return <CalcLayout
    inputs={<>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
        {tabButton("income", isId ? "Zakat Penghasilan" : "Income Zakat")}
        {tabButton("maal", isId ? "Zakat Maal" : "Wealth Zakat (Zakat Maal)")}
        {tabButton("waqf", isId ? "Wakaf" : "Waqf")}
      </div>
      {tab === "income" && <>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--c-forest-800))" }}>{isId ? "Penghasilan / bulan" : "Income / month"}</span>
            {infoButton(showIncomeInfo, () => setShowIncomeInfo(!showIncomeInfo), isId ? "Penjelasan bruto dan netto" : "Gross and net explanation")}
          </div>
          {showIncomeInfo && <div style={{ ...infoBoxStyle, marginBottom: 9 }}>{isId ? "Ulama berbeda pendapat. Bruto: dihitung dari seluruh penghasilan kotor sebelum dikurangi apa pun. Netto: dihitung dari penghasilan setelah dikurangi kebutuhan pokok. Isi sesuai pendapat yang kamu ikuti." : "Scholars differ in opinion. Gross: calculated from all income before any deductions. Net: calculated after deducting basic needs. Choose according to the opinion you follow."}</div>}
          <NumberInput label="" prefix="Rp" value={income} onChange={setIncome} step={500000} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <button type="button" aria-pressed={basis === "gross"} onClick={() => setBasis("gross")} style={{ padding: 9, borderRadius: 10, border: basis === "gross" ? "1px solid rgb(var(--c-accent))" : "1px solid rgb(var(--c-border))", background: basis === "gross" ? "rgb(var(--c-accent))" : "rgb(var(--c-surface))", color: basis === "gross" ? "rgb(var(--c-accent-ink))" : "rgb(var(--c-charcoal))", font: "inherit", fontSize: 12, fontWeight: 700 }}>{isId ? "Bruto" : "Gross"}</button>
          <button type="button" aria-pressed={basis === "net"} onClick={() => setBasis("net")} style={{ padding: 9, borderRadius: 10, border: basis === "net" ? "1px solid rgb(var(--c-accent))" : "1px solid rgb(var(--c-border))", background: basis === "net" ? "rgb(var(--c-accent))" : "rgb(var(--c-surface))", color: basis === "net" ? "rgb(var(--c-accent-ink))" : "rgb(var(--c-charcoal))", font: "inherit", fontSize: 12, fontWeight: 700 }}>{isId ? "Netto" : "Net"}</button>
        </div>
        {basis === "net" && <NumberInput label={isId ? "Kebutuhan pokok / bulan" : "Basic needs / month"} prefix="Rp" value={basicNeeds} onChange={setBasicNeeds} step={500000} />}
        <NumberInput label={isId ? "Harga emas per gram" : "Gold price per gram"} prefix="Rp" value={goldPrice} onChange={setGoldPrice} step={50000} hint={isId ? "Contoh, isi harga emas terkini. Nisab = 85 gram emas." : "Example; enter the current gold price. Nisab = 85 grams of gold."} />
        <Slider label={isId ? "Tarif zakat" : "Zakat rate"} value={rate} onChange={setRate} min={0} max={10} step={0.5} format={pct} />
      </>}
      {tab === "maal" && <>
        <NumberInput label={isId ? "Tabungan & kas" : "Savings & cash"} prefix="Rp" value={savings} onChange={setSavings} step={1000000} />
        <NumberInput label={isId ? "Investasi (reksa dana, saham, sukuk)" : "Investments (mutual funds, stocks, sukuk)"} prefix="Rp" value={investments} onChange={setInvestments} step={1000000} />
        <NumberInput label={isId ? "Emas & perak" : "Gold & silver"} prefix="Rp" value={goldSilver} onChange={setGoldSilver} step={1000000} />
        <NumberInput label={isId ? "Piutang lancar" : "Current receivables"} prefix="Rp" value={receivables} onChange={setReceivables} step={1000000} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--c-forest-800))" }}>{isId ? "Utang jatuh tempo" : "Debts due"}</span>
            {infoButton(showDebtInfo, () => setShowDebtInfo(!showDebtInfo), isId ? "Penjelasan utang jatuh tempo" : "Explanation of debts due")}
          </div>
          {showDebtInfo && <div style={{ ...infoBoxStyle, marginBottom: 9 }}>{isId ? "Utang yang harus dibayar dalam waktu dekat. Sebagian ulama membolehkannya dikurangkan dari total harta sebelum dihitung zakat." : "Debts payable in the near future. Some scholars allow these to be deducted from total assets before calculating zakat."}</div>}
          <NumberInput label="" prefix="Rp" value={debts} onChange={setDebts} step={1000000} />
        </div>
        <NumberInput label={isId ? "Harga emas per gram" : "Gold price per gram"} prefix="Rp" value={goldPrice} onChange={setGoldPrice} step={50000} hint={isId ? "Nisab = 85 gram emas." : "Nisab = 85 grams of gold."} />
      </>}
      {tab === "waqf" && <>
        <NumberInput label={isId ? "Target wakaf uang" : "Cash waqf target"} prefix="Rp" value={waqfTarget} onChange={setWaqfTarget} step={1000000} />
        <NumberInput label={isId ? "Rencana cicilan wakaf / bulan" : "Planned waqf installment / month"} prefix="Rp" value={waqfInstallment} onChange={setWaqfInstallment} step={50000} />
      </>}
    </>}
    results={<div style={{ display: "grid", gap: 10, minWidth: 0 }}>
      {tab === "income" && <>
        <ResultTile label={isId ? "Zakat penghasilan / bulan" : "Income zakat / month"} value={fmt(monthlyZakat)} sub={incomeBasis >= monthlyNisab ? (isId ? `Penghasilan di atas nisab bulanan ${fmt(monthlyNisab)}` : `Income is above the monthly nisab of ${fmt(monthlyNisab)}`) : (isId ? `Belum mencapai nisab bulanan ${fmt(monthlyNisab)}, belum wajib zakat penghasilan` : `Below the monthly nisab of ${fmt(monthlyNisab)}; income zakat is not yet due`)} />
        <Card style={{ padding: 14 }}>
          <h4 style={summaryTitle}>{isId ? "Ringkasan zakat" : "Zakat summary"}</h4>
          <BreakdownRow label={isId ? "Dasar perhitungan" : "Calculation basis"} value={`${basis === "gross" ? (isId ? "Bruto" : "Gross") : (isId ? "Netto" : "Net")} · ${fmt(incomeBasis)}`} />
          <BreakdownRow label={isId ? "Nisab / bulan" : "Nisab / month"} value={fmt(monthlyNisab)} />
          <BreakdownRow label={isId ? "Zakat / bulan" : "Zakat / month"} value={fmt(monthlyZakat)} highlight />
          <BreakdownRow label={isId ? "Zakat / tahun" : "Zakat / year"} value={fmt(annualZakat)} />
        </Card>
        <div style={noteStyle}>{isId ? "Simulasi edukatif. Konfirmasi nisab dan haul ke lembaga zakat resmi." : "Educational estimate. Confirm the nisab and haul with an official zakat institution."}</div>
      </>}
      {tab === "maal" && <>
        <ResultTile label={isId ? "Zakat maal" : "Wealth zakat (Zakat Maal)"} value={fmt(maalZakat)} sub={netWealth >= maalNisab ? (isId ? "2,5% dari harta bersih, sudah di atas nisab" : "2.5% of net wealth, above the nisab") : (isId ? "Harta bersih belum mencapai nisab, belum wajib zakat maal" : "Net wealth is below the nisab; wealth zakat is not yet due")} />
        <Card style={{ padding: 14 }}>
          <h4 style={summaryTitle}>{isId ? "Ringkasan zakat maal" : "Wealth zakat summary"}</h4>
          <BreakdownRow label={isId ? "Total harta" : "Total assets"} value={fmt(totalAssets)} />
          <BreakdownRow label={isId ? "− Utang jatuh tempo" : "− Debts due"} value={fmt(debts)} />
          <BreakdownRow label={isId ? "Harta bersih" : "Net wealth"} value={fmt(netWealth)} highlight />
          <BreakdownRow label={isId ? "Nisab (85 g emas)" : "Nisab (85 g gold)"} value={fmt(maalNisab)} />
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>{isId ? "Status" : "Status"}</span>
            {statusChip(netWealth >= maalNisab)}
            {infoButton(showDebtInfo, () => setShowDebtInfo(!showDebtInfo), isId ? "Penjelasan haul zakat maal" : "Explanation of wealth zakat haul")}
          </div>
          {showDebtInfo && <div style={{ ...infoBoxStyle, marginTop: 8 }}>{isId ? "Zakat maal wajib bila harta bersih mencapai nisab dan sudah dimiliki penuh selama satu tahun hijriah (haul)." : "Wealth zakat is due when net wealth reaches the nisab and has been owned for one full Hijri year (haul)."}</div>}
        </Card>
        <div style={noteStyle}>{isId ? "Simulasi edukatif. Konfirmasi nisab dan haul ke lembaga zakat resmi." : "Educational estimate. Confirm the nisab and haul with an official zakat institution."}</div>
      </>}
      {tab === "waqf" && <>
        <Card style={{ padding: 14 }}>
          <h4 style={summaryTitle}>{isId ? "Ringkasan wakaf" : "Waqf summary"}</h4>
          <BreakdownRow label={isId ? "Lama" : "Duration"} value={duration} />
          <BreakdownRow label={isId ? "Total wakaf" : "Total waqf"} value={waqfTarget > 0 && waqfInstallment > 0 ? fmt(waqfTarget) : "-"} highlight />
        </Card>
        <div style={noteStyle}>{isId ? "Wakaf bersifat sukarela, tidak termasuk kewajiban zakat." : "Waqf is voluntary and is not a zakat obligation."}</div>
      </>}
      <div style={{ padding: 12, borderRadius: 12, background: "rgb(var(--c-forest-50))", color: "rgb(var(--c-forest-800))", fontSize: 12, lineHeight: 1.55, overflowWrap: "anywhere" }}>
        {isId ? "Tahukah kamu? Wakaf bisa menjadi amal jariyah yang manfaatnya terus mengalir. Kamu bisa merencanakan wakaf melalui alokasi aset atau mengeksplorasi skema proteksi jiwa dengan manfaat santunan yang diniatkan untuk wakaf, sesuai ketentuan polis dan lembaga wakaf." : "Did you know? Waqf can be a continuing charity (sadaqah jariyah) whose benefits keep flowing. You can plan waqf through asset allocation or explore life-protection schemes whose benefit is intended for waqf, subject to the policy terms and the waqf institution."}
      </div>
      <a href="https://www.wealthplanner.id/konsultasiasuransi" target="_blank" rel="noopener" style={{ display: "block", width: "100%", boxSizing: "border-box", textAlign: "center", padding: "12px 14px", borderRadius: 10, background: "rgb(var(--c-accent))", color: "rgb(var(--c-accent-ink))", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>{isId ? "Konsultasikan Rencana" : "Consult Your Plan"}</a>
    </div>}
    onSave={() => onSaveResult({ id: "zakat", title: isId ? "Zakat dan Wakaf" : "Zakat and Waqf", value: saveValue, plan: null })}
    onNavigate={onNavigate}
    calcId="zakat"
    relatedId={null}
  />;
}


function CalcLayout({ inputs, results, onSave, onNavigate, calcId }) {
  const [saved, setSaved] = React.useState(false);
  const [language, setLanguage] = React.useState(getAppLanguage());

  React.useEffect(() => {
    const updateLanguage = () => {
      setLanguage(getAppLanguage());
    };

    window.addEventListener("wealthplanner:language-changed", updateLanguage);

    return () => {
      window.removeEventListener(
        "wealthplanner:language-changed",
        updateLanguage
      );
    };
  }, []);

  const isId = language === "id";

  const copy = isId
    ? {
        input: "Input",
        autoUpdate: "auto-update",
        results: "Hasil Perhitungan",
        save: "Simpan Hasil",
        saved: "Tersimpan",
        protect: "Lindungi rencana ini",
        disclaimer:
          "Simulasi bersifat edukatif. Hasil aktual dapat berbeda sesuai kondisi dan asumsi yang digunakan.",
      }
    : {
        input: "Input",
        autoUpdate: "auto-update",
        results: "Calculation Results",
        save: "Save Result",
        saved: "Saved",
        protect: "Protect this plan",
        disclaimer:
          "This is an educational simulation. Actual results may differ depending on your conditions and assumptions.",
      };

  const save = () => {
    if (!saved) {
      onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  const goProtection = () => {
    save();
    onNavigate({ name: "protection", calculatorId: calcId });
  };

  return (
    <div>
      <div
        className="wp-calc-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 10,
          alignItems: "start",
        }}
      >
        <Card style={{ position: "sticky", top: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18 }}>{copy.input}</h3>
            <Tag>{copy.autoUpdate}</Tag>
          </div>

          <div style={{ display: "grid", gap: 10 }}>{inputs}</div>
        </Card>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18 }}>{copy.results}</h3>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={save}
                icon={saved ? <Check size={14} /> : <Plus size={14} />}
              >
                {saved ? copy.saved : copy.save}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={goProtection}
                iconRight={<ArrowRight size={14} />}
              >
                {copy.protect}
              </Button>
            </div>
          </div>

          {results}

          <p
            style={{
              fontSize: 11,
              color: "rgb(var(--c-muted))",
              lineHeight: 1.5,
              marginTop: 12,
            }}
          >
            {copy.disclaimer}
          </p>
        </div>
      </div>

      <style>{`
        @media(min-width:1181px){
          .wp-calculator .wp-calc-grid{
            grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr)!important;
            gap:20px!important;
          }
        }

        @media(max-width:1180px){
          .wp-calculator .wp-calc-grid{
            grid-template-columns:minmax(0,1fr)!important;
            gap:16px!important;
          }

          .wp-calculator .wp-calc-grid>div:first-child{
            position:relative!important;
            top:0!important;
          }

          .wp-calculator .wp-calc-grid>div,
          .wp-calculator .wp-calc-grid .wp-calc-card{
            min-width:0;
            max-width:100%;
            box-sizing:border-box;
          }

          .wp-calculator .wp-calc-grid input,
          .wp-calculator .wp-calc-grid select,
          .wp-calculator .wp-calc-grid textarea{
            min-width:0;
            max-width:100%;
          }

          .wp-calculator .wp-calc-grid table{
            min-width:560px;
          }

          .wp-calculator .wp-calc-grid [style*="grid-template-columns"]{
            min-width:0;
          }
        }
      `}</style>
    </div>
  );
}


export function FinancialCalculator({ onOpen }: { onOpen: (id: string) => void }) {
  const [language, setLanguage] = React.useState(getAppLanguage());
  React.useEffect(() => {
    const update = () => setLanguage(getAppLanguage());
    window.addEventListener("wealthplanner:language-changed", update);
    return () => window.removeEventListener("wealthplanner:language-changed", update);
  }, []);

  const isId = language === "id";
  const copy = isId
    ? { label: "FINANCIAL CALCULATOR", title: "Kalkulator Finansial", subtitle: "Pilih simulasi yang kamu butuhkan. Hasilnya bisa disimpan jadi rencana." }
    : { label: "FINANCIAL CALCULATOR", title: "Financial Calculator", subtitle: "Pick the simulation you need. Results can be saved as a plan." };

  return (
    <div className="wp-calculator wp-calculator-hub" style={{ width: "100%", maxWidth: 560, margin: "0 auto", display: "grid", gap: 22, boxSizing: "border-box", paddingBottom: 16 }}>
      <style>{`
        .wp-calculator-hub button { font-family: inherit; -webkit-tap-highlight-color: transparent; }
        .wp-calculator-hub .hub-calculator-row:focus-visible { outline: 3px solid rgb(var(--c-accent-text)); outline-offset: -3px; position: relative; z-index: 1; }
        .wp-calculator-hub .hub-calculator-row:hover { background: rgb(var(--c-cream)) !important; }
        .wp-calculator-hub .hub-calculator-row:active { opacity: .82; }
        @media (prefers-reduced-motion: reduce) { .wp-calculator-hub .hub-calculator-row { transition: none !important; } }
      `}</style>
      <header>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgb(var(--c-muted))" }}>{copy.label}</div>
        <h1 style={{ fontSize: "clamp(25px, 5vw, 28px)", lineHeight: 1.15, fontWeight: 800, color: "rgb(var(--c-charcoal))", letterSpacing: "-.035em", margin: "6px 0 5px" }}>{copy.title}</h1>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: "rgb(var(--c-muted))", maxWidth: 460 }}>{copy.subtitle}</p>
      </header>
      {HUB_SECTIONS.map((section) => (
        <section key={section.key} style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".09em", color: "rgb(var(--c-muted))", margin: "0 0 9px" }}>{section.title[isId ? "id" : "en"]}</h2>
          <div style={{ background: "rgb(var(--c-surface))", border: "1px solid rgb(var(--c-border))", borderRadius: 20, padding: "4px 15px", overflow: "hidden", boxSizing: "border-box" }}>
            {section.items.map((item, index) => {
              const Icon = item.icon;
              const itemCopy = item.text[isId ? "id" : "en"];
              const isLast = index === section.items.length - 1;
              return (
                <button key={item.id} type="button" className="hub-calculator-row" onClick={() => onOpen(item.id)} aria-label={`${itemCopy.title}: ${itemCopy.desc}`} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minWidth: 0, minHeight: 64, padding: "9px 0", textAlign: "left", border: 0, borderBottom: isLast ? "none" : "1px solid rgb(var(--c-border))", borderRadius: 0, background: "transparent", color: "rgb(var(--c-charcoal))", cursor: "pointer", transition: "background .15s ease, opacity .15s ease" }}>
                  <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 40px", width: 40, height: 40, borderRadius: 12, background: "rgb(var(--c-forest-50))", color: "rgb(var(--c-accent-text))" }}><Icon size={21} strokeWidth={1.9} /></span>
                  <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: "1 1 auto", minWidth: 0, gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25, color: "rgb(var(--c-charcoal))", overflowWrap: "anywhere" }}>{itemCopy.title}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 400, lineHeight: 1.35, color: "rgb(var(--c-muted))", overflowWrap: "anywhere" }}>{itemCopy.desc}</span>
                  </span>
                  <ChevronRight aria-hidden="true" size={19} strokeWidth={1.8} style={{ flex: "0 0 19px", color: "rgb(var(--c-muted))" }} />
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function CalculatorDetail({ id, onBack, onSaveResult, onNavigate }) {
  const [language, setLanguage] = React.useState(getAppLanguage());
  React.useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const isId = language === "id";
  const meta=CALCULATOR_META.find(x=>x.id===id)||CALCULATOR_META[0];
  return <div className="wp-calculator" style={{display:"grid",gap:20}}><style>{`
      
      .wp-calculator .card{background:rgb(var(--c-surface));border:1px solid rgb(var(--c-border));border-radius:16px;padding:18px}
      .wp-calculator .card-tight{padding:12px 14px}
      .wp-calculator .row{display:flex;align-items:center}.wp-calculator .row-between{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:4px 12px}
      .wp-calculator .row-between > *{min-width:0}
      .wp-calculator .row-between > *:last-child{margin-left:auto;text-align:right;overflow-wrap:anywhere;word-break:break-word}
      .wp-calculator .stack{display:flex;flex-direction:column}.wp-calculator .muted{color:rgb(var(--c-muted))}.wp-calculator .ink-2{color:rgb(var(--c-forest-800))}.wp-calculator .mono{font-variant-numeric:tabular-nums}.wp-calculator .divider{height:1px;background:rgb(var(--c-border))}
      /* Any two-column inline grid (e.g. Komponen biaya rows) stacks to one
         column on narrow screens instead of clipping the value inside a
         too-narrow input. */
      @media (max-width: 420px) {
        .wp-calculator [style*="1.1fr"]{grid-template-columns:1fr !important}
      }
    `}</style>
    <button type="button" onClick={onBack} style={{width:"fit-content",border:0,background:"transparent",color:"rgb(var(--c-forest-800))",fontSize:13,cursor:"pointer",padding:0}}>{isId ? "← Semua kalkulator" : "← All calculators"}</button>
    <div><div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"rgb(var(--c-muted))"}}>FINANCIAL CALCULATOR</div><h1 style={{fontSize:28,lineHeight:1.15,color:"rgb(var(--c-charcoal))",margin:"7px 0 6px"}}>{!isId && meta.titleEn ? meta.titleEn : meta.title}</h1><p style={{margin:0,fontSize:13,color:"rgb(var(--c-forest-800))"}}>{!isId && meta.descEn ? meta.descEn : meta.desc}</p></div>
    <CalculatorBody id={id} onSaveResult={onSaveResult} onNavigate={onNavigate}/>
  </div>;
}
