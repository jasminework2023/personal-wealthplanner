/* Real calculator engine ported from wealthplanner.id public calculator. */
// @ts-nocheck
import React from "react";
import { ArrowRight, Check, Gift, Plus } from "lucide-react";
import { useFinanceData } from "../lib/useFinanceData";

export const CALCULATOR_META = [
  { id: "checkup", title: "Financial Check-Up", desc: "Cek kesehatan cashflow, utang, dana darurat, dan likuiditas." },
  { id: "rumah", title: "Simulasi KPR", desc: "Simulasikan KPR konvensional atau syariah dengan skenario cicilan." },
  { id: "edu", title: "Simulasi Dana Pendidikan", desc: "Hitung kebutuhan biaya pendidikan sampai anak lulus." },
  { id: "pension", title: "Dana Pensiun", desc: "Proyeksikan kebutuhan pensiun dan tabungan bulanan." },
  { id: "warisan", title: "Perencanaan Warisan", desc: "Simulasikan pembagian aset berdasarkan input ahli waris." },
  { id: "haji", title: "Haji & Umroh", desc: "Rencanakan target biaya dan budget pelunasan." },
  { id: "zakat", title: "Zakat", desc: "Simulasikan zakat maal dan zakat penghasilan." },
  { id: "invest", title: "Investasi", desc: "Hitung kebutuhan investasi rutin untuk mencapai target." },
  { id: "insurance", title: "Kebutuhan Asuransi", desc: "Estimasi kebutuhan uang pertanggungan berdasarkan income." },
];

const COLORS = ["#7C9CFF", "#C6F24E", "#FFB800", "#E5A4FF", "#5EE5B0", "#FF9A6B"];

function formatIDR(n) {
  return Number(n || 0).toLocaleString("id-ID");
}
function formatThousands(n) {
  return Number(n || 0).toLocaleString("id-ID");
}
function Button({ children, variant="primary", size, onClick, icon, iconRight, style }) {
  return <button type="button" onClick={onClick} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,borderRadius:10,border:variant==="outline"?"1px solid rgba(15,61,46,.18)":"1px solid transparent",padding:size==="sm"?"9px 13px":"11px 15px",fontSize:13,fontWeight:600,cursor:"pointer",background:variant==="primary"?"#0f5d46":variant==="secondary"?"white":"transparent",color:variant==="primary"?"white":"#173b32",...style}}>{icon}{children}{iconRight}</button>;
}
function Tag({ children, variant="default" }) { return <span style={{display:"inline-flex",alignItems:"center",borderRadius:999,padding:"5px 9px",fontSize:10,fontWeight:700,letterSpacing:".04em",background:variant==="accent"?"#eef8f3":"#f4f5f3",color:"#426156",border:variant==="outline"?"1px solid rgba(15,61,46,.12)":"1px solid transparent"}}>{children}</span>; }
function Section({ children, style }) { return <section style={style}><div style={{maxWidth:1200,margin:"0 auto"}}>{children}</div></section>; }
function NumberInput({ label, value, onChange, prefix, suffix, min=0, step=1, hint }) {
  const [raw,setRaw]=React.useState(null);
  const display=raw!==null?raw:formatThousands(value);
  return <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"#35554a",marginBottom:7}}>{label}</label><div style={{display:"flex",alignItems:"stretch"}}>{prefix&&<div style={{padding:"0 11px",display:"flex",alignItems:"center",background:"#f6f7f4",border:"1px solid rgba(20,50,40,.12)",borderRight:0,borderRadius:"10px 0 0 10px",color:"#71827b",fontSize:12}}>{prefix}</div>}<input inputMode="numeric" value={display} onChange={e=>{const d=e.target.value.replace(/[^0-9]/g,"");setRaw(d);if(d!=="")onChange(Number(d));}} onBlur={()=>{const n=raw===""||raw===null?min:Number(raw);onChange(Math.max(min,n));setRaw(null)}} style={{width:"100%",border:"1px solid rgba(20,50,40,.12)",borderRadius:prefix?(suffix?0:"0 10px 10px 0"):(suffix?"10px 0 0 10px":10),padding:"11px 12px",outline:"none",fontSize:13,boxSizing:"border-box"}}/>{suffix&&<div style={{padding:"0 11px",display:"flex",alignItems:"center",background:"#f6f7f4",border:"1px solid rgba(20,50,40,.12)",borderLeft:0,borderRadius:"0 10px 10px 0",color:"#71827b",fontSize:12}}>{suffix}</div>}</div>{hint&&<div style={{fontSize:11,color:"#71827b",marginTop:5}}>{hint}</div>}</div>;
}
function Slider({ label,value,onChange,min,max,step=1,format }) { return <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:12,fontWeight:600,color:"#35554a"}}>{label}</span><span style={{fontSize:12,fontWeight:700,color:"#173b32"}}>{format?format(value):value}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%"}}/></div>; }
function ResultTile({ label,value,sub }) { return <div style={{background:"#eef8f3",border:"1px solid #d7ebe1",borderRadius:16,padding:"22px 22px 24px"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:".08em",color:"#55766a"}}>{label}</div><div style={{fontSize:"clamp(30px,4vw,48px)",lineHeight:1.05,fontWeight:800,color:"#0f5d46",marginTop:9}}>{value}</div>{sub&&<div style={{fontSize:12,color:"#667a72",marginTop:9}}>{sub}</div>}</div>; }
function Card({children,style}) { return <div style={{background:"white",border:"1px solid rgba(20,50,40,.10)",borderRadius:16,padding:18,...style}}>{children}</div>; }

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
  const { totalIncome, totalExpense, totalSaving, assets, isRealData, month } = useFinanceData();
  const [manualDebt, setManualDebt] = React.useState(0);
  const income = isRealData ? totalIncome : 10000000;
  const expenses = isRealData ? totalExpense : 7500000;
  const savings = isRealData ? totalSaving : 20000000;
  const debt = manualDebt;
  const cash = assets.liquidAssets.reduce((s, x) => s + (Number(x.value)||0), 0);
  const investments = assets.investmentAssets.reduce((s, x) => s + (Number(x.value)||0), 0);
  const annualGrossIncome = income * 12;
  const securityRate = annualGrossIncome > 0 ? (cash + investments) / annualGrossIncome : 0;
  const savingRate = income > 0 ? ((income-expenses)/income)*100 : 0;
  const debtRatio = income > 0 ? (debt/income)*100 : 0;
  const emergencyMonths = expenses > 0 ? cash/expenses : 0;
  const liquidity = assets.totalAssets > 0 ? (cash/assets.totalAssets)*100 : 0;
  let score=0; if(savingRate>=20)score+=25;else if(savingRate>=10)score+=18;else if(savingRate>0)score+=10; if(debtRatio===0)score+=25;else if(debtRatio<10)score+=22;else if(debtRatio<30)score+=15;else score+=5; if(emergencyMonths>=6)score+=30;else if(emergencyMonths>=3)score+=22;else if(emergencyMonths>=1)score+=12; if(liquidity>=30)score+=20;else if(liquidity>=15)score+=14;else score+=7;
  const grade=score>=80?"A":score>=65?"B":score>=50?"C":"D";
  return <CalcLayout inputs={<>
    <div style={{padding:"11px 13px",background:"#f6fbf8",borderRadius:12,border:"1px solid #d7ebe1",fontSize:11,color:"#55766a"}}>Sumber data: {isRealData?`Dashboard Finance · ${month}`:"mode demo"}. Income, expense, saving, cash dan investment assets mengikuti data dashboard.</div>
    <NumberInput label="Cicilan utang bulanan" prefix="Rp" value={debt} onChange={setManualDebt} step={100000}/>
  </>} results={<>
    <div style={{background:"#eef8f3",border:"1px solid #d7ebe1",borderRadius:24,padding:28}}><div className="row-between"><div className="mono" style={{fontSize:11,fontWeight:700,letterSpacing:".12em",color:"#55766a"}}>SKOR KEUANGANMU</div><div style={{fontWeight:800,fontSize:56,color:"#0f5d46"}}>{grade}</div></div><div style={{fontWeight:800,fontSize:78,lineHeight:.9,marginTop:12,color:"#0f5d46"}}>{Math.round(score)}<span style={{fontSize:24,color:"#71827b"}}>/100</span></div></div>
    <div className="card" style={{marginTop:16}}><h4 style={{marginBottom:12}}>Financial Security Rate</h4><ResultTile label="FINANCIAL SECURITY RATE" value={`${securityRate.toFixed(2)}×`} sub="(Cash + Investment Assets) ÷ Annual Gross Income"/><p className="muted" style={{fontSize:11,lineHeight:1.5,marginTop:10}}>Rasio ini menunjukkan besarnya aset kas dan investasi dibandingkan penghasilan bruto tahunan. Bukan skor 0–100.</p></div>
    <div className="stack" style={{gap:8,marginTop:16}}><ScoreRow label="Saving rate" value={`${savingRate.toFixed(1)}%`} status={savingRate>=20?"good":savingRate>=10?"ok":"warn"} target=">20%"/><ScoreRow label="Debt ratio" value={`${debtRatio.toFixed(1)}%`} status={debtRatio<10?"good":debtRatio<30?"ok":"warn"} target="<10%"/><ScoreRow label="Dana darurat" value={`${emergencyMonths.toFixed(1)} bln`} status={emergencyMonths>=6?"good":emergencyMonths>=3?"ok":"warn"} target=">6 bln"/><ScoreRow label="Liquidity" value={`${liquidity.toFixed(1)}%`} status={liquidity>=30?"good":liquidity>=15?"ok":"warn"} target=">30%"/></div>
  </>} onSave={()=>onSaveResult({id:"checkup",title:"Financial Check-Up",value:`Score ${Math.round(score)}/100 · FSR ${securityRate.toFixed(2)}×`,plan:{type:"cashflow",targetAmount:0,monthlyAmount:income,preparedAssets:cash+investments,timeframe:1}})} onNavigate={onNavigate} calcId="checkup" relatedId="checkup"/>;
}

