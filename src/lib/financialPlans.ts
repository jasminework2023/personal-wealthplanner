export type FinancialPlanType =
  | "cashflow"
  | "home"
  | "education"
  | "retirement"
  | "hajj"
  | "investment"
  | "income_protection"
  | "inheritance";

export interface FinancialPlan {
  id: string;
  calculatorId: string;
  type: FinancialPlanType;
  name: string;
  targetAmount?: number;
  obligationAmount?: number;
  monthlyAmount?: number;
  timeframe?: number;
  targetYear?: number;
  preparedAssets?: number;
  existingProtection?: number;
  income?: number;
  expense?: number;
  createdAt: number;
}

const KEY = "wealthplanner_financial_plans_v1";

export function loadFinancialPlans(): FinancialPlan[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFinancialPlan(plan: Omit<FinancialPlan, "id" | "createdAt"> & { id?: string }) {
  const current = loadFinancialPlans();
  const next: FinancialPlan = {
    ...plan,
    id: plan.id || `${plan.calculatorId}-${Date.now()}`,
    createdAt: Date.now(),
  };
  const updated = [next, ...current.filter((p) => p.calculatorId !== next.calculatorId)];
  localStorage.setItem(KEY, JSON.stringify(updated));
  return next;
}

export function removeFinancialPlan(id: string) {
  localStorage.setItem(KEY, JSON.stringify(loadFinancialPlans().filter((p) => p.id !== id)));
}

export function getPlanTypeLabel(type: FinancialPlanType) {
  const labels: Record<FinancialPlanType, string> = {
    cashflow: "Cashflow & Kebutuhan Keluarga",
    home: "KPR & Rumah",
    education: "Dana Pendidikan Anak",
    retirement: "Dana Pensiun",
    hajj: "Dana Pelunasan Haji",
    investment: "Aset & Investasi",
    income_protection: "Proteksi Penghasilan",
    inheritance: "Warisan",
  };
  return labels[type];
}
