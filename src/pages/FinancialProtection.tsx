import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  GraduationCap,
  HeartPulse,
  Home as HomeIcon,
  Info,
  PiggyBank,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { Card } from "../components/Card";
import { formatCompact, formatRupiah, formatPercent } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";

const STORAGE_KEY = "wealthplanner_protection_v1";

type ProtectionType = "life" | "critical" | "health" | "accident";

interface ExistingPolicy {
  id: string;
  type: ProtectionType;
  name: string;
  sumAssured: number;
}

interface ProtectionState {
  familyYears: number;
  education: number;
  retirement: number;
  hajj: number;
  mortgage: number;
  otherDebt: number;
  usableAssets: number | null;
  policies: ExistingPolicy[];
  selectedGoals: string[];
}

const defaultState: ProtectionState = {
  familyYears: 5,
  education: 0,
  retirement: 0,
  hajj: 0,
  mortgage: 0,
  otherDebt: 0,
  usableAssets: null,
  policies: [],
  selectedGoals: ["family"],
};

const goalOptions = [
  { id: "family", label: "Kebutuhan Keluarga", desc: "Biaya hidup tetap berjalan", icon: Users },
  { id: "education", label: "Dana Pendidikan", desc: "Pendidikan anak tetap aman", icon: GraduationCap },
  { id: "mortgage", label: "KPR & Utang", desc: "Kewajiban tidak membebani keluarga", icon: HomeIcon },
  { id: "retirement", label: "Dana Pensiun", desc: "Target pensiun tetap berjalan", icon: PiggyBank },
  { id: "hajj", label: "Dana Haji / Umrah", desc: "Tujuan ibadah tetap terjaga", icon: Shield },
  { id: "health", label: "Kesehatan", desc: "Risiko biaya kesehatan", icon: HeartPulse },
];

const policyTypes: { value: ProtectionType; label: string; helper: string }[] = [
  { value: "life", label: "Asuransi Jiwa", helper: "Mengurangi kebutuhan uang pertanggungan jiwa" },
  { value: "critical", label: "Critical Illness", helper: "Dihitung terpisah dari kebutuhan jiwa" },
  { value: "health", label: "Asuransi Kesehatan", helper: "Tidak mengurangi UP jiwa" },
  { value: "accident", label: "Personal Accident", helper: "Dihitung terpisah dari kebutuhan jiwa" },
];

function loadState(): ProtectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function saveState(state: ProtectionState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function rupiahInputValue(value: number) {
  return value ? value.toLocaleString("id-ID") : "";
}

function parseRupiah(value: string) {
  return Number(value.replace(/[^0-9]/g, "")) || 0;
}

function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-charcoal/45">Rp</span>
      <input
        inputMode="numeric"
        value={rupiahInputValue(value)}
        placeholder={placeholder}
        onChange={(e) => onChange(parseRupiah(e.target.value))}
        className="w-full rounded-lg border border-charcoal/12 bg-white py-2.5 pl-9 pr-3 text-[14px] outline-none transition focus:border-forest-400 focus:ring-2 focus:ring-forest-50"
      />
    </div>
  );
}