// ============================================================
// 2. SIMULASI RUMAH (KPR vs Sewa Comparison)
// ============================================================
function RumahCalc({ onSaveResult, onNavigate }) {
  const [kprMode,setKprMode]=React.useState("new");
  const [homePrice,setHomePrice]=React.useState(1000000000); const [downPayment,setDownPayment]=React.useState(200000000); const [loanAmount,setLoanAmount]=React.useState(800000000);
  const [outstanding,setOutstanding]=React.useState(650000000); const [remainingYears,setRemainingYears]=React.useState(15); const [currentRate,setCurrentRate]=React.useState(7); const [currentInstallment,setCurrentInstallment]=React.useState(0);
  const [financingType,setFinancingType]=React.useState("conventional"); const [fixedRate,setFixedRate]=React.useState(5.5); const [fixedYears,setFixedYears]=React.useState(5); const [floatingRate,setFloatingRate]=React.useState(9); const [tenor,setTenor]=React.useState(20); const [syariahMargin,setSyariahMargin]=React.useState(5); const [rentalPrice,setRentalPrice]=React.useState(5000000);
  React.useEffect(()=>{if(kprMode==="new")setLoanAmount(Math.max(0,Number(homePrice||0)-Number(downPayment||0)));},[homePrice,downPayment,kprMode]);
  const safeLoan=kprMode==="existing"?Math.max(0,Number(outstanding||0)):Math.max(0,Math.min(Number(loanAmount||0),Number(homePrice||0)));
  const effectiveTenor=kprMode==="existing"?Math.max(1,Number(remainingYears||1)):Math.max(1,Number(tenor||1)); const months=effectiveTenor*12;
  const monthlyPaymentFor=(principal,rate,n)=>{if(principal<=0||n<=0)return 0;const r=rate/100/12;return r===0?principal/n:principal*(r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1)};
  const balanceAfterPayments=(principal,rate,payment,n)=>{if(principal<=0||n<=0)return principal;const r=rate/100/12;if(r===0)return Math.max(0,principal-payment*n);return Math.max(0,principal*Math.pow(1+r,n)-payment*((Math.pow(1+r,n)-1)/r));};
  let monthlyPayment=0,totalPaid=0,totalInterest=0,schedule=[];
  if(kprMode==="existing") { monthlyPayment=currentInstallment>0?currentInstallment:monthlyPaymentFor(safeLoan,currentRate,months); let balance=safeLoan; for(let m=1;m<=months;m++){const mr=currentRate/100/12;const interest=mr>0?balance*mr:0;let principal=Math.max(0,monthlyPayment-interest);if(m===months||principal>balance)principal=balance;const actual=principal+interest;balance=Math.max(0,balance-principal);totalPaid+=actual;totalInterest+=interest;if(m===1||m===12||m===60||m===120||m===months)schedule.push({month:m,label:m%12===0?`Tahun ${m/12}`:`Bulan ${m}`,rate:currentRate,payment:actual,principal,interest,balance});} }
  else if(financingType==="conventional") {const fixedMonths=Math.min(months,Math.max(0,Number(fixedYears||0)*12));const initialRate=fixedMonths>0?fixedRate:floatingRate;const initialPayment=monthlyPaymentFor(safeLoan,initialRate,months);let balance=safeLoan,currentPayment=initialPayment;for(let m=1;m<=months;m++){const fixed=fixedMonths>0&&m<=fixedMonths;const rate=fixed?fixedRate:floatingRate;if(!fixed&&m===fixedMonths+1)currentPayment=monthlyPaymentFor(balance,floatingRate,months-m+1);const mr=rate/100/12;const interest=mr>0?balance*mr:0;let principal=currentPayment-interest;if(m===months||principal>balance)principal=balance;const actual=principal+interest;balance=Math.max(0,balance-principal);totalPaid+=actual;totalInterest+=interest;if(m===1||m===12||m===fixedMonths||m===fixedMonths+1||m===months)schedule.push({month:m,label:m%12===0?`Tahun ${m/12}`:`Bulan ${m}`,rate,payment:actual,principal,interest,balance});}monthlyPayment=initialPayment;}
  else {const margin=safeLoan*(syariahMargin/100)*effectiveTenor;const selling=safeLoan+margin;monthlyPayment=selling/months;totalPaid=selling;totalInterest=margin;schedule=[1,12,60,120,months].filter((m,i,a)=>m>0&&m<=months&&a.indexOf(m)===i).map(m=>({month:m,label:m%12===0?`Tahun ${m/12}`:`Bulan ${m}`,rate:syariahMargin,payment:monthlyPayment,principal:safeLoan/months,interest:margin/months,balance:Math.max(0,selling-monthlyPayment*m)}));}
  const fixedPayment=kprMode==="existing"?monthlyPayment:financingType==="conventional"?monthlyPaymentFor(safeLoan,(fixedYears>0?fixedRate:floatingRate),months):monthlyPayment;
  const fixedMonths=Math.min(months,Math.max(0,Number(fixedYears||0)*12));const remainingAfterFixed=Math.max(0,months-fixedMonths);const balanceAfterFixed=financingType==="conventional"&&fixedMonths>0?balanceAfterPayments(safeLoan,fixedRate,fixedPayment,fixedMonths):safeLoan;const floatingPayment=financingType==="conventional"&&remainingAfterFixed>0?monthlyPaymentFor(balanceAfterFixed,floatingRate,remainingAfterFixed):fixedPayment;
  const comparisonData=[];let cumulativeKPR=kprMode==="new"?Math.max(0,downPayment):0,cumulativeRental=0;for(let m=1;m<=months;m++){cumulativeKPR+=monthlyPayment;cumulativeRental+=rentalPrice;if(m===1||m===12||m===60||m===120||m===180||m===months)comparisonData.push({month:m,monthLabel:m%12===0?`Tahun ${m/12}`:`Bulan ${m}`,kprCumulative:cumulativeKPR,rentalCumulative:cumulativeRental});}
  const newInputs = <>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
      <button type="button" onClick={()=>setFinancingType("conventional")} style={{padding:"11px 10px",borderRadius:10,border:financingType==="conventional"?"2px solid #0f5d46":"1px solid rgba(20,50,40,.12)",background:financingType==="conventional"?"#eef8f3":"white",fontSize:12,fontWeight:700}}>KPR Konvensional</button>
      <button type="button" onClick={()=>setFinancingType("syariah")} style={{padding:"11px 10px",borderRadius:10,border:financingType==="syariah"?"2px solid #0f5d46":"1px solid rgba(20,50,40,.12)",background:financingType==="syariah"?"#eef8f3":"white",fontSize:12,fontWeight:700}}>KPR Syariah</button>
    </div>
    <NumberInput label="Harga rumah / nilai properti" prefix="Rp" value={homePrice} onChange={setHomePrice} step={10000000}/>
    <NumberInput label="Down payment" prefix="Rp" value={downPayment} onChange={setDownPayment} step={10000000}/>
    <NumberInput label="Total pinjaman / pembiayaan" prefix="Rp" value={loanAmount} onChange={setLoanAmount} step={10000000}/>
    <Slider label="Tenor" value={tenor} onChange={setTenor} min={1} max={30} format={v=>`${v} tahun`}/>
    {financingType==="conventional" ? <>
      <Slider label="Fixed interest" value={fixedRate} onChange={setFixedRate} min={0} max={15} step={.25} format={v=>`${v}%/tahun`}/>
      <Slider label="Periode fixed" value={fixedYears} onChange={setFixedYears} min={0} max={Math.max(1,tenor)} format={v=>v===0?"Tidak ada fixed":`${v} tahun`}/>
      <Slider label="Floating interest setelah fixed" value={floatingRate} onChange={setFloatingRate} min={0} max={20} step={.25} format={v=>`${v}%/tahun`}/>
    </> : <Slider label="Estimasi margin murabahah" value={syariahMargin} onChange={setSyariahMargin} min={0} max={15} step={.25} format={v=>`${v}%/tahun (ilustrasi)`}/>}
  </>;
  const existingInputs = <>
    <NumberInput label="Sisa pokok pinjaman / pembiayaan" prefix="Rp" value={outstanding} onChange={setOutstanding} step={10000000}/>
    <Slider label="Sisa tenor" value={remainingYears} onChange={setRemainingYears} min={1} max={30} format={v=>`${v} tahun`}/>
    <Slider label="Suku bunga saat ini" value={currentRate} onChange={setCurrentRate} min={0} max={20} step={.25} format={v=>`${v}%/tahun`}/>
    <NumberInput label="Cicilan existing / bulan (opsional)" prefix="Rp" value={currentInstallment} onChange={setCurrentInstallment} step={100000}/>
  </>;
  return <CalcLayout inputs={< >
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
      <button type="button" onClick={()=>setKprMode("new")} style={{padding:"11px 10px",borderRadius:10,border:kprMode==="new"?"2px solid #0f5d46":"1px solid rgba(20,50,40,.12)",background:kprMode==="new"?"#eef8f3":"white",fontSize:12,fontWeight:700}}>KPR Baru</button>
      <button type="button" onClick={()=>setKprMode("existing")} style={{padding:"11px 10px",borderRadius:10,border:kprMode==="existing"?"2px solid #0f5d46":"1px solid rgba(20,50,40,.12)",background:kprMode==="existing"?"#eef8f3":"white",fontSize:12,fontWeight:700}}>KPR Berjalan</button>
    </div>
    {kprMode==="new" ? newInputs : existingInputs}
    <div className="divider" style={{margin:"4px 0"}}/><NumberInput label="Sewa rumah per bulan (opsional comparison)" prefix="Rp" value={rentalPrice} onChange={setRentalPrice} step={500000}/>
  </>} results={<>
    <div className="row" style={{gap:12,marginBottom:12,flexWrap:"wrap"}}><ResultTile label="TOTAL PEMBIAYAAN / PINJAMAN" value={`Rp ${formatIDR(Math.round(safeLoan))}`} sub={kprMode==="existing"?"Sisa pokok pembiayaan saat ini":"Pokok pinjaman setelah DP"}/><ResultTile label={kprMode==="existing"?"CICILAN EXISTING / BULAN":financingType==="conventional"?"CICILAN AWAL / BULAN":"ANGSURAN / BULAN"} value={`Rp ${formatIDR(Math.round(monthlyPayment))}`} sub={`${effectiveTenor} tahun`}/></div>
    <div className="card" style={{marginTop:16}}><h4 style={{marginBottom:14}}>Ringkasan Pembiayaan</h4><div className="stack" style={{gap:4}}>{kprMode==="new"&&<><BreakdownRow label="Harga properti" value={`Rp ${formatIDR(homePrice)}`}/><BreakdownRow label="Down payment" value={`Rp ${formatIDR(downPayment)}`}/></>}<BreakdownRow label="Total pembiayaan / pinjaman" value={`Rp ${formatIDR(Math.round(safeLoan))}`} highlight/><BreakdownRow label={kprMode==="existing"?"Sisa tenor":"Tenor"} value={`${effectiveTenor} tahun`}/><BreakdownRow label={kprMode==="existing"?"Total pembayaran dari sekarang":"Total pembayaran pembiayaan"} value={`Rp ${formatIDR(Math.round(totalPaid))}`} highlight/><BreakdownRow label={financingType==="conventional"?"Total bunga":"Total margin ilustratif"} value={`Rp ${formatIDR(Math.round(totalInterest))}`}/>{financingType==="conventional"&&kprMode==="new"&&fixedYears>0&&fixedYears<tenor&&<BreakdownRow label="Estimasi cicilan setelah fixed" value={`Rp ${formatIDR(Math.round(floatingPayment))}/bln`} sub={`Skenario floating ${floatingRate}%/tahun`}/>}</div></div>
    {financingType==="conventional"&&<div className="card" style={{marginTop:16}}><h4 style={{marginBottom:8}}>{kprMode==="existing"?"Proyeksi KPR Berjalan":"Fixed → Floating"}</h4><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr><th style={{textAlign:"left",padding:8}}>Periode</th><th style={{textAlign:"right",padding:8}}>Rate</th><th style={{textAlign:"right",padding:8}}>Cicilan</th><th style={{textAlign:"right",padding:8}}>Bunga</th><th style={{textAlign:"right",padding:8}}>Pokok</th></tr></thead><tbody>{schedule.map((r,i)=><tr key={`${r.month}-${i}`}><td style={{padding:8}}>{r.label}</td><td style={{textAlign:"right",padding:8}}>{r.rate}%</td><td style={{textAlign:"right",padding:8}}>Rp {formatIDR(Math.round(r.payment))}</td><td style={{textAlign:"right",padding:8}}>Rp {formatIDR(Math.round(r.interest))}</td><td style={{textAlign:"right",padding:8}}>Rp {formatIDR(Math.round(r.principal))}</td></tr>)}</tbody></table></div></div>}
    {kprMode==="new"&&financingType==="syariah"&&<div className="card" style={{marginTop:16,background:"#f6fbf8"}}><h4 style={{marginBottom:8}}>Bagaimana KPR Syariah bekerja?</h4><p style={{fontSize:12,lineHeight:1.6,color:"#55766a",margin:0}}>Pada skenario murabahah, margin disepakati di awal dan pembayaran mengikuti struktur akad produk. Angka di sini adalah ilustrasi edukatif, bukan penawaran lembaga tertentu.</p></div>}
    <div className="card" style={{marginTop:16}}><h4 style={{marginBottom:12}}>KPR vs Sewa</h4><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr><th style={{textAlign:"left",padding:8}}>Timeline</th><th style={{textAlign:"right",padding:8}}>KPR</th><th style={{textAlign:"right",padding:8}}>Sewa</th></tr></thead><tbody>{comparisonData.map((r,i)=><tr key={`${r.month}-${i}`}><td style={{padding:8}}>{r.monthLabel}</td><td style={{textAlign:"right",padding:8}}>Rp {formatIDR(Math.round(r.kprCumulative))}</td><td style={{textAlign:"right",padding:8}}>Rp {formatIDR(Math.round(r.rentalCumulative))}</td></tr>)}</tbody></table></div></div>
    <div style={{marginTop:16,padding:"12px 16px",background:"#f8f8f5",borderRadius:14,fontSize:11,color:"#71827b",lineHeight:1.55}}>Disclaimer: hasil adalah simulasi/estimasi edukatif, bukan penawaran pembiayaan. Biaya provisi, administrasi, asuransi, pajak, notaris, dan biaya lain belum diperhitungkan.</div>
  </>} onSave={()=>onSaveResult({id:"rumah",title:"Simulasi KPR",value:`Rp ${formatIDR(Math.round(safeLoan))} · Rp ${formatIDR(Math.round(monthlyPayment))}/bln`,plan:{type:"home",targetAmount:kprMode==="existing"?safeLoan:homePrice,obligationAmount:safeLoan,monthlyAmount:monthlyPayment,timeframe:effectiveTenor,preparedAssets:kprMode==="new"?downPayment:0,financingType,kprMode}})} onNavigate={onNavigate} calcId="rumah" relatedId="kpr"/>;
}

