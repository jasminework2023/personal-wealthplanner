import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Target, Trash2, Pencil, Check, X, Wallet, Plus, ChevronDown } from "lucide-react";
import { Card } from "../components/Card";
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

export function Goals() {
  const navigate = useNavigate();
  const { assets } = useFinanceData();
  const [plans, setPlans] = useState(() => {
    const loaded = loadFinancialPlans();
    try {
      const order = JSON.parse(localStorage.getItem("wealthplanner_goal_order_v1") || "[]") as string[];
      return [...loaded].sort((a, b) => {
        const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
        return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
      });
    } catch { return loaded; }
  });
  const [settings, setSettings] = useState<GoalSettings>(() => loadGoalSettings());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [allocatingId, setAllocatingId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalType, setNewGoalType] = useState<FinancialPlanType>("cashflow");
  const [draggedGoalId, setDraggedGoalId] = useState<string | null>(null);

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

  function addGoal() {
    const name = newGoalName.trim();
    if (!name) return;
    saveFinancialPlan({
      calculatorId: "manual-goal-" + Date.now(),
      type: newGoalType,
      name,
      targetAmount: Math.max(0, Number(newGoalTarget) || 0),
    });
    const next = loadFinancialPlans();
    setPlans(next);
    localStorage.setItem("wealthplanner_goal_order_v1", JSON.stringify(next.map((plan) => plan.id)));
    setNewGoalName("");
    setNewGoalTarget("");
    setNewGoalType("cashflow");
    setIsAddingGoal(false);
  }

  function reorderGoal(targetId: string) {
    if (!draggedGoalId || draggedGoalId === targetId) return;
    const next = [...plans];
    const from = next.findIndex((plan) => plan.id === draggedGoalId);
    const to = next.findIndex((plan) => plan.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPlans(next);
    localStorage.setItem("wealthplanner_goal_order_v1", JSON.stringify(next.map((plan) => plan.id)));
    setDraggedGoalId(null);
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
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate("/")} aria-label="Kembali ke Home" className="mt-1 rounded-xl border border-rose-100 bg-white p-2 text-forest-700"><ArrowLeft size={17}/></button>
        <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-tight text-forest-900">Goals & Rencana Keuangan</h1><p className="mt-1 text-[13px] leading-5 text-charcoal/55">Hubungkan tujuan keuangan dengan aset yang memang kamu siapkan untuk mencapainya.</p></div>
        <button type="button" onClick={() => setIsAddingGoal((open) => !open)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-forest-700 px-3 py-2.5 text-[12px] font-semibold text-white"><Plus size={15}/> Tambah Goal</button>
      </div>

      {isAddingGoal && <Card className="border border-forest-100">
        <h2 className="text-[14px] font-semibold text-forest-900">Buat goal baru</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} placeholder="Nama goal, mis. Dana menikah" className="min-w-0 rounded-xl border border-rose-100 px-3 py-2 text-[12px]" aria-label="Nama goal" />
          <input type="number" min="0" inputMode="numeric" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} placeholder="Target nominal (Rp)" className="min-w-0 rounded-xl border border-rose-100 px-3 py-2 text-[12px]" aria-label="Target nominal" />
          <select value={newGoalType} onChange={(e) => setNewGoalType(e.target.value as FinancialPlanType)} className="min-w-0 rounded-xl border border-rose-100 bg-white px-3 py-2 text-[12px]" aria-label="Jenis goal">
            <option value="cashflow">Cashflow & kebutuhan keluarga</option><option value="home">KPR & rumah</option><option value="education">Dana pendidikan</option><option value="retirement">Dana pensiun</option><option value="hajj">Dana haji</option><option value="investment">Aset & investasi</option><option value="income_protection">Proteksi penghasilan</option><option value="inheritance">Warisan</option>
          </select>
        </div>
        <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setIsAddingGoal(false)} className="rounded-xl border border-rose-100 px-3 py-2 text-[12px]">Batal</button><button type="button" onClick={addGoal} disabled={!newGoalName.trim()} className="rounded-xl bg-forest-700 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-40">Simpan Goal</button></div>
      </Card>}

      {plans.length ? <div className="grid gap-3 sm:grid-cols-2">{plans.map((plan) => {
        const target = getPlanTarget(plan);
        const planAllocations = settings.allocations[plan.id] || {};
        const allocated = Object.values(planAllocations).reduce((sum, value) => sum + value, 0);
        const progress = target > 0 ? Math.min(100, allocated / target * 100) : 0;
        return (
          <Card key={plan.id} className={"border border-rose-100 " + (draggedGoalId === plan.id ? "opacity-60" : "")}>
            <div draggable onDragStart={() => setDraggedGoalId(plan.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderGoal(plan.id)} onDragEnd={() => setDraggedGoalId(null)} className="mb-2 flex cursor-grab items-center gap-1 text-[10px] text-charcoal/40 active:cursor-grabbing"><span aria-hidden="true">⠿</span> Geser untuk mengurutkan</div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-forest-700"><Target size={20}/></span>
                <div className="min-w-0 flex-1">
                  {editingId === plan.id ? <div className="flex items-center gap-1"><input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveName(plan.id); if (e.key === "Escape") setEditingId(null); }} className="w-full min-w-0 rounded-lg border border-forest-200 px-2 py-1 text-[13px] text-forest-900 outline-none focus:ring-2 focus:ring-forest-100" aria-label="Nama goal baru"/><button onClick={() => saveName(plan.id)} aria-label="Simpan nama" className="rounded p-1 text-forest-700"><Check size={16}/></button><button onClick={() => setEditingId(null)} aria-label="Batal edit nama" className="rounded p-1 text-charcoal/50"><X size={16}/></button></div> : <div className="flex items-center gap-1"><h2 className="text-[14px] font-semibold text-forest-900">{settings.names[plan.id] || plan.name}</h2><button onClick={() => startRename(plan.id, plan.name)} aria-label="Ubah nama goal" title="Ubah nama goal" className="rounded p-1 text-charcoal/40 hover:text-forest-700"><Pencil size={13}/></button></div>}
                  <p className="mt-1 text-[11px] text-charcoal/50">{getPlanTypeLabel(plan.type)}</p>
                </div>
              </div>
              <button onClick={() => deletePlan(plan.id)} aria-label={`Hapus ${plan.name}`} className="rounded-lg p-1.5 text-charcoal/35 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15}/></button>
            </div>

            <div className="mt-4 rounded-xl bg-rose-50/60 p-3">
              <p className="text-[11px] text-charcoal/55">Target rencana</p>
              <p className="mt-1 text-[18px] font-semibold text-forest-900">{formatRupiah(target)}</p>
              <div className="mt-3 flex items-center justify-between gap-2"><span className="text-[11px] text-charcoal/55">Aset dialokasikan</span><span className="text-[12px] font-semibold text-forest-800">{formatRupiah(allocated)}{target > 0 ? ` · ${Math.round(progress)}%` : ""}</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: progress + "%" }}/></div>
            </div>

            <div className="mt-3">
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-forest-900"><Wallet size={14}/> Aset untuk tujuan ini</p>
              {Object.entries(planAllocations).length ? <div className="flex flex-col gap-2">{Object.entries(planAllocations).map(([assetId, value]) => {
                const asset = assetOptions.find((item) => item.id === assetId);
                return <div key={assetId} className="flex items-center justify-between gap-2 rounded-xl border border-rose-100 px-3 py-2"><div className="min-w-0"><p className="truncate text-[12px] font-medium text-forest-900">{asset?.name || assetId.split(":").slice(1).join(":")}</p><p className="text-[11px] text-charcoal/55">{formatRupiah(value)}</p></div><button onClick={() => removeAllocation(plan.id, assetId)} className="rounded-lg p-1.5 text-charcoal/40 hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus alokasi aset"><X size={14}/></button></div>;
              })}</div> : <p className="text-[11px] text-charcoal/50">Belum ada aset yang dialokasikan.</p>}
              {allocatingId === plan.id ? <div className="mt-3 flex flex-col gap-2 rounded-xl border border-forest-100 p-3">
                <label className="text-[11px] font-medium text-charcoal/65">Pilih aset</label>
                <div className="relative"><select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} className="w-full appearance-none rounded-xl border border-rose-100 bg-white px-3 py-2 pr-8 text-[12px] text-forest-900"><option value="">Pilih aset...</option>{assetOptions.map((asset) => { const already = planAllocations[asset.id] || 0; const available = Math.max(0, asset.value - ((totalAllocatedByAsset[asset.id] || 0) - already)); return <option key={asset.id} value={asset.id}>{asset.name} · tersedia {formatRupiah(available)}</option>; })}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/40"/></div>
                <label className="text-[11px] font-medium text-charcoal/65">Nominal yang dialokasikan (Rp)</label>
                <input inputMode="numeric" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Contoh: 5000000" className="w-full rounded-xl border border-rose-100 px-3 py-2 text-[12px] text-forest-900 outline-none focus:ring-2 focus:ring-forest-100"/>
                <div className="flex gap-2"><button onClick={() => saveAllocation(plan.id)} className="flex-1 rounded-xl bg-forest-700 px-3 py-2 text-[12px] font-semibold text-white">Simpan alokasi</button><button onClick={() => { setAllocatingId(null); setAmount(""); setSelectedAsset(""); }} className="rounded-xl border border-rose-100 px-3 py-2 text-[12px] text-charcoal/65">Batal</button></div>
              </div> : <button onClick={() => { setAllocatingId(plan.id); setSelectedAsset(""); setAmount(""); }} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-forest-100 px-3 py-2 text-[12px] font-semibold text-forest-700 hover:bg-forest-50"><Plus size={14}/> Alokasikan dana</button>}
            </div>
            {!plan.calculatorId.startsWith("manual-goal-") && <button onClick={() => navigate(`/calculator/${plan.calculatorId}`)} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-forest-100 px-3 py-2 text-[12px] font-semibold text-forest-700 hover:bg-forest-50"><Calculator size={14}/> Buka simulasi</button>}
          </Card>
        );
      })}</div> : <Card className="border border-dashed border-rose-200 bg-rose-50/30 py-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-forest-700"><Target size={23}/></span><h2 className="mt-3 text-[15px] font-semibold text-forest-900">Belum ada goal tersimpan</h2><p className="mx-auto mt-1 max-w-sm text-[12px] leading-5 text-charcoal/55">Mulai dari Calculator, pilih simulasi yang kamu butuhkan, lalu simpan hasilnya sebagai rencana keuangan.</p><button onClick={() => navigate("/calculator")} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-[12px] font-semibold text-white"><Calculator size={15}/> Buka Calculator</button></Card>}
    </div>
  );
}