function GoalCard({
  goal,
  selected,
  onToggle,
}: {
  goal: (typeof goalOptions)[number];
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = goal.icon;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left rounded-xl border p-4 transition-all ${
        selected
          ? "border-forest-400 bg-forest-50 shadow-sm"
          : "border-charcoal/10 bg-white hover:border-forest-100 hover:bg-forest-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? "bg-white text-forest-700" : "bg-charcoal/5 text-charcoal/55"}`}>
          <Icon size={18} strokeWidth={1.9} />
        </span>
        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-forest-600 bg-forest-600 text-white" : "border-charcoal/15 text-transparent"}`}>
          <Check size={12} strokeWidth={3} />
        </span>
      </div>
      <p className="mt-3 text-[14px] font-semibold text-forest-900">{goal.label}</p>
      <p className="mt-0.5 text-[12px] leading-5 text-charcoal/55">{goal.desc}</p>
    </button>
  );
}

export function FinancialProtection() {
  const { totalIncome, totalExpense, assets, loading } = useFinanceData();
  const [state, setState] = useState<ProtectionState>(() => loadState());
  const [showPolicies, setShowPolicies] = useState(state.policies.length > 0);
  
  const monthlyExpense = totalExpense;
  const annualExpense = monthlyExpense * 12;
  const annualIncome = totalIncome * 12;
  const defaultUsableAssets = assets.liquidAssets.reduce((sum, item) => sum + item.value, 0);
  const usableAssets = state.usableAssets ?? defaultUsableAssets;

  const lifePolicies = state.policies.filter((p) => p.type === "life");
  const existingLifeCoverage = lifePolicies.reduce((sum, p) => sum + p.sumAssured, 0);
  const existingOtherCoverage = state.policies.filter((p) => p.type !== "life").reduce((sum, p) => sum + p.sumAssured, 0);

  const familyNeed = state.selectedGoals.includes("family") ? annualExpense * state.familyYears : 0;
  const educationNeed = state.selectedGoals.includes("education") ? state.education : 0;
  const retirementNeed = state.selectedGoals.includes("retirement") ? state.retirement : 0;
  const hajjNeed = state.selectedGoals.includes("hajj") ? state.hajj : 0;
  const mortgageNeed = state.selectedGoals.includes("mortgage") ? state.mortgage : 0;
  const otherDebtNeed = state.selectedGoals.includes("mortgage") ? state.otherDebt : 0;
  const grossNeed = familyNeed + educationNeed + retirementNeed + hajjNeed + mortgageNeed + otherDebtNeed;
  const netNeed = Math.max(grossNeed - usableAssets, 0);
  const protectionGap = Math.max(netNeed - existingLifeCoverage, 0);
  const coveragePercent = netNeed > 0 ? Math.min((existingLifeCoverage / netNeed) * 100, 100) : 100;
  const score = Math.round(coveragePercent);

  const recommendedLow = Math.round(protectionGap * 0.85 / 50_000_000) * 50_000_000;
  const recommendedHigh = Math.ceil(protectionGap * 1.1 / 50_000_000) * 50_000_000;
  const monthlyPremiumLow = Math.round(Math.max(recommendedLow, 0) * 0.002 / 50_000) * 50_000;
  const monthlyPremiumHigh = Math.round(Math.max(recommendedHigh, 0) * 0.005 / 50_000) * 50_000;

  const selectedGoalLabels = useMemo(
    () => goalOptions.filter((g) => state.selectedGoals.includes(g.id)).map((g) => g.label),
    [state.selectedGoals],
  );

  function update(next: Partial<ProtectionState>) {
    setState((current) => {
      const updated = { ...current, ...next };
      saveState(updated);
      return updated;
    });
  }

  function addPolicy() {
    const newPolicy: ExistingPolicy = {
      id: crypto.randomUUID(),
      type: "life",
      name: "Asuransi Jiwa",
      sumAssured: 0,
    };
    update({ policies: [...state.policies, newPolicy] });
    setShowPolicies(true);
  }

  function updatePolicy(id: string, patch: Partial<ExistingPolicy>) {
    update({ policies: state.policies.map((policy) => (policy.id === id ? { ...policy, ...patch } : policy)) });
  }

  function removePolicy(id: string) {
    update({ policies: state.policies.filter((policy) => policy.id !== id) });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-forest-900">Proteksi Finansial</h1>
        <p className="mt-0.5 text-[14px] text-charcoal/60">
          Temukan kebutuhan perlindungan yang sesuai dengan kondisi keuanganmu.
        </p>
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-white to-forest-50/50">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-forest-50 px-3 py-1.5 text-[12px] font-medium text-forest-700">
              <Shield size={14} /> Protection Planner
            </div>
            <h2 className="max-w-xl text-[24px] font-semibold tracking-tight text-forest-900">
              Temukan Kebutuhan Proteksimu
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-charcoal/60">
              Data cashflow yang sudah ada di dashboard dipakai sebagai dasar perhitungan. Kamu hanya perlu melengkapi tujuan dan proteksi yang sudah dimiliki.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[12px] text-charcoal/60">
              {selectedGoalLabels.slice(0, 4).map((label) => (
                <span key={label} className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5">{label}</span>
              ))}
              {selectedGoalLabels.length > 4 && <span className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5">+{selectedGoalLabels.length - 4} lainnya</span>}
            </div>
          </div>
          <div className="rounded-xl border border-forest-100 bg-white p-5 shadow-sm">
            <p className="text-[12px] text-charcoal/50">Kebutuhan proteksi setelah aset</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-forest-900">{formatCompact(netNeed)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-charcoal/8 pt-4">
              <div>
                <p className="text-[11px] text-charcoal/50">Pengeluaran tahunan</p>
                <p className="mt-0.5 text-[14px] font-semibold">{formatCompact(annualExpense)}</p>
              </div>
              <div>
                <p className="text-[11px] text-charcoal/50">Penghasilan tahunan</p>
                <p className="mt-0.5 text-[14px] font-semibold">{formatCompact(annualIncome)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-[12px] text-charcoal/50">Pengeluaran Tahunan</p>
          <p className="mt-1 text-[19px] font-semibold text-forest-900">{formatRupiah(annualExpense)}</p>
          <p className="mt-1 text-[11px] text-charcoal/45">Otomatis dari cashflow</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] text-charcoal/50">Kebutuhan Bruto</p>
          <p className="mt-1 text-[19px] font-semibold text-forest-900">{formatCompact(grossNeed)}</p>
          <p className="mt-1 text-[11px] text-charcoal/45">Sebelum pengurang</p>
        </Card>
        <Card className="p-4">
          <p className="text-[12px] text-charcoal/50">Proteksi Jiwa Saat Ini</p>
          <p className="mt-1 text-[19px] font-semibold text-forest-900">{formatCompact(existingLifeCoverage)}</p>
          <p className="mt-1 text-[11px] text-charcoal/45">Dari polis yang kamu input</p>
        </Card>
        <Card className={`${protectionGap > 0 ? "border-rose-100 bg-rose-50/40" : "border-forest-100 bg-forest-50/50"} p-4`}>
          <p className="text-[12px] text-charcoal/50">Protection Gap</p>
          <p className={`mt-1 text-[19px] font-semibold ${protectionGap > 0 ? "text-rose-700" : "text-forest-800"}`}>{formatCompact(protectionGap)}</p>
          <p className="mt-1 text-[11px] text-charcoal/45">Yang masih perlu dilengkapi</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4">
          <h3 className="text-[16px] font-semibold text-forest-900">1. Apa yang ingin kamu lindungi?</h3>
          <p className="mt-0.5 text-[13px] text-charcoal/55">Pilih semua yang relevan. Pilihan ini menentukan komponen kebutuhan proteksimu.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goalOptions.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              selected={state.selectedGoals.includes(goal.id)}
              onToggle={() => {
                const selected = state.selectedGoals.includes(goal.id);
                update({ selectedGoals: selected ? state.selectedGoals.filter((id) => id !== goal.id) : [...state.selectedGoals, goal.id] });
              }}
            />
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-5">
          <h3 className="text-[16px] font-semibold text-forest-900">2. Lengkapi kebutuhan yang belum ada di Cashflow</h3>
          <p className="mt-0.5 text-[13px] text-charcoal/55">Nilai ini bisa kamu ubah kapan saja. Tidak perlu mengisi pengeluaran bulanan lagi.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className="text-[13px] font-medium text-charcoal/75">Berapa lama biaya hidup keluarga perlu disiapkan?</label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {[3, 5, 10, 15, 20].map((years) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => update({ familyYears: years })}
                  className={`rounded-lg border px-4 py-2 text-[13px] font-medium ${state.familyYears === years ? "border-forest-600 bg-forest-600 text-white" : "border-charcoal/10 bg-white text-charcoal/65 hover:border-forest-100"}`}
                >
                  {years} tahun
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-charcoal/45">Ini adalah durasi kebutuhan dana keluarga, bukan otomatis masa polis. Dasar perhitungan: pengeluaran tahunan × durasi.</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-charcoal/75">Aset yang siap digunakan sebagai pengurang</label>
            <div className="mt-2"><CurrencyInput value={usableAssets} onChange={(value) => update({ usableAssets: value })} /></div>
            <p className="mt-2 text-[12px] text-charcoal/45">Default memakai aset likuid dari dashboard. Ubah jika tidak semuanya siap dipakai.</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-charcoal/75">Dana Pendidikan</label>
            <div className="mt-2"><CurrencyInput value={state.education} onChange={(value) => update({ education: value })} /></div>
          </div>
          <div>
            <label className="text-[13px] font-medium text-charcoal/75">Dana Pensiun yang ingin dilindungi</label>
            <div className="mt-2"><CurrencyInput value={state.retirement} onChange={(value) => update({ retirement: value })} /></div>
          </div>
          <div>
            <label className="text-[13px] font-medium text-charcoal/75">Dana Haji / Umrah</label>
            <div className="mt-2"><CurrencyInput value={state.hajj} onChange={(value) => update({ hajj: value })} /></div>
          </div>
          <div>
            <label className="text-[13px] font-medium text-charcoal/75">KPR / Utang yang perlu dilindungi</label>
            <div className="mt-2"><CurrencyInput value={state.mortgage} onChange={(value) => update({ mortgage: value })} /></div>
          </div>
          <div>
            <label className="text-[13px] font-medium text-charcoal/75">Utang / kewajiban lainnya</label>
            <div className="mt-2"><CurrencyInput value={state.otherDebt} onChange={(value) => update({ otherDebt: value })} /></div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-forest-900">3. Sudah punya asuransi?</h3>
            <p className="mt-0.5 text-[13px] text-charcoal/55">Masukkan UP dari polis yang sudah kamu miliki. Hanya asuransi jiwa yang menjadi pengurang kebutuhan UP jiwa.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPolicies((value) => !value)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-forest-100 bg-forest-50 px-3.5 py-2 text-[13px] font-medium text-forest-700 hover:bg-forest-100"
          >
            {showPolicies ? "Sembunyikan" : "Ya, saya punya"}
            <ChevronDown size={15} className={`transition-transform ${showPolicies ? "rotate-180" : ""}`} />
          </button>
        </div>

        {showPolicies && (
          <div className="mt-5 space-y-3">
            {state.policies.map((policy) => (
              <div key={policy.id} className="grid gap-3 rounded-xl border border-charcoal/10 bg-cream/50 p-4 lg:grid-cols-[1.1fr_1.5fr_1.2fr_auto] lg:items-end">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-charcoal/45">Jenis proteksi</label>
                  <select
                    value={policy.type}
                    onChange={(e) => {
                      const type = e.target.value as ProtectionType;
                      const label = policyTypes.find((item) => item.value === type)?.label || "Proteksi";
                      updatePolicy(policy.id, { type, name: label });
                    }}
                    className="mt-1.5 w-full rounded-lg border border-charcoal/10 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-forest-400"
                  >
                    {policyTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-charcoal/45">Nama polis</label>
                  <input
                    value={policy.name}
                    onChange={(e) => updatePolicy(policy.id, { name: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-charcoal/10 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-forest-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-charcoal/45">Uang pertanggungan</label>
                  <div className="mt-1.5"><CurrencyInput value={policy.sumAssured} onChange={(value) => updatePolicy(policy.id, { sumAssured: value })} /></div>
                </div>
                <button type="button" onClick={() => removePolicy(policy.id)} className="flex h-10 items-center justify-center rounded-lg border border-rose-100 px-3 text-rose-600 hover:bg-rose-50" title="Hapus polis">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addPolicy} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-forest-100 px-3.5 py-2.5 text-[13px] font-medium text-forest-700 hover:bg-forest-50">
              <Plus size={15} /> Tambah polis
            </button>
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <div className="rounded-lg bg-forest-50 p-3">
                <p className="text-[11px] text-charcoal/50">Total UP Jiwa</p>
                <p className="mt-0.5 text-[16px] font-semibold text-forest-800">{formatRupiah(existingLifeCoverage)}</p>
              </div>
              <div className="rounded-lg bg-charcoal/5 p-3">
                <p className="text-[11px] text-charcoal/50">Proteksi lain (tidak dikurangkan dari UP jiwa)</p>
                <p className="mt-0.5 text-[16px] font-semibold text-charcoal/75">{formatRupiah(existingOtherCoverage)}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="border-forest-100 bg-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-700"><Shield size={18} /></span>
              <div>
                <p className="text-[12px] text-charcoal/50">Protection Score</p>
                <h3 className="text-[20px] font-semibold text-forest-900">{loading ? "—" : `${score} / 100`}</h3>
              </div>
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-charcoal/8">
              <div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${coveragePercent}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-charcoal/55">
              {protectionGap > 0 ? `Proteksi jiwa yang tersedia menutup ${formatPercent(coveragePercent)} dari kebutuhan setelah pengurang aset.` : "Kebutuhan proteksi jiwa saat ini sudah tertutup oleh aset dan proteksi yang dimiliki."}
            </p>
          </div>

          <div className="min-w-[280px] rounded-xl border border-forest-100 bg-forest-50/60 p-5">
            <p className="text-[12px] text-charcoal/50">Kisaran Uang Pertanggungan Tambahan</p>
            <p className="mt-1 text-[25px] font-semibold tracking-tight text-forest-900">{protectionGap > 0 ? `${formatCompact(recommendedLow)} – ${formatCompact(recommendedHigh)}` : "Tidak ada gap"}</p>
            <div className="mt-4 border-t border-forest-100 pt-3">
              <p className="text-[11px] text-charcoal/50">Kisaran premi indikatif / bulan</p>
              <p className="mt-0.5 text-[16px] font-semibold text-forest-800">{protectionGap > 0 ? `${formatRupiah(monthlyPremiumLow)} – ${formatRupiah(monthlyPremiumHigh)}` : "—"}</p>
            </div>
            <a
              href="https://gri.my.id/f1/GJ5115"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-rose-700"
            >
              Konsultasi dengan LifePlanner <ArrowRight size={15} />
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t border-charcoal/8 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Kebutuhan keluarga", familyNeed],
            ["Tujuan finansial", educationNeed + retirementNeed + hajjNeed],
            ["KPR & utang", mortgageNeed + otherDebtNeed],
            ["Aset sebagai pengurang", -usableAssets],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="text-[11px] text-charcoal/50">{label}</p>
              <p className={`mt-0.5 text-[14px] font-semibold ${Number(value) < 0 ? "text-forest-700" : "text-charcoal/80"}`}>{formatRupiah(Number(value))}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-lg bg-charcoal/5 p-3 text-[11px] leading-5 text-charcoal/55">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>Ini adalah estimasi perencanaan, bukan penawaran produk asuransi. Kisaran premi aktual dipengaruhi usia, kesehatan, jenis produk, masa perlindungan, manfaat, dan underwriting.</p>
        </div>
      </Card>

      <Card className="border-rose-100 bg-gradient-to-r from-rose-50/70 to-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[12px] font-medium text-rose-700">Masih ada gap proteksi?</p>
            <h3 className="mt-1 text-[18px] font-semibold text-forest-900">Jangan tebak-tebak kebutuhan asuransimu.</h3>
            <p className="mt-1 text-[13px] leading-6 text-charcoal/55">
              Kamu punya estimasi kebutuhan tambahan <span className="font-semibold text-forest-800">{formatCompact(protectionGap)}</span>. Konsultasikan hasil ini dengan LifePlanner untuk membahas perlindungan dan mendapatkan ilustrasi premi yang sesuai kondisi keuanganmu.
            </p>
          </div>
          <a
            href="https://gri.my.id/f1/GJ5115"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-3 text-[13px] font-medium text-white shadow-sm transition hover:bg-rose-700"
          >
            Konsultasi dengan LifePlanner <ArrowRight size={15} />
          </a>
        </div>
      </Card>
    </div>
  );
}