// ============================================================
// 3. INVESTMENT PLANNER
// ============================================================
function InvestCalc({ onSaveResult, onNavigate }) {
  const [target, setTarget] = React.useState(500000000);
  const [years, setYears] = React.useState(10);
  const [returnPct, setReturnPct] = React.useState(9);
  const [starting, setStarting] = React.useState(10000000);

  const months = years * 12;
  const monthlyReturn = Math.pow(1 + returnPct / 100, 1 / 12) - 1;
  const monthlyPayment = (target - starting * Math.pow(1 + monthlyReturn, months)) / (Math.pow(1 + monthlyReturn, months) - 1) / (1 + monthlyReturn);
  const totalContributed = starting + monthlyPayment * months;
  const totalReturn = target - totalContributed;
  const finalValue = starting * Math.pow(1 + monthlyReturn, months) + monthlyPayment * (Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn;

  return (
    <CalcLayout
      inputs={
        <>
          <NumberInput label="Target investasi" prefix="Rp" value={target} onChange={setTarget} step={25000000} />
          <Slider label="Timeframe" value={years} onChange={setYears} min={1} max={30} format={(v) => `${v} tahun`} />
          <Slider label="Return ekspektasi" value={returnPct} onChange={setReturnPct} min={2} max={15} step={0.5} format={(v) => `${v}%/tahun`} />
          <NumberInput label="Dana investasi awal" prefix="Rp" value={starting} onChange={setStarting} step={5000000} />
        </>
      }
      results={
        <>
          <ResultTile
            label="KONTRIBUSI BULANAN"
            value={formatIDR(Math.max(0, Math.round(monthlyPayment)))}
            sub={`Investasi rutin untuk capai target ${formatIDR(target)} dalam ${years} tahun`}
          />
          <div className="card" style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 16 }}>Proyeksi Pertumbuhan</h4>
            <div className="stack" style={{ gap: 12 }}>
              <BreakdownRow label="Dana awal" value={formatIDR(Math.round(starting))} />
              <BreakdownRow label="Kontribusi total" value={formatIDR(Math.round(monthlyPayment * months))} sub={`${months} bulan × ${formatIDR(Math.round(monthlyPayment))}`} />
              <BreakdownRow label="Return dari investasi" value={formatIDR(Math.round(totalReturn))} sub={`Compound return ${returnPct}%/tahun`} highlight />
              <div className="divider" style={{ margin: "8px 0" }} />
              <BreakdownRow label="Total akhir" value={formatIDR(Math.round(finalValue))} highlight />
            </div>
          </div>
        </>
      }
      onSave={() => onSaveResult({ id: "invest", title: "Investasi", value: `${formatIDR(Math.round(monthlyPayment))}/bln`, plan: { type: "investment", targetAmount: target, monthlyAmount: monthlyPayment, timeframe: years, preparedAssets: starting } })}
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
    <div className="row-between" style={{ padding: "10px 0", color: muted ? "var(--muted)" : "var(--ink)" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: highlight ? 700 : 500 }}>{label}</div>
        {sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}
      </div>
      <div className="mono" style={{ fontSize: highlight ? 18 : 15, fontWeight: highlight ? 700 : 500, color: highlight ? "var(--accent)" : "inherit" }}>{value}</div>
    </div>
  );
}

