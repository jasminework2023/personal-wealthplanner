import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Target, Trash2, Pencil, Check, X, Wallet, Plus, ChevronDown } from "lucide-react";
import { Card } from "../components/Card";
import { getAppLanguage } from "../lib/format";
import { getPlanTypeLabel, loadFinancialPlans, removeFinancialPlan, saveFinancialPlan, type FinancialPlanType } from "../lib/financialPlans";
import { formatRupiah } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";

type GoalSettings = {
  names: Record<string, string>;
  allocations: Record<string, Record<string, number>>;
};

const SETTINGS_KEY = "wealthplanner_goal_asset_allocations_v1";

function loadGoalSettings(): GoalSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { names: parsed.names || {}, allocations: parsed.allocations || {} };
  } catch {
    return { names: {}, allocations: {} };
  }
}

function saveGoalSettings(settings: GoalSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function getPlanTarget(plan: ReturnType<typeof loadFinancialPlans>[number]) {
  return plan.targetAmount ?? plan.obligationAmount ?? plan.homePrice ?? plan.loanAmount ?? 0;
}

function getCalculatorRouteId(plan: ReturnType<typeof loadFinancialPlans>[number]) {
  const calculatorByType: Record<FinancialPlanType, string> = {
    cashflow: "checkup",
    home: "rumah",
    education: "edu",
    retirement: "pension",
    hajj: "haji",
    investment: "invest",
    income_protection: "insurance",
    inheritance: "warisan",
  };
  return calculatorByType[plan.type] || plan.calculatorId || "checkup";
}

export function Goals() {
  const [language, setLanguage] = useState(getAppLanguage());
  useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const id = language === "id";
  const navigate = useNavigate();
  const { assets } = useFinanceData();
  const [plans, setPlans] = useState(() => {
    const loaded = loadFinancialPlans();
    let order: string[] = [];
    try { order = JSON.parse(localStorage.getItem("wealthplanner_goal_order_v1") || "[]"); } catch {}
    return [...loaded].sort((a, b) => {
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
      if (ai < 0 && bi < 0) return b.createdAt - a.createdAt;
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    });
  });
  const [settings, setSettings] = useState<GoalSettings>(() => loadGoalSettings());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [allocatingId, setAllocatingId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [showManualGoal, setShowManualGoal] = useState(false);
  const [manualGoalName, setManualGoalName] = useState("");
  const [manualGoalTarget, setManualGoalTarget] = useState("");
  const [manualGoalType, setManualGoalType] = useState<FinancialPlanType>("investment");
  const [draggedPlanId, setDraggedPlanId] = useState<string | null>(null);
  const [planOrder, setPlanOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("wealthplanner_goal_order_v1") || "[]"); } catch { return []; }
  });

  const assetOptions = useMemo(() => [
    ...assets.liquidAssets.map((a) => ({ id: "liquid:" + a.name, name: a.name, value: a.value })),
    ...assets.investmentAssets.map((a) => ({ id: "investment:" + a.name, name: a.name, value: a.value })),
    ...assets.stocksID.map((a) => ({ id: "stock-id:" + a.ticker, name: "Saham " + a.ticker, value: a.value })),
    ...assets.stocksUS.map((a) => ({ id: "stock-us:" + a.ticker, name: "Saham US " + a.ticker, value: a.value })),
  ], [assets]);

  const totalAllocatedByAsset = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.values(settings.allocations).forEach((byAsset) => {
      Object.entries(byAsset).forEach(([assetId, value]) => { totals[assetId] = (totals[assetId] || 0) + value; });
    });
    return totals;
  }, [settings.allocations]);

  function updateSettings(next: GoalSettings) {
    setSettings(next);
    saveGoalSettings(next);
  }

  function addManualGoal() {
    const name = manualGoalName.trim();
    const target = Number(manualGoalTarget);
    if (!name || !Number.isFinite(target) || target <= 0) return;
    const created = saveFinancialPlan({
      calculatorId: "manual-goal-" + Date.now(),
      type: manualGoalType,
      name,
      targetAmount: target,
    });
    const next = [created, ...plans];
    setPlans(next);
    const order = next.map((plan) => plan.id);
    setPlanOrder(order);
    localStorage.setItem("wealthplanner_goal_order_v1", JSON.stringify(order));
    setManualGoalName("");
    setManualGoalTarget("");
    setManualGoalType("investment");
    setShowManualGoal(false);
  }

  function reorderPlan(targetId: string) {
    if (!draggedPlanId || draggedPlanId === targetId) return;
    const next = [...plans];
    const from = next.findIndex((plan) => plan.id === draggedPlanId);
    const to = next.findIndex((plan) => plan.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPlans(next);
    const order = next.map((plan) => plan.id);
    setPlanOrder(order);
    localStorage.setItem("wealthplanner_goal_order_v1", JSON.stringify(order));
    setDraggedPlanId(null);
  }

  function deletePlan(id: string) {
    removeFinancialPlan(id);
    const next = { ...settings, allocations: { ...settings.allocations } };
    delete next.allocations[id];
    updateSettings(next);
    setPlans(loadFinancialPlans());
  }

  function startRename(id: string, name: string) {
    setEditingId(id);
    setDraftName(settings.names[id] || name);
  }

  function saveName(id: string) {
    const trimmed = draftName.trim();
    if (trimmed) updateSettings({ ...settings, names: { ...settings.names, [id]: trimmed } });
    setEditingId(null);
  }

  function saveAllocation(planId: string) {
    const value = Number(amount);
    const asset = assetOptions.find((item) => item.id === selectedAsset);
    if (!asset || !Number.isFinite(value) || value <= 0) return;
    const alreadyForThisGoal = settings.allocations[planId]?.[asset.id] || 0;
    const allocatedToOtherGoals = (totalAllocatedByAsset[asset.id] || 0) - alreadyForThisGoal;
    const available = Math.max(0, asset.value - allocatedToOtherGoals);
    if (value > available) {
      window.alert("Nominal melebihi sisa aset yang belum dialokasikan (" + formatRupiah(available) + ").");
      return;
    }
    const next = {
      ...settings,
      allocations: {
        ...settings.allocations,
        [planId]: { ...(settings.allocations[planId] || {}), [asset.id]: value },
      },
    };
    updateSettings(next);
    setAllocatingId(null);
    setAmount("");
    setSelectedAsset("");
  }

  function removeAllocation(planId: string, assetId: string) {
    const byAsset = { ...(settings.allocations[planId] || {}) };
    delete byAsset[assetId];
    updateSettings({ ...settings, allocations: { ...settings.allocations, [planId]: byAsset } });
  }

  return (
    <div className="goals-page flex flex-col gap-4 pb-6">
      <div className="flex items-start gap-3.5">
        <button onClick={() => navigate("/")} aria-label="Kembali ke Home" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-forest-100/70 bg-white text-forest-800 shadow-sm"><ArrowLeft size={18}/></button>
        <div className="min-w-0"><h1 className="page-title !text-[24px]">{id ? "Goals & Rencana Keuangan" : "Goals & Financial Plans"}</h1><p className="page-sub">{id ? "Hubungkan tujuan keuangan dengan aset yang memang kamu siapkan untuk mencapainya." : "Connect financial goals with the assets you set aside to achieve them."}</p></div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[16px] font-bold text-[#111815] dark:text-white">{id ? "Daftar target" : "Your goals"}</p>
        <button type="button" onClick={() => setShowManualGoal((open) => !open)} className="inline-flex items-center gap-2 rounded-[16px] bg-[#00B86E] px-4 py-2.5 text-[15px] font-bold text-[#03140C] shadow-sm dark:bg-[#00E08A]"><Plus size={15}/>{id ? "Tambah target" : "Add goal"}</button>
      </div>
      {showManualGoal && <Card>
        <div className="manual-goal-form flex flex-col gap-3">
          <h2 className="text-[17px] font-bold text-[#111815] dark:text-white">{id ? "Tambah target tanpa kalkulator" : "Add a goal without using the calculator"}</h2>
          <label className="flex flex-col gap-1 text-[12px] text-charcoal/70">{id ? "Nama target" : "Goal name"}<input value={manualGoalName} onChange={(e) => setManualGoalName(e.target.value)} placeholder={id ? "Contoh: Dana darurat" : "e.g. Emergency fund"} className="w-full rounded-xl border border-forest-100 px-3 py-2.5 text-[13px] text-forest-900"/></label>
          <label className="flex flex-col gap-1 text-[12px] text-charcoal/70">{id ? "Kategori" : "Category"}<select value={manualGoalType} onChange={(e) => setManualGoalType(e.target.value as FinancialPlanType)} className="w-full rounded-xl border border-forest-100 px-3 py-2.5 text-[13px] text-forest-900">{(["cashflow","home","education","retirement","hajj","investment","income_protection","inheritance"] as FinancialPlanType[]).map((type) => <option key={type} value={type}>{getPlanTypeLabel(type)}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-[12px] text-charcoal/70">{id ? "Nominal target (Rp)" : "Target amount (IDR)"}<input type="number" min="1" inputMode="numeric" value={manualGoalTarget} onChange={(e) => setManualGoalTarget(e.target.value)} placeholder="50000000" className="w-full rounded-xl border border-forest-100 px-3 py-2.5 text-[13px] text-forest-900"/></label>
          <div className="flex gap-2"><button type="button" onClick={addManualGoal} disabled={!manualGoalName.trim() || Number(manualGoalTarget) <= 0} className="inline-flex items-center gap-1.5 rounded-full bg-[#123524] px-4 py-2.5 text-[12.5px] font-semibold text-white disabled:opacity-40"><Check size={14}/>{id ? "Simpan target" : "Save goal"}</button><button type="button" onClick={() => setShowManualGoal(false)} className="rounded-full border border-forest-100 px-4 py-2.5 text-[12.5px] text-charcoal/70">{id ? "Batal" : "Cancel"}</button></div>
        </div>
      </Card>}
      {plans.length ? <div className="grid gap-3 sm:grid-cols-2">{plans.map((plan, planIndex) => {
        const target = getPlanTarget(plan);
        const planAllocations = settings.allocations[plan.id] || {};
        const allocated = Object.values(planAllocations).reduce((sum, value) => sum + value, 0);
        const progress = target > 0 ? Math.min(100, allocated / target * 100) : 0;
        return (
          <div key={plan.id} draggable onDragStart={() => setDraggedPlanId(plan.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderPlan(plan.id)} onDragEnd={() => setDraggedPlanId(null)} className={`goal-card-wrap ${draggedPlanId === plan.id ? "cursor-grabbing opacity-50" : "cursor-grab"}`}>
          <Card>
            <div className={`goal-card goal-card-${planIndex % 2 === 0 ? "a" : "b"} rounded-[24px] border border-[#D3E6E1] bg-white p-[14px] shadow-sm dark:border-[#223333] dark:bg-[#131316] dark:shadow-[0_8px_28px_rgba(0,224,138,0.06)]`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="goal-icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6F4E8] text-[#00794A] dark:bg-[#103428] dark:text-[#4DF0A8]"><Target size={21}/></span>
                <div className="min-w-0 flex-1">
                  {editingId === plan.id ? <div className="flex items-center gap-1"><input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveName(plan.id); if (e.key === "Escape") setEditingId(null); }} className="w-full min-w-0 rounded-lg border border-forest-200 px-2 py-1 text-[13px] text-forest-900 outline-none focus:ring-2 focus:ring-forest-100" aria-label="Nama goal baru"/><button onClick={() => saveName(plan.id)} aria-label="Simpan nama" className="rounded p-1 text-forest-700"><Check size={16}/></button><button onClick={() => setEditingId(null)} aria-label="Batal edit nama" className="rounded p-1 text-charcoal/50"><X size={16}/></button></div> : <div className="flex items-center gap-1"><h2 className="text-[14px] font-semibold text-forest-900">{settings.names[plan.id] || plan.name}</h2><button onClick={() => startRename(plan.id, plan.name)} aria-label="Ubah nama goal" title="Ubah nama goal" className="rounded p-1 text-[#9CA3AF] hover:text-[#6B7280]"><Pencil size={18}/></button></div>}
                  <p className="mt-0.5 text-[13px] font-normal text-[#6B7280] dark:text-[#9A9AA5]">{getPlanTypeLabel(plan.type)}</p>
                </div>
              </div>
              <button onClick={() => deletePlan(plan.id)} aria-label={`Hapus ${plan.name}`} className="rounded-lg p-1.5 text-[#9CA3AF] hover:bg-black/5 hover:text-[#6B7280]"><Trash2 size={18}/></button>
            </div>

            <div className={`goal-plan-box goal-plan-${planIndex % 2 === 0 ? "a" : "b"} mt-3 rounded-[20px] px-[14px] py-3`}>
              <p className="text-[13px] font-normal opacity-75">Target rencana</p>
              <p className="goal-target-amount num mt-0.5 text-[20px] font-extrabold leading-tight">{formatRupiah(target)}</p>
              <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[13px] font-normal opacity-75">Aset dialokasikan</span><span className="num text-right text-[13px] font-bold">{formatRupiah(allocated)}{target > 0 ? ` · ${Math.round(progress)}%` : ""}</span></div>
              <div className="goal-progress-track mt-2 h-[6px] overflow-hidden rounded-full"><div className="goal-progress-fill h-full rounded-full transition-all" style={{ width: progress + "%" }}/></div>
            </div>

            <div className="mt-[10px]">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280] dark:text-[#9A9AA5]"><Wallet size={14}/> Aset untuk tujuan ini</p>
              {Object.entries(planAllocations).length ? <div className="flex flex-col gap-2">{Object.entries(planAllocations).map(([assetId, value]) => {
                const asset = assetOptions.find((item) => item.id === assetId);
                return <div key={assetId} className="goal-asset-row flex h-11 items-center justify-between gap-2 rounded-[16px] border border-[#D9F3EA] bg-white px-[14px] dark:border-[#17302B] dark:bg-[#131316]"><p className="min-w-0 flex-1 truncate text-[15px] font-normal text-[#111815] dark:text-white">{asset?.name || assetId.split(":").slice(1).join(":")}</p><span className="num shrink-0 text-[15px] font-bold text-[#111815] dark:text-white">{formatRupiah(value)}</span><button onClick={() => removeAllocation(plan.id, assetId)} className="shrink-0 rounded-lg p-1 text-[#9CA3AF] hover:text-[#6B7280]" aria-label="Hapus alokasi aset"><X size={16}/></button></div>;
              })}</div> : <p className="text-[11px] text-charcoal/50">Belum ada aset yang dialokasikan.</p>}
              {allocatingId === plan.id ? <div className="mt-3 flex flex-col gap-2 rounded-xl border border-forest-100 p-3">
                <label className="text-[11px] font-medium text-charcoal/65">{id ? "Pilih aset" : "Select asset"}</label>
                <div className="relative"><select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} className="w-full appearance-none rounded-xl border border-rose-100 bg-white px-3 py-2 pr-8 text-[12px] text-forest-900"><option value="">Pilih aset...</option>{assetOptions.map((asset) => { const already = planAllocations[asset.id] || 0; const available = Math.max(0, asset.value - ((totalAllocatedByAsset[asset.id] || 0) - already)); return <option key={asset.id} value={asset.id}>{asset.name} · tersedia {formatRupiah(available)}</option>; })}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40"/></div>
                <label className="text-[11px] font-medium text-charcoal/65">Nominal yang dialokasikan (Rp)</label>
                <input inputMode="numeric" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Contoh: 5000000" className="w-full rounded-xl border border-rose-100 px-3 py-2 text-[12px] text-forest-900 outline-none focus:ring-2 focus:ring-forest-100"/>
                <div className="flex gap-2"><button onClick={() => saveAllocation(plan.id)} className="flex-1 rounded-full bg-[#123524] px-3 py-2.5 text-[12.5px] font-semibold text-white">Simpan alokasi</button><button onClick={() => { setAllocatingId(null); setAmount(""); setSelectedAsset(""); }} className="rounded-xl border border-rose-100 px-3 py-2 text-[12px] text-charcoal/65">{id ? "Batal" : "Cancel"}</button></div>
              </div> : <button onClick={() => { setAllocatingId(plan.id); setSelectedAsset(""); setAmount(""); }} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[16px] bg-[#00B86E] px-4 text-[15px] font-bold text-[#03140C] dark:bg-[#00E08A]"><Plus size={16}/> Alokasikan dana</button>}
            </div>
            <button onClick={() => navigate(`/calculator/${getCalculatorRouteId(plan)}`)} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[16px] border border-[#E4E6E8] bg-white px-4 text-[15px] font-bold text-[#111815] dark:border-[#2A2A31] dark:bg-[#131316] dark:text-white"><Calculator size={16}/> Buka simulasi</button>
          </div>
          </Card>
          </div>
        );
      })}</div> : <Card className="border border-dashed border-rose-200 bg-rose-50/40 py-10 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#FBD3E0] text-[#B83A62]"><Target size={26}/></span><h2 className="mt-4 text-[16px] font-bold tracking-[-0.02em] text-forest-900">Belum ada goal tersimpan</h2><p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-charcoal/55">Mulai dari Calculator, pilih simulasi yang kamu butuhkan, lalu simpan hasilnya sebagai rencana keuangan.</p><button onClick={() => navigate("/calculator")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#123524] px-5 py-3 text-[12.5px] font-semibold text-white shadow-sm"><Calculator size={15}/> Buka Calculator</button></Card>}
    </div>
  );
}
