import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Target, Trash2, Pencil, Check, X, Wallet, Plus, ChevronDown } from "lucide-react";
import { Card } from "../components/Card";
import { getAppLanguage } from "../lib/format";
import { getPlanTypeLabel, loadFinancialPlans, removeFinancialPlan, saveFinancialPlan, type FinancialPlanType } from "../lib/financialPlans";
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
  const formatGoalCurrency = (value: number) => `Rp${new Intl.NumberFormat(id ? "id-ID" : "en-US", { maximumFractionDigits: 0 }).format(value)}`;
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
      window.alert("Nominal melebihi sisa aset yang belum dialokasikan (" + formatGoalCurrency(available) + ").");
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

  function getSimulation(plan: ReturnType<typeof loadFinancialPlans>[number]) {
    const calculatorName = getPlanTypeLabel(plan.type);
    const suggestion = Number(plan.monthlyAmount || 0);
    const rows: [string, string][] = [];
    if (plan.type === "cashflow") {
      if (plan.income) rows.push(["Penghasilan", formatGoalCurrency(plan.income)]);
      if (plan.expense) rows.push(["Pengeluaran", formatGoalCurrency(plan.expense)]);
      if (plan.preparedAssets) rows.push(["Aset tersedia", formatGoalCurrency(plan.preparedAssets)]);
    } else {
      if (plan.targetAmount) rows.push(["Target", formatGoalCurrency(plan.targetAmount)]);
      if (plan.timeframe) rows.push(["Jangka waktu", plan.timeframe + " tahun"]);
      if (plan.targetYear) rows.push(["Target tahun", String(plan.targetYear)]);
      if (plan.preparedAssets) rows.push(["Aset saat ini", formatGoalCurrency(plan.preparedAssets)]);
      if (plan.monthlyAmount) rows.push(["Setoran bulanan", formatGoalCurrency(plan.monthlyAmount)]);
    }
    return {
      calculatorName,
      headline: suggestion ? formatGoalCurrency(suggestion) : plan.targetAmount ? formatGoalCurrency(plan.targetAmount) : "Belum ada hasil",
      description: suggestion ? "Setoran yang disarankan dari simulasi" : "Target dari rencana keuangan ini",
      rows,
      suggestion,
    };
  }

  return (
    <div data-tour="goals-page" className="goals-page flex flex-col gap-3 pb-6">      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-[#111827] dark:text-[#F3F4F6]">Goals</h1>
        <button type="button" onClick={() => setShowManualGoal((open) => !open)} aria-label="Tambah goal" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#111827] shadow-sm dark:border-[#24272F] dark:bg-[#14161B] dark:text-[#F3F4F6]"><Plus size={19}/></button>
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
      {plans.length ? <div className="grid gap-3 sm:grid-cols-2">{plans.map((plan) => {
        const target = getPlanTarget(plan);
        const planAllocations = settings.allocations[plan.id] || {};
        const allocated = Object.values(planAllocations).reduce((sum, value) => sum + value, 0);
        const progress = target > 0 ? Math.min(100, allocated / target * 100) : 0;
        return (
          <div key={plan.id} draggable onDragStart={() => setDraggedPlanId(plan.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderPlan(plan.id)} onDragEnd={() => setDraggedPlanId(null)} className={`goal-card-wrap ${draggedPlanId === plan.id ? "cursor-grabbing opacity-50" : "cursor-grab"}`}>
          <div className="goal-card rounded-[20px] border border-[#E5E7EB] bg-white p-[18px] shadow-[0_2px_10px_rgba(17,24,39,.04)] dark:border-[#24272F] dark:bg-[#14161B] dark:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {editingId === plan.id ? <div className="flex items-center gap-1"><input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveName(plan.id); if (e.key === "Escape") setEditingId(null); }} className="w-full min-w-0 rounded-lg border border-[#E5E7EB] px-2 py-1 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-emerald-100 dark:border-[#24272F] dark:bg-[#1D2027] dark:text-white"/><button onClick={() => saveName(plan.id)} aria-label="Simpan nama" className="flex h-11 w-11 items-center justify-center text-[#6B7280]"><Check size={16}/></button><button onClick={() => setEditingId(null)} aria-label="Batal edit nama" className="flex h-11 w-11 items-center justify-center text-[#9CA3AF]"><X size={16}/></button></div> : <div className="min-w-0"><h2 className="text-[16px] font-bold leading-tight text-[#111827] dark:text-[#F3F4F6]">{settings.names[plan.id] || plan.name}</h2><p className="mt-1 text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">{getPlanTypeLabel(plan.type)}</p></div>}
              </div>
              <div className="flex shrink-0 items-center">
                <button onClick={() => startRename(plan.id, plan.name)} aria-label="Ubah nama goal" title="Ubah nama goal" className="flex h-11 w-11 items-center justify-center text-[#9CA3AF] hover:text-[#6B7280]"><Pencil size={18}/></button>
                <button onClick={() => deletePlan(plan.id)} aria-label={"Hapus " + plan.name} className="flex h-11 w-11 items-center justify-center text-[#9CA3AF] hover:text-[#DC2626] dark:hover:text-[#F87171]"><Trash2 size={18}/></button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="num text-[24px] font-bold leading-none tabular-nums text-[#111827] dark:text-[#F3F4F6]">{formatGoalCurrency(allocated)}</p>
                  <p className="mt-1.5 text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">dari target <span className="num tabular-nums">{formatGoalCurrency(target)}</span></p>
                </div>
                <span className="shrink-0 rounded-full bg-[#ECEEF2] px-2.5 py-1 text-[12px] font-bold tabular-nums text-[#111827] dark:bg-[#1D2027] dark:text-[#F3F4F6]">{Math.round(progress)}%</span>
              </div>
              <div className="goal-progress-track mt-4 h-2 overflow-hidden rounded-full bg-[#ECEEF2] dark:bg-[#24272F]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label={"Progress " + (settings.names[plan.id] || plan.name)}>
                <div className="goal-progress-fill h-full rounded-full transition-all" style={{ width: progress + "%" }} />
              </div>
              <p className="mt-2 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{progress >= 100 ? (id ? "Target tercapai" : "Goal reached") : (id ? "Lanjutkan alokasi dana untuk mencapai target." : "Keep allocating funds to reach your goal.")}</p>
            </div>

            <button onClick={() => { setAllocatingId(plan.id); setAmount(""); setSelectedAsset(""); }} className="mt-4 inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-br from-[#374151] to-[#111827] text-[14px] font-bold text-white dark:from-[#FFFFFF] dark:to-[#C9CED8] dark:text-[#111827]" aria-label="Alokasikan dana"><Plus size={17}/>Alokasikan Dana</button>
          </div>
          </div>
        );
      })}</div> : <Card className="border border-dashed border-rose-200 bg-rose-50/40 py-10 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[14px] bg-[#FBD3E0] text-[#B83A62]"><Target size={26}/></span><h2 className="mt-4 text-[16px] font-bold tracking-[-0.02em] text-forest-900">Belum ada goal tersimpan</h2><p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-charcoal/55">Mulai dari Calculator, pilih simulasi yang kamu butuhkan, lalu simpan hasilnya sebagai rencana keuangan.</p><button onClick={() => navigate("/calculator")} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#123524] px-5 py-3 text-[12.5px] font-semibold text-white shadow-sm"><Calculator size={15}/> Buka Calculator</button></Card>}

      {allocatingId && (() => {
        const plan = plans.find((item) => item.id === allocatingId);
        if (!plan) return null;
        const simulation = getSimulation(plan);
        const planAllocations = settings.allocations[plan.id] || {};
        return (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" role="dialog" aria-modal="true" aria-label="Alokasikan dana" onClick={() => { setAllocatingId(null); setAmount(""); setSelectedAsset(""); }}>
            <div className="goal-allocation-sheet w-full max-w-2xl rounded-t-[24px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-[#111827] dark:bg-[#14161B] dark:text-[#F3F4F6]" onClick={(event) => event.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D1D5DB] dark:bg-[#24272F]" />
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-[20px] font-bold">Alokasikan dana</h2><p className="mt-1 text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">{settings.names[plan.id] || plan.name}</p></div>
                <button onClick={() => { setAllocatingId(null); setAmount(""); setSelectedAsset(""); }} aria-label="Tutup" className="flex h-11 w-11 shrink-0 items-center justify-center text-[#6B7280]"><X size={20}/></button>
              </div>
              <div className="mt-4 rounded-[16px] bg-[#ECEEF2] p-4 dark:bg-[#1D2027]">
                <p className="text-[10px] font-bold tracking-[0.08em] text-[#6B7280] dark:text-[#9CA3AF]">HASIL SIMULASI · {simulation.calculatorName.toUpperCase()}</p>
                <p className="num mt-1 text-[24px] font-bold tabular-nums text-[#111827] dark:text-[#F3F4F6]">{simulation.headline}</p>
                <p className="mt-1 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{simulation.description}</p>
                <div className="mt-3 divide-y divide-black/10 dark:divide-white/10">
                  {simulation.rows.slice(0, 3).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 py-2 text-[11px]"><span className="text-[#6B7280] dark:text-[#9CA3AF]">{label}</span><span className="num tabular-nums font-semibold">{value}</span></div>)}
                </div>
              </div>
              <label htmlFor="goal-allocation-amount" className="mt-4 block text-[10px] font-bold tracking-[0.08em] text-[#6B7280] dark:text-[#9CA3AF]">JUMLAH DIALOKASIKAN (RP)</label>
              <input id="goal-allocation-amount" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))} placeholder="0" className="mt-1.5 w-full rounded-[14px] border border-[#E5E7EB] bg-white px-3 py-3 text-[15px] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-emerald-200 dark:border-[#24272F] dark:bg-[#1D2027] dark:text-[#F3F4F6]" />
              {simulation.suggestion > 0 && <p className="mt-1.5 text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">Saran simulasi: <span className="num tabular-nums">{formatGoalCurrency(simulation.suggestion)}</span> per bulan</p>}
              <p className="mt-4 text-[10px] font-bold tracking-[0.08em] text-[#6B7280] dark:text-[#9CA3AF]">SUMBER ASET</p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {assetOptions.map((asset) => {
                  const already = planAllocations[asset.id] || 0;
                  const available = Math.max(0, asset.value - ((totalAllocatedByAsset[asset.id] || 0) - already));
                  return <button key={asset.id} type="button" onClick={() => setSelectedAsset(asset.id)} className={selectedAsset === asset.id ? "min-h-11 shrink-0 rounded-full border border-[#0E9F6E] bg-[#E7F7F0] px-3 text-[11px] font-semibold text-[#0B6B47] dark:border-[#34D399] dark:bg-[#17352A] dark:text-[#A7F3D0]" : "min-h-11 shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3 text-[11px] font-semibold text-[#374151] dark:border-[#24272F] dark:bg-[#1D2027] dark:text-[#D1D5DB]"}>{asset.name}<span className="ml-1 font-normal opacity-70">{formatGoalCurrency(available)}</span></button>;
                })}
              </div>
              {Object.entries(planAllocations).length > 0 && <div className="mt-3 space-y-2">
                {Object.entries(planAllocations).map(([assetId, value]) => {
                  const asset = assetOptions.find((item) => item.id === assetId);
                  return <div key={assetId} className="flex min-h-11 items-center justify-between gap-2 rounded-[14px] border border-[#E5E7EB] px-3 dark:border-[#24272F]"><span className="min-w-0 truncate text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">{asset?.name || assetId}</span><span className="num tabular-nums text-[12px] font-semibold">{formatGoalCurrency(value)}</span><button onClick={() => removeAllocation(plan.id, assetId)} aria-label="Hapus alokasi aset" className="flex h-10 w-10 items-center justify-center text-[#9CA3AF]"><X size={15}/></button></div>;
                })}
              </div>}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button onClick={() => navigate("/calculator/" + getCalculatorRouteId(plan))} className="h-[46px] rounded-[14px] border border-[#374151] bg-transparent px-3 text-[12.5px] font-bold text-[#374151] dark:border-[#B9BDC3] dark:text-[#D5D8DC]">Buka simulasi</button>
                <button onClick={() => saveAllocation(plan.id)} disabled={!selectedAsset || !Number(amount)} className="h-[46px] rounded-[14px] bg-gradient-to-br from-[#374151] to-[#111827] px-3 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:from-[#FFFFFF] dark:to-[#C9CED8] dark:text-[#111827]">Alokasikan</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