// ============================================================
// 5. EDUCATION FUND CALCULATOR
// ============================================================
function EduCalc({ onSaveResult, onNavigate }) {
  const currentYear = new Date().getFullYear();
  const levelDurations = { SD: 6, SMP: 3, SMA: 3, "Kuliah": 4 };
  const levelOrder = ["SD", "SMP", "SMA", "Kuliah"];
  const [currentCost, setCurrentCost] = React.useState(50000000);
  const [educationLevel, setEducationLevel] = React.useState("SD");
  const [inflation, setInflation] = React.useState(6);
  const [startYear, setStartYear] = React.useState(currentYear + 1);
  const [duration, setDuration] = React.useState(levelDurations.SD);
  const [educationPlans, setEducationPlans] = React.useState([]);

  const yearsUntilStart = Math.max(0, Number(startYear) - currentYear);
  const startCost = currentCost * Math.pow(1 + inflation / 100, yearsUntilStart);
  const yearlyCosts = Array.from({ length: Math.max(1, duration) }, (_, index) => {
    const cost = startCost * Math.pow(1 + inflation / 100, index);
    return { year: Number(startYear) + index, cost };
  });
  const currentSimulationTotal = yearlyCosts.reduce((sum, item) => sum + item.cost, 0);
  const averageMonthlyPreparation = currentSimulationTotal / Math.max(1, yearsUntilStart * 12);
  const totalEducationNeed = educationPlans.reduce((sum, item) => sum + item.total, 0) + currentSimulationTotal;
  const savedEducationNeed = educationPlans.reduce((sum, item) => sum + item.total, 0);

  const applyLevel = (level) => {
    setEducationLevel(level);
    setDuration(levelDurations[level] || 4);
  };

  const addEducationPlan = () => {
    const plan = {
      id: `${educationLevel}-${Date.now()}`,
      level: educationLevel,
      startYear: Number(startYear),
      duration: Number(duration),
      currentCost: Number(currentCost),
      inflation: Number(inflation),
      startCost,
      total: currentSimulationTotal,
      yearlyCosts,
    };
    setEducationPlans((prev) => [...prev, plan]);

    const nextIndex = levelOrder.indexOf(educationLevel) + 1;
    const nextLevel = levelOrder[nextIndex];
    if (nextLevel) {
      setEducationLevel(nextLevel);
      setDuration(levelDurations[nextLevel]);
      setStartYear(Number(startYear) + Number(duration));
    } else {
      setStartYear(Number(startYear) + Number(duration));
    }
  };

  const removeEducationPlan = (id) => {
    setEducationPlans((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <CalcLayout
      inputs={
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#173b32" }}>Tambah jenjang pendidikan</div>
              <div style={{ fontSize: 11, color: "#71827b", marginTop: 3 }}>Hitung SD, lalu tambahkan SMP, SMA, dan Kuliah sesuai kebutuhan.</div>
            </div>
            {educationPlans.length > 0 && <Tag variant="accent">{educationPlans.length} jenjang ditambahkan</Tag>}
          </div>

          <NumberInput label="Perkiraan biaya saat ini (per tahun)" prefix="Rp" value={currentCost} onChange={setCurrentCost} step={1000000} hint="Estimasi biaya pendidikan untuk 1 tahun pada saat ini." />
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#35554a", marginBottom: 7 }}>Jenjang pendidikan</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
              {levelOrder.map((level) => <button key={level} type="button" onClick={() => applyLevel(level)} style={{ padding: "9px 6px", borderRadius: 9, border: educationLevel === level ? "2px solid #0f5d46" : "1px solid rgba(20,50,40,.12)", background: educationLevel === level ? "#eef8f3" : "white", color: "#173b32", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{level}</button>)}
            </div>
          </div>
          <NumberInput label="Tahun berangkat / mulai pendidikan" value={startYear} onChange={setStartYear} min={currentYear} step={1} hint={`Sekitar ${yearsUntilStart} tahun lagi.`} />
          <Slider label="Inflasi / kenaikan biaya pendidikan" value={inflation} onChange={setInflation} min={0} max={15} step={0.5} format={(v) => `${v}%/tahun`} />
          <Slider label="Durasi biaya pendidikan" value={duration} onChange={setDuration} min={1} max={12} format={(v) => `${v} tahun`} />

          <div className="card" style={{ background: "#f8faf7", padding: 14 }}>
            <div style={{ fontSize: 11, color: "#71827b", marginBottom: 5 }}>Simulasi saat ini</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#173b32" }}>{educationLevel} · {startYear}–{Number(startYear) + Number(duration) - 1}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f5d46", marginTop: 4 }}>Rp {formatIDR(Math.round(currentSimulationTotal))}</div>
          </div>

          <Button onClick={addEducationPlan} icon={<Plus size={15} />} iconRight={<ArrowRight size={14} />}>
            Tambahkan {educationLevel}
          </Button>
        </>
      }
      results={
        <>
          <ResultTile
            label="TOTAL KEBUTUHAN PENDIDIKAN"
            value={`Rp ${formatIDR(Math.round(totalEducationNeed))}`}
            sub={educationPlans.length > 0 ? `${educationPlans.length} jenjang tersimpan + simulasi ${educationLevel} saat ini` : `Simulasi ${educationLevel} saat ini`}
          />

          {educationPlans.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10 }}>
                <h4 style={{ margin: 0 }}>Rencana pendidikan</h4>
                <span style={{ fontSize: 11, color: "#71827b" }}>Total tersimpan: Rp {formatIDR(Math.round(savedEducationNeed))}</span>
              </div>
              <div className="stack" style={{ gap: 9 }}>
                {educationPlans.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 12px", border: "1px solid rgba(20,50,40,.10)", borderRadius: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{item.level}</div>
                      <div style={{ fontSize: 10, color: "#71827b", marginTop: 2 }}>{item.startYear}–{item.startYear + item.duration - 1} · {item.duration} tahun · inflasi {item.inflation}%</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <strong style={{ fontSize: 12, color: "#0f5d46", whiteSpace: "nowrap" }}>Rp {formatIDR(Math.round(item.total))}</strong>
                      <button type="button" onClick={() => removeEducationPlan(item.id)} style={{ border: 0, background: "transparent", color: "#8b5c5c", cursor: "pointer", fontSize: 11 }}>Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 12 }}>{educationLevel} · Detail simulasi saat ini</h4>
            <BreakdownRow label="Biaya saat ini" value={`Rp ${formatIDR(Math.round(currentCost))}/tahun`} />
            <BreakdownRow label="Biaya saat mulai" value={`Rp ${formatIDR(Math.round(startCost))}/tahun`} />
            <BreakdownRow label="Mulai pendidikan" value={`${startYear}`} />
            <BreakdownRow label="Durasi pendidikan" value={`${duration} tahun`} />
            <div className="divider" style={{ margin: "8px 0" }} />
            <BreakdownRow label={`Total kebutuhan ${educationLevel}`} value={`Rp ${formatIDR(Math.round(currentSimulationTotal))}`} highlight />
            <BreakdownRow label="Rata-rata dana yang perlu disiapkan" value={`Rp ${formatIDR(Math.round(averageMonthlyPreparation))}/bln`} sub="Perhitungan sederhana tanpa asumsi return investasi." />
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h4 style={{ marginBottom: 10 }}>Proyeksi biaya per tahun · {educationLevel}</h4>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}><thead><tr style={{ borderBottom: "1px solid var(--border)" }}><th style={{ textAlign: "left", padding: "8px 0" }}>Tahun</th><th style={{ textAlign: "right", padding: "8px 0" }}>Estimasi biaya</th></tr></thead><tbody>{yearlyCosts.map((item) => <tr key={item.year} style={{ borderBottom: "1px solid var(--border)" }}><td style={{ padding: "8px 0" }}>{item.year}</td><td style={{ textAlign: "right", padding: "8px 0" }}>Rp {formatIDR(Math.round(item.cost))}</td></tr>)}</tbody></table></div>
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: "#f8f8f5", borderRadius: 14, fontSize: 11, color: "#71827b", lineHeight: 1.55 }}>Catatan: setiap jenjang yang ditambahkan akan masuk ke total kebutuhan pendidikan. Kamu bisa menghitung SD → Tambahkan SD → lanjut SMP → Tambahkan SMP, dan seterusnya.</div>
        </>
      }
      onSave={() => onSaveResult({ id: "edu", title: "Simulasi Dana Pendidikan", value: formatIDR(Math.round(totalEducationNeed)), plan: { type: "education", targetAmount: totalEducationNeed, monthlyAmount: averageMonthlyPreparation, timeframe: yearsUntilStart, targetYear: startYear, stages: educationPlans } })}
      onNavigate={onNavigate}
      calcId="edu"
      relatedId="edu"
    />
  );
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
  const [daftarHaji, setDaftarHaji] = React.useState(40000000);
  const [targetBerangkat, setTargetBerangkat] = React.useState(2028);
  const [dpSetoran, setDpSetoran] = React.useState(10000000);
  const [inflasi, setInflasi] = React.useState(5);
  const [returnInvestasi, setReturnInvestasi] = React.useState(0);

  const tahunSaatIni = new Date().getFullYear();
  const tahunMenuju = targetBerangkat - tahunSaatIni;
  
  const totalBiayaMendasar = daftarHaji;
  const totalBiayaDenganInflasi = totalBiayaMendasar * Math.pow(1 + inflasi / 100, tahunMenuju);
  const sisaDanaDibutuhkan = Math.max(totalBiayaDenganInflasi - dpSetoran, 0);
  const totalBulan = tahunMenuju > 0 ? tahunMenuju * 12 : 0;
  const returnBulanan = returnInvestasi / 100 / 12;
  // Kalau ada estimasi return investasi, setoran bulanan dihitung pakai rumus
  // future value of annuity (uang yang ditabung ikut "berbunga"), jadi makin
  // tinggi return-nya, makin kecil setoran bulanan yang dibutuhkan.
  // Kalau return 0%, hasilnya sama persis kayak perhitungan lama (linear).
  const budiBulanan = totalBulan <= 0
    ? 0
    : returnBulanan === 0
      ? sisaDanaDibutuhkan / totalBulan
      : sisaDanaDibutuhkan * returnBulanan / (Math.pow(1 + returnBulanan, totalBulan) - 1);
  const budiBulananTanpaInvestasi = totalBulan > 0 ? sisaDanaDibutuhkan / totalBulan : 0;
  const hematDariInvestasi = Math.max(budiBulananTanpaInvestasi - budiBulanan, 0);

  return (
    <CalcLayout
      inputs={
        <>
          <NumberInput label="Biaya daftar haji" prefix="Rp" value={daftarHaji} onChange={setDaftarHaji} step={1000000} />
          <NumberInput label="Target tahun keberangkatan" value={targetBerangkat} onChange={setTargetBerangkat} min={tahunSaatIni} max={tahunSaatIni + 30} step={1} />
          <NumberInput label="DP / Setoran awal" prefix="Rp" value={dpSetoran} onChange={setDpSetoran} step={1000000} />
          <Slider label="Estimasi inflasi biaya haji" value={inflasi} onChange={setInflasi} min={0} max={10} step={0.5} format={(v) => `${v}%`} />
          <Slider label="Estimasi return investasi tahunan" value={returnInvestasi} onChange={setReturnInvestasi} min={0} max={20} step={0.5} format={(v) => `${v}%`} />
        </>
      }
      results={
        <>
          <div className="row" style={{ gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ flex: 1, background: "var(--surface-2)" }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>TARGET BERANGKAT</div>
              <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>
                {targetBerangkat}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>Dalam {tahunMenuju} tahun</div>
            </div>
            <div className="card" style={{ flex: 1, background: "var(--surface-2)" }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>TOTAL BIAYA (Inflasi {inflasi}%)</div>
              <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>
                {formatIDR(Math.round(totalBiayaDenganInflasi))}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>Dari {formatIDR(totalBiayaMendasar)}</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16, padding: 20 }}>
            <h4 style={{ marginBottom: 16 }}>Rencana Pelunasan</h4>
            <div className="stack" style={{ gap: 12 }}>
              <div className="row-between">
                <span>DP / Setoran awal</span>
                <span className="mono" style={{ fontWeight: 600 }}>{formatIDR(dpSetoran)}</span>
              </div>
              <div className="row-between">
                <span>Sisa dana dibutuhkan</span>
                <span className="mono" style={{ fontWeight: 600, color: "var(--accent)" }}>{formatIDR(Math.round(sisaDanaDibutuhkan))}</span>
              </div>
              <div className="divider" style={{ margin: "8px 0" }} />
              <div className="row-between">
                <span style={{ fontWeight: 600 }}>Budget bulanan yang diperlukan</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: 18, color: "var(--positive)" }}>{formatIDR(Math.round(budiBulanan))}</span>
              </div>
              {returnInvestasi > 0 && hematDariInvestasi > 0 && (
                <div className="row-between">
                  <span className="muted" style={{ fontSize: 12 }}>Lebih hemat berkat investasi {returnInvestasi}%/thn</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--accent)" }}>−{formatIDR(Math.round(hematDariInvestasi))}/bln</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface-2)", borderRadius: 14, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
            🕋 <span style={{ marginLeft: 8 }}>
              Tahukah kamu? Biaya haji riil (BPIH) untuk Haji Reguler sebagian ditanggung Nilai Manfaat dana kelolaan BPKH — sekitar 30–40% per tahun (BPIH 2026: ±Rp87,4 juta, sementara yang dibayar jemaah/Bipih hanya ±Rp54,2 juta). Namun besaran subsidi ini ditetapkan ulang tiap tahun lewat Keppres dan cenderung menurun, jadi kalkulator ini sengaja menghitung skenario kamu menabung penuh — biar rencana kamu tetap aman meski subsidi berubah nanti.
            </span>
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface-2)", borderRadius: 14, fontSize: 13, color: "var(--ink-2)" }}>
            💡 <span style={{ marginLeft: 8 }}>Semakin cepat dapat nomor porsi, semakin cepat antrean berjalan. Sedia surat rujukan dari masjid atau agen haji terpercaya.</span>
          </div>
        </>
      }
      onSave={() => onSaveResult({ id: "haji", title: "Haji & Umroh", value: `${targetBerangkat} · Rp ${formatIDR(Math.round(budiBulanan))}/bln`, plan: { type: "hajj", targetAmount: totalBiayaDenganInflasi, monthlyAmount: budiBulanan, timeframe: tahunMenuju, preparedAssets: dpSetoran, targetYear: targetBerangkat } })}
      onNavigate={onNavigate}
      calcId="haji"
      relatedId={null}
    />
  );
}

