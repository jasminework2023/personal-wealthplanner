import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Target, Trash2 } from "lucide-react";
import { Card } from "../components/Card";
import { getPlanTypeLabel, loadFinancialPlans, removeFinancialPlan } from "../lib/financialPlans";
import { formatRupiah } from "../lib/format";

export function Goals() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(() => loadFinancialPlans());

  function deletePlan(id: string) {
    removeFinancialPlan(id);
    setPlans(loadFinancialPlans());
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate("/")} aria-label="Kembali ke Home" className="mt-1 rounded-xl border border-rose-100 bg-white p-2 text-forest-700"><ArrowLeft size={17}/></button>
        <div><h1 className="text-2xl font-semibold tracking-tight text-forest-900">Goals & Rencana Keuangan</h1><p className="mt-1 text-[13px] leading-5 text-charcoal/55">Kumpulan simulasi keuangan yang sudah kamu simpan dari Calculator.</p></div>
      </div>
      {plans.length ? <div className="grid gap-3 sm:grid-cols-2">{plans.map((plan) => (
        <Card key={plan.id} className="border border-rose-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-forest-700"><Target size={20}/></span><div className="min-w-0"><h2 className="text-[14px] font-semibold text-forest-900">{plan.name}</h2><p className="mt-1 text-[11px] text-charcoal/50">{getPlanTypeLabel(plan.type)}</p></div></div>
            <button onClick={() => deletePlan(plan.id)} aria-label={`Hapus ${plan.name}`} className="rounded-lg p-1.5 text-charcoal/35 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15}/></button>
          </div>
          <div className="mt-4 rounded-xl bg-rose-50/60 p-3">
            <p className="text-[11px] text-charcoal/55">Target / nilai perencanaan</p>
            <p className="mt-1 text-[18px] font-semibold text-forest-900">{formatRupiah(plan.targetAmount ?? plan.obligationAmount ?? plan.homePrice ?? plan.loanAmount ?? plan.monthlyAmount ?? 0)}</p>
            <p className="mt-1 text-[10px] text-charcoal/45">Disimpan dari kalkulator. Progress belum dihitung otomatis dari transaksi.</p>
          </div>
          <button onClick={() => navigate(`/calculator/${plan.calculatorId}`)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-forest-100 px-3 py-2 text-[12px] font-semibold text-forest-700 hover:bg-forest-50"><Calculator size={14}/> Buka simulasi</button>
        </Card>
      ))}</div> : <Card className="border border-dashed border-rose-200 bg-rose-50/30 py-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-forest-700"><Target size={23}/></span><h2 className="mt-3 text-[15px] font-semibold text-forest-900">Belum ada goal tersimpan</h2><p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-charcoal/55">Mulai dari Calculator, pilih simulasi yang kamu butuhkan, lalu simpan hasilnya sebagai rencana keuangan.</p><button onClick={() => navigate("/calculator")} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-[12px] font-semibold text-white"><Calculator size={15}/> Buka Calculator</button></Card>}
    </div>
  );
}
