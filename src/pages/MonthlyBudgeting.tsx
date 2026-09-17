const API_BASE = "/api";
import { useEffect, useState } from "react";
import { Check, Pencil, Loader2 } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { ChartCard } from "../components/Card";
import { BudgetProgressBar, StatusBadge } from "../components/ProgressBar";
import { formatRupiah, formatPercent } from "../lib/format";
import { usagePercentage, budgetStatus } from "../data/types";
import { useFinanceData, getStoredToken } from "../lib/useFinanceData";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_LABELS: Record<string,string> = { January:"Januari",February:"Februari",March:"Maret",April:"April",May:"Mei",June:"Juni",July:"Juli",August:"Agustus",September:"September",October:"Oktober",November:"November",December:"Desember" };
const YEARS = Array.from({length: 7}, (_, i) => new Date().getFullYear() - 3 + i);

type Row = { category: string; allocation: number; realization: number };

function EditableBudgetCard({ category, allocation, realization, month, type, isRealData, onSaved }: { category:string; allocation:number; realization:number; month:string; type:"Income"|"Expense"|"Saving"; isRealData:boolean; onSaved:(category:string, amount:number)=>void }) {
  const [editing,setEditing]=useState(false); const [value,setValue]=useState(String(allocation||"")); const [saving,setSaving]=useState(false); const [err,setErr]=useState("");
  const pct=usagePercentage(realization,allocation); const status=budgetStatus(pct);
  async function handleSave(){ const amount=Number(value.replace(/\D/g,"")); if(!Number.isFinite(amount)||amount<0){setErr("Masukkan angka yang valid.");return;} setSaving(true);setErr(""); try{const token=getStoredToken();const res=await fetch(`${API_BASE}/update-budget`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,type,category,month,amount})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Gagal menyimpan");onSaved(category,amount);setEditing(false);window.dispatchEvent(new CustomEvent("wealthplanner:budget-updated"));}catch(e){setErr(e instanceof Error?e.message:"Gagal menyimpan");}finally{setSaving(false);}}
  return <ChartCard title={category.toUpperCase()}>
    <div className="flex items-center justify-between mb-1"><p className="text-[13px] text-charcoal/55">{formatRupiah(realization)} / {formatRupiah(allocation)}</p><StatusBadge status={status}/></div>
    {editing ? <div className="flex items-center gap-2 mb-2"><input autoFocus inputMode="numeric" value={value} onChange={e=>setValue(e.target.value.replace(/\D/g,""))} className="flex-1 border border-charcoal/15 rounded-lg px-2.5 py-1.5 text-[13px]" placeholder="Budget baru (Rp)"/><button onClick={handleSave} disabled={saving} className="bg-forest-600 text-white rounded-lg p-1.5 disabled:opacity-50">{saving?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>}</button></div> : <><BudgetProgressBar usagePct={pct}/><div className="flex items-center justify-between mt-1.5"><p className="text-[12px] text-charcoal/50">{formatPercent(pct)} terpakai</p>{isRealData&&<button onClick={()=>{setValue(String(allocation||""));setEditing(true)}} className="text-[12px] text-forest-700 flex items-center gap-1 hover:underline"><Pencil size={11}/> Edit</button>}</div></>}
    {err&&<p className="text-[12px] text-rose-600 mt-1">{err}</p>}
  </ChartCard>;
}

function BudgetSection({ title, rows, type, month, isRealData, onSaved }: { title:string; rows:Row[]; type:"Income"|"Expense"|"Saving"; month:string; isRealData:boolean; onSaved:(type:string,category:string,amount:number)=>void }) {
  return <section><div className="flex items-end justify-between mb-3"><div><h2 className="text-[16px] font-semibold text-forest-900">{title}</h2><p className="text-[12px] text-charcoal/50 mt-0.5">Kategori mengikuti Setup.</p></div><span className="text-[11px] text-charcoal/40">{rows.length} kategori</span></div><div className="grid gap-3 md:grid-cols-2">{rows.map(c=><EditableBudgetCard key={c.category} {...c} type={type} month={month} isRealData={isRealData} onSaved={(category,amount)=>onSaved(type,category,amount)}/>)}</div></section>;
}

export function MonthlyBudgeting(){
  const now=new Date(); const [selectedMonth,setSelectedMonth]=useState(MONTHS[now.getMonth()]); const [selectedYear,setSelectedYear]=useState(now.getFullYear());
  const {isRealData,loading,month,totalIncome,totalExpense,totalSaving,byCategory}=useFinanceData(selectedMonth,false,selectedYear);
  const [overrides,setOverrides]=useState<Record<string,number>>({});
  useEffect(()=>setOverrides({}),[selectedMonth,selectedYear]);
  const rows=(type:"Income"|"Expense"|"Saving")=>byCategory(type).map(c=>({...c,allocation:overrides[`${type}:${c.category}`]??c.allocation}));
  const incomeRows=rows("Income"), expenseRows=rows("Expense"), savingRows=rows("Saving");
  const budgetExpense=expenseRows.reduce((s,c)=>s+c.allocation,0); const remaining=budgetExpense-totalExpense;
  const onSaved=(type:string,category:string,amount:number)=>setOverrides(o=>({...o,[`${type}:${category}`]:amount}));
  return <div className="flex flex-col gap-7">
    <div className="flex items-start justify-between flex-wrap gap-3"><div><h1 className="text-2xl font-semibold text-forest-900">Monthly Budget</h1><p className="text-[14px] text-charcoal/60 mt-0.5">Budget dan realisasi berdasarkan kategori dari Setup.{loading&&" Memuat data..."}</p></div><div className="flex items-center gap-2 rounded-xl border border-forest-100 bg-white px-3 py-2 shadow-sm"><span className="text-[12px] font-medium text-charcoal/55">Month</span><select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="bg-transparent text-[13px] font-semibold text-forest-800 outline-none">{MONTHS.map(m=><option key={m} value={m}>{MONTH_LABELS[m]}</option>)}</select><span className="text-charcoal/20">|</span><span className="text-[12px] font-medium text-charcoal/55">Year</span><select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))} className="bg-transparent text-[13px] font-semibold text-forest-800 outline-none">{YEARS.map(y=><option key={y} value={y}>{y}</option>)}</select></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatCard label="Monthly Income" value={formatRupiah(totalIncome)} tone="forest"/><StatCard label="Budget Expense" value={budgetExpense>0?formatRupiah(budgetExpense):"Belum Aktivasi Budget"} tone="neutral"/><StatCard label="Monthly Spending" value={formatRupiah(totalExpense)} tone="rose"/><StatCard label="Monthly Savings" value={formatRupiah(totalSaving)} tone="forest"/></div>
    <BudgetSection title="Income List" rows={incomeRows} type="Income" month={month} isRealData={isRealData} onSaved={onSaved}/>
    <BudgetSection title="Expense List" rows={expenseRows} type="Expense" month={month} isRealData={isRealData} onSaved={onSaved}/>
    <BudgetSection title="Saving List" rows={savingRows} type="Saving" month={month} isRealData={isRealData} onSaved={onSaved}/>
    <div className="rounded-xl border border-charcoal/8 bg-white p-4"><div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-forest-900">Remaining Expense Budget</span><span className={`text-[16px] font-bold ${remaining<0?"text-rose-700":"text-forest-700"}`}>{formatRupiah(remaining)}</span></div></div>
  </div>;
}