// ============================================================
// ============================================================
// 8. WARISAN CALCULATOR (REBUILT — CLEAN, SIMPLE, PIE CHART)
// ============================================================
function WarisanCalc({ onSaveResult, onNavigate }) {
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

  // Tambahkan nominal
  ahliWaris.forEach((aw) => { aw.nominal = hartaBersih * aw.fraksi; });

  // PIE CHART DATA
  const pieData = ahliWaris.map((aw) => ({
    name: aw.nama,
    value: Math.round(aw.nominal),
    fraksi: aw.fraksi,
  }));

  const COLORS = ["#5EE5B0", "#FFB800", "#FF9A6B", "#C6F24E", "#7C9CFF", "#E5A4FF", "#FFD66B"];

  return (
    <div>
      <Section style={{ paddingTop: 32, paddingBottom: 16 }}>
        <button
          onClick={() => onNavigate({ name: "calc" })}
          style={{
            background: "var(--chip)", border: 0, color: "var(--ink-2)",
            padding: "8px 14px", borderRadius: 999, font: "inherit",
            fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 24,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          ← Semua kalkulator
        </button>

        <div className="row" style={{ gap: 18, marginBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#FFD66B", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Gift size={28} stroke={2} />
          </div>
          <div>
            <div className="mono muted" style={{ fontSize: 12, letterSpacing: "0.12em" }}>KALKULATOR IMPIAN</div>
            <h1 style={{ fontSize: "clamp(36px,5vw,64px)" }}>Perencanaan Warisan</h1>
          </div>
        </div>
        <p className="ink-2" style={{ fontSize: 18, marginTop: 12, maxWidth: 620 }}>
          Hitung distribusi warisan sesuai hukum faraid Islam dengan mudah dan akurat.
        </p>
      </Section>

      <Section style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "flex-start" }}>
          {/* INPUT SECTION */}
          <div className="card" style={{ position: "sticky", top: 88, padding: 24 }}>
            <h3 style={{ fontSize: 18, marginBottom: 20 }}>Input Data Warisan</h3>
            <div className="stack" style={{ gap: 16 }}>
              <div>
                <label className="label-sm">Total Aset</label>
                <NumberInput label="" prefix="Rp" value={totalAset} onChange={setTotalAset} step={50000000} />
              </div>

              <div>
                <label className="label-sm">Hutang</label>
                <NumberInput label="" prefix="Rp" value={hutang} onChange={setHutang} step={10000000} />
              </div>

              <div>
                <label className="label-sm">Biaya Pemakaman & Kewajiban</label>
                <NumberInput label="" prefix="Rp" value={biayaPemakaman} onChange={setBiayaPemakaman} step={5000000} />
              </div>

              <div className="divider" style={{ margin: "12px 0" }} />

              <div>
                <label className="label-sm">Ahli Waris</label>
              </div>

              <div>
                <label className="label-sm">Jenis Kelamin Pewaris</label>
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  {[
                    { v: "laki", label: "Laki-laki" },
                    { v: "perempuan", label: "Perempuan" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setGenderPewaris(opt.v)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: 0,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        font: "inherit",
                        background: genderPewaris === opt.v ? "var(--accent)" : "var(--chip)",
                        color: genderPewaris === opt.v ? "var(--accent-ink)" : "var(--ink-2)",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                  Menentukan pasangan ahli waris: laki-laki → istri, perempuan → suami.
                </div>
              </div>

              {genderPewaris === "laki" ? (
                <div>
                  <label className="label-sm">Jumlah Istri</label>
                  <Slider label="" value={jumlahIstri} onChange={setJumlahIstri} min={0} max={4} step={1} format={(v) => `${v}`} />
                </div>
              ) : (
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={suamiHidup} onChange={(e) => setSuamiHidup(e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Suami masih hidup</span>
                </label>
              )}

              <div className="row" style={{ gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="label-sm">Anak Laki-laki</label>
                  <Slider label="" value={jumlahAnakLaki} onChange={setJumlahAnakLaki} min={0} max={10} step={1} format={(v) => `${v}`} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label-sm">Anak Perempuan</label>
                  <Slider label="" value={jumlahAnakPerempuan} onChange={setJumlahAnakPerempuan} min={0} max={10} step={1} format={(v) => `${v}`} />
                </div>
              </div>

              <div className="row" style={{ gap: 12 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", flex: 1 }}>
                  <input type="checkbox" checked={ayahHidup} onChange={(e) => setAyahHidup(e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Ayah masih hidup</span>
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", flex: 1 }}>
                  <input type="checkbox" checked={ibuHidup} onChange={(e) => setIbuHidup(e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Ibu masih hidup</span>
                </label>
              </div>
            </div>
          </div>

          {/* OUTPUT SECTION */}
          <div>
            {/* HARTA BERSIH */}
            <div className="card" style={{ marginBottom: 20, padding: 20, background: "color-mix(in oklab, var(--accent) 15%, var(--surface))" }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>TOTAL HARTA BERSIH</div>
              <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                {formatIDR(Math.max(0, hartaBersih))}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12, lineHeight: 1.6 }}>
                <div>Total Aset: {formatIDR(totalAset)}</div>
                <div>- Hutang: {formatIDR(hutang)}</div>
                <div>- Biaya Pemakaman: {formatIDR(biayaPemakaman)}</div>
              </div>
            </div>

            {/* DISTRIBUTION TABLE */}
            <div className="card" style={{ marginBottom: 20, padding: 20, overflow: "auto" }}>
              <h4 style={{ marginBottom: 16 }}>Pembagian Warisan</h4>
              {ahliWaris.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ textAlign: "left", padding: "10px 0", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Ahli Waris</th>
                      <th style={{ textAlign: "right", padding: "10px 0", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Fraksi</th>
                      <th style={{ textAlign: "right", padding: "10px 0", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>%</th>
                      <th style={{ textAlign: "right", padding: "10px 0", fontWeight: 600, color: "var(--ink-2)", fontSize: 12 }}>Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ahliWaris.map((aw, idx) => {
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 0", fontWeight: 500 }}>
                            <div>{aw.nama}</div>
                            <div style={{ fontSize: 11, color: "var(--muted)" }}>{aw.status}</div>
                          </td>
                          <td style={{ textAlign: "right", padding: "10px 0", fontFamily: "JetBrains Mono", fontWeight: 600, fontSize: 12 }}>
                            {aw.fraksiText}
                          </td>
                          <td style={{ textAlign: "right", padding: "10px 0", fontFamily: "JetBrains Mono", fontWeight: 600, fontSize: 12 }}>
                            {(aw.fraksi * 100).toFixed(1)}%
                          </td>
                          <td style={{ textAlign: "right", padding: "10px 0", fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 13, color: "var(--accent)" }}>
                            {formatIDR(Math.round(aw.nominal))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="muted" style={{ fontSize: 13 }}>Tidak ada ahli waris berdasarkan input.</div>
              )}
            </div>

            {/* PIE CHART */}
            {ahliWaris.length > 0 && (
              <div className="card" style={{ marginBottom: 20, padding: 20 }}>
                <h4 style={{ marginBottom: 16 }}>Visualisasi Pembagian</h4>
                <SimplePieChart data={pieData} colors={COLORS} />
              </div>
            )}

            {/* DISCLAIMER */}
            <div className="card" style={{ padding: 14, background: "var(--surface-2)", borderLeft: "3px solid var(--accent)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--ink)" }}>📋 DISCLAIMER:</strong><br />
              Simulasi ini bersifat edukatif dan dapat berbeda tergantung kondisi ahli waris serta ketentuan syariah yang berlaku. Untuk kasus kompleks, konsultasikan dengan ahli faraidh atau Pengadilan Agama.
            </div>

            {/* CTA BUTTONS */}
            <div className="row" style={{ gap: 12, marginTop: 20 }}>
              <button
                onClick={() => {
                  const totalNominal = ahliWaris.reduce((sum, aw) => sum + aw.nominal, 0);
                  onSaveResult({ id: "warisan", title: "Perencanaan Warisan", value: `${ahliWaris.length} ahli waris · Total ${formatIDR(Math.round(totalNominal))}`, plan: { type: "inheritance", targetAmount: totalAset, preparedAssets: totalAset - hutang, timeframe: 1 } });
                }}
                style={{
                  background: "var(--accent)", color: "var(--accent-ink)", border: 0, borderRadius: 12,
                  padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", flex: 1,
                }}
              >
                ✓ Simpan Hasil
              </button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// Simple Pie Chart Component
function SimplePieChart({ data, colors }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
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

    return (
      <g key={idx}>
        <path d={pathData} fill={colors[idx % colors.length]} opacity="0.85" />
        {percentage > 0.08 && (
          <text
            x={100 + 50 * Math.cos((startRad + endRad) / 2)}
            y={100 + 50 * Math.sin((startRad + endRad) / 2)}
            textAnchor="middle"
            dy="0.3em"
            style={{ fontSize: 12, fontWeight: 700, fill: "#000", pointerEvents: "none" }}
          >
            {(percentage * 100).toFixed(0)}%
          </text>
        )}
      </g>
    );
  });

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <svg width="220" height="220" viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
        {slices}
      </svg>
      <div className="stack" style={{ gap: 8, flex: 1 }}>
        {data.map((item, idx) => (
          <div key={idx} className="row" style={{ gap: 8, alignItems: "center", fontSize: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: colors[idx % colors.length] }} />
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ fontWeight: 600 }}>{(item.fraksi * 100).toFixed(1)}%</span>
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
  const [hartaTersimpan, setHartaTersimpan] = React.useState(50000000);
  const [penghasilanBulanan, setPenghasilanBulanan] = React.useState(10000000);
  const [bulanBekerja, setBulanBekerja] = React.useState(12);

  // Nishab mengacu ke 85 gr emas. Per Mei 2026 ~ Rp 2.500.000/gr → Rp 212.500.000
  const nishabMaal = 212500000;

  const zakatMaal = hartaTersimpan >= nishabMaal ? hartaTersimpan * 0.025 : 0;

  const pendapatanTahunan = penghasilanBulanan * bulanBekerja;
  const zakatProfesi = pendapatanTahunan * 0.025;

  const totalZakat = zakatMaal + zakatProfesi;

  return (
    <CalcLayout
      inputs={
        <>
          <NumberInput label="Harta tersimpan (tabungan/investasi)" prefix="Rp" value={hartaTersimpan} onChange={setHartaTersimpan} step={5000000} />
          <NumberInput label="Penghasilan bulanan" prefix="Rp" value={penghasilanBulanan} onChange={setPenghasilanBulanan} step={500000} />
          <Slider label="Bulan bekerja per tahun" value={bulanBekerja} onChange={setBulanBekerja} min={1} max={12} step={1} format={(v) => `${v} bulan`} />
        </>
      }
      results={
        <>
          <ResultTile
            label="TOTAL ZAKAT YANG HARUS DIBAYAR"
            value={formatIDR(Math.round(totalZakat))}
            sub="Per tahun / per hijriah"
          />

          <div className="card" style={{ marginTop: 16, padding: 20 }}>
            <h4 style={{ marginBottom: 16 }}>Breakdown Zakat</h4>
            <div className="stack" style={{ gap: 12 }}>
              <div>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span>Zakat Maal (Harta)</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{formatIDR(Math.round(zakatMaal))}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {hartaTersimpan >= nishabMaal
                    ? `2.5% dari ${formatIDR(hartaTersimpan)} — harta mencapai nishab`
                    : `Harta belum mencapai nishab ${formatIDR(nishabMaal)} — belum wajib zakat maal`}
                </div>
              </div>

              <div>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span>Zakat Profesi (Gaji)</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{formatIDR(Math.round(zakatProfesi))}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>2.5% dari {formatIDR(Math.round(pendapatanTahunan))}/tahun</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface)", borderRadius: 14, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
            ℹ️ <span style={{ marginLeft: 8 }}>
              Perhitungan zakat mengacu pada nishab emas (85 gr emas ≈ {formatIDR(nishabMaal)}, harga emas berfluktuasi) dan haul — aset tersimpan dihitung minimal 12 bulan penuh.
            </span>
          </div>
        </>
      }
      onSave={() => onSaveResult({ id: "zakat", title: "Zakat Tahunan", value: formatIDR(Math.round(totalZakat)), plan: null })}
      onNavigate={onNavigate}
      calcId="zakat"
      relatedId={null}
    />
  );
}



function CalcLayout({ inputs, results, onSave, onNavigate, calcId }) {
  const [saved,setSaved]=React.useState(false);
  const meta=CALCULATOR_META.find(x=>x.id===calcId);
  const protectLabel={rumah:"Lindungi KPR & Rumah",edu:"Lindungi Dana Pendidikan",pension:"Lindungi Dana Pensiun",haji:"Lindungi Rencana Haji",invest:"Lindungi Aset & Investasi",checkup:"Cek Kebutuhan Proteksi",insurance:"Review Proteksi",warisan:"Lindungi Rencana Warisan",zakat:"Lanjut ke Proteksi Finansial"}[calcId]||"Lanjut ke Proteksi Finansial";
  const save=()=>{ if(!saved){onSave();setSaved(true);setTimeout(()=>setSaved(false),1800);} };
  const goProtection=()=>{save();onNavigate({name:"protection", calculatorId:calcId});};
  return <div>
    <div className="wp-calc-grid" style={{display:"grid",gridTemplateColumns:"minmax(0,.85fr) minmax(0,1.15fr)",gap:20,alignItems:"start"}}>
      <Card style={{position:"sticky",top:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{margin:0,fontSize:18}}>Input</h3><Tag>auto-update</Tag></div><div style={{display:"grid",gap:15}}>{inputs}</div></Card>
      <div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{margin:0,fontSize:18}}>Hasil Perhitungan</h3><Button variant="secondary" size="sm" onClick={save} icon={saved?<Check size={14}/>:<Plus size={14}/>}>{saved?"Tersimpan":"Simpan Hasil"}</Button></div>{results}<p style={{fontSize:11,color:"#71827b",lineHeight:1.5,marginTop:12}}>Simulasi bersifat edukatif. Hasil aktual dapat berbeda sesuai kondisi dan asumsi yang digunakan.</p>
        <Card style={{marginTop:18,background:"linear-gradient(135deg,#f5fbf7,#ffffff)",borderColor:"#cfe5da"}}><Tag variant="accent">PROTEKSI FINANSIAL</Tag><h4 style={{fontSize:18,margin:"12px 0 7px",color:"#173b32"}}>{protectLabel}</h4><p style={{fontSize:12,lineHeight:1.6,color:"#667a72",margin:0}}>Rencana keuanganmu akan tetap tersimpan. Cek risiko yang bisa mengganggu target ini dan lihat apa yang masih perlu dilindungi.</p><Button variant="primary" size="sm" onClick={goProtection} iconRight={<ArrowRight size={14}/>} style={{marginTop:14}}>Lindungi rencana ini</Button></Card>
      </div>
    </div>
    <style>{`@media(max-width:880px){.wp-calc-grid{grid-template-columns:1fr!important}.wp-calc-grid>div:first-child{position:relative!important;top:0!important}}`}</style>
  </div>;
}


export function FinancialCalculator({ onOpen }: { onOpen: (id: string) => void }) {
  return <div className="wp-calculator" style={{display:"grid",gap:20}}>
    <div><div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#71827b"}}>WEALTHPLANNER</div><h1 style={{fontSize:28,lineHeight:1.15,color:"#173b32",margin:"7px 0 6px"}}>Financial Calculator</h1><p style={{margin:0,fontSize:13,color:"#667a72"}}>Hitung, simulasikan, lalu simpan rencana ke Proteksi Finansial tanpa membuka tab baru.</p></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
      {CALCULATOR_META.map((c, index)=><button key={c.id} type="button" onClick={()=>onOpen(c.id)} style={{textAlign:"left",padding:20,border:`1px solid ${COLORS[index % COLORS.length]}55`,background:`linear-gradient(145deg, ${COLORS[index % COLORS.length]}20, #ffffff 72%)`,borderRadius:18,cursor:"pointer",boxShadow:"0 4px 16px rgba(15,42,32,.05)",transition:"transform .15s ease, box-shadow .15s ease"}}><div style={{display:"inline-flex",alignItems:"center",borderRadius:999,padding:"5px 9px",background:`${COLORS[index % COLORS.length]}30`,color:"#35554a",fontSize:10,fontWeight:700,marginBottom:12}}>WEALTH PLANNER</div><div style={{fontSize:15,fontWeight:700,color:"#173b32"}}>{c.title}</div><div style={{fontSize:12,lineHeight:1.55,color:"#71827b",marginTop:7}}>{c.desc}</div><div style={{fontSize:12,fontWeight:700,color:"#0f5d46",marginTop:14}}>Buka kalkulator →</div></button>)}
    </div>
  </div>;
}
export function CalculatorDetail({ id, onBack, onSaveResult, onNavigate }) {
  const meta=CALCULATOR_META.find(x=>x.id===id)||CALCULATOR_META[0];
  return <div className="wp-calculator" style={{display:"grid",gap:20}}><style>{`
      .wp-calculator{--ink:#173b32;--ink-2:#55766a;--muted:#71827b;--accent:#0f5d46;--accent-ink:#fff;--surface:#fff;--surface-2:#f6f7f4;--border:rgba(20,50,40,.10)}
      .wp-calculator .card{background:#fff;border:1px solid rgba(20,50,40,.10);border-radius:16px;padding:18px}
      .wp-calculator .card-tight{padding:12px 14px}
      .wp-calculator .row{display:flex;align-items:center}.wp-calculator .row-between{display:flex;align-items:center;justify-content:space-between}
      .wp-calculator .stack{display:flex;flex-direction:column}.wp-calculator .muted{color:#71827b}.wp-calculator .ink-2{color:#55766a}.wp-calculator .mono{font-variant-numeric:tabular-nums}.wp-calculator .divider{height:1px;background:rgba(20,50,40,.10)}
    `}</style>
    <button type="button" onClick={onBack} style={{width:"fit-content",border:0,background:"transparent",color:"#55766a",fontSize:13,cursor:"pointer",padding:0}}>← Semua kalkulator</button>
    <div><div style={{fontSize:11,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"#71827b"}}>FINANCIAL CALCULATOR</div><h1 style={{fontSize:28,lineHeight:1.15,color:"#173b32",margin:"7px 0 6px"}}>{meta.title}</h1><p style={{margin:0,fontSize:13,color:"#667a72"}}>{meta.desc}</p></div>
    <CalculatorBody id={id} onSaveResult={onSaveResult} onNavigate={onNavigate}/>
  </div>;
}
