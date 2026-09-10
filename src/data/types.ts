export type TransactionType = "Income" | "Expense" | "Saving";

export interface Transaction {
  date: string; // dd/mm/yyyy
  month: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
}

export interface BudgetCategory {
  category: string;
  allocation: number;
  realization: number;
}

export interface AssetItem {
  name: string;
  value: number;
}

export interface AssetGroup {
  group: "Liquid Assets" | "Investment Assets";
  items: AssetItem[];
}

export interface Stock {
  ticker: string;
  market: "ID" | "US";
  currentPrice: number;
  shares: number;
  avgPrice: number;
}

export function budgetStatus(usagePct: number): "Healthy" | "Near Limit" | "Over Budget" {
  if (usagePct > 100) return "Over Budget";
  if (usagePct >= 80) return "Near Limit";
  return "Healthy";
}

export function usagePercentage(realization: number, allocation: number): number {
  if (!allocation) return realization > 0 ? 100 : 0;
  return Math.round((realization / allocation) * 1000) / 10;
}
