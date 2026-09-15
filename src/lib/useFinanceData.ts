import { useEffect, useState } from "react";
import type { Transaction } from "../data/types";
import { transactions as mockTransactions } from "../data/transactions";
import { incomeCategories, expenseCategories, savingCategories } from "../data/budgets";
import { assetGroups, totalAssets as mockTotalAssets, assetTarget, stocksID as mockStocksID, stocksUS as mockStocksUS } from "../data/assets";

const TOKEN_KEY = "wealthplanner_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function captureTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    setStoredToken(token);
    window.history.replaceState({}, "", window.location.pathname);
  }
}

export interface StockItem {
  ticker: string;
  currentPrice: number;
  shares: number;
  avgPrice: number;
  value: number;
  pl: number;
}

export interface AssetData {
  totalAssets: number;
  target: number;
  liquidAssets: { name: string; value: number }[];
  investmentAssets: { name: string; value: number }[];
  stocksID: StockItem[];
  stocksUS: StockItem[];
}

interface SetupCategory { name: string; active: boolean }

interface FinanceData {
  loading: boolean;
  error: string | null;
  isRealData: boolean;
  username: string | null;
  month: string;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  assets: AssetData;
  setup: Record<"income" | "expense" | "saving" | "bank", SetupCategory[]>;
  byCategory: (type: Transaction["type"]) => { category: string; allocation: number; realization: number }[];
}

function mockAssetData(): AssetData {
  const liquid = assetGroups.find((g) => g.group === "Liquid Assets")?.items ?? [];
  const investment = assetGroups.find((g) => g.group === "Investment Assets")?.items ?? [];
  return {
    totalAssets: mockTotalAssets,
    target: assetTarget,
    liquidAssets: liquid,
    investmentAssets: investment,
    stocksID: mockStocksID.map((s) => ({
      ticker: s.ticker,
      currentPrice: s.currentPrice,
      shares: s.shares,
      avgPrice: s.avgPrice,
      value: s.currentPrice * s.shares,
      pl: (s.currentPrice - s.avgPrice) * s.shares,
    })),
    stocksUS: mockStocksUS.map((s) => ({
      ticker: s.ticker,
      currentPrice: s.currentPrice,
      shares: s.shares,
      avgPrice: s.avgPrice,
      value: s.currentPrice * s.shares,
      pl: (s.currentPrice - s.avgPrice) * s.shares,
    })),
  };
}

function mockAllocationMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of [...incomeCategories, ...expenseCategories, ...savingCategories]) {
    map[c.category] = c.allocation;
  }
  return map;
}

interface RawState {
  loading: boolean;
  error: string | null;
  isRealData: boolean;
  username: string | null;
  month: string;
  transactions: Transaction[];
  budgetByCategory: Record<string, number>;
  assets: AssetData;
  setup: Record<"income" | "expense" | "saving" | "bank", SetupCategory[]>;
}

const CURRENT_MONTH_NAME = new Date().toLocaleString("en-US", { month: "long" });

export function useFinanceData(monthOverride?: string, includeAllMonths = false): FinanceData {
  const initialMonth = monthOverride || CURRENT_MONTH_NAME;
  const [state, setState] = useState<RawState>({
    loading: true,
    error: null,
    isRealData: false,
    username: null,
    month: initialMonth,
    transactions: mockTransactions.filter((t) => t.month.toLowerCase() === initialMonth.toLowerCase()),
    budgetByCategory: mockAllocationMap(),
    assets: mockAssetData(),
    setup: {
      income: incomeCategories.map((c) => ({ name: c.category, active: true })),
      expense: expenseCategories.map((c) => ({ name: c.category, active: true })),
      saving: savingCategories.map((c) => ({ name: c.category, active: true })),
      bank: [],
    },
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = () => {
      captureTokenFromUrl();
      const token = getStoredToken();
      const requestedMonth = monthOverride || CURRENT_MONTH_NAME;

      if (!token) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          month: requestedMonth,
          transactions: mockTransactions.filter((t) => t.month.toLowerCase() === requestedMonth.toLowerCase()),
        }));
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null, month: requestedMonth }));
      Promise.all([
        fetch(`${import.meta.env.BASE_URL}api/dashboard?token=${encodeURIComponent(token)}&month=${encodeURIComponent(requestedMonth)}`),
        fetch(`${import.meta.env.BASE_URL}api/setup?token=${encodeURIComponent(token)}`),
      ])
        .then(async ([dashboardResponse, setupResponse]) => ({
          dashboard: { ok: dashboardResponse.ok, data: await dashboardResponse.json() },
          setup: { ok: setupResponse.ok, data: await setupResponse.json() },
        }))
        .then(({ dashboard, setup }) => {
          const { ok, data } = dashboard;
          if (cancelled) return;
          if (!ok) {
            setState((s) => ({ ...s, loading: false, error: data.error || "Gagal memuat data" }));
          } else {
            setState((s) => ({
              ...s,
              loading: false,
              error: null,
              isRealData: true,
              username: data.username,
              month: data.month || requestedMonth,
              transactions: includeAllMonths
                ? (data.transactions || [])
                : (data.transactions || []).filter((t: Transaction) => String(t.month || "").toLowerCase() === String(data.month || requestedMonth).toLowerCase()),
              budgetByCategory: data.budgetByCategory || {},
              assets: data.assets || mockAssetData(),
              setup: setup.ok && setup.data?.sections ? setup.data.sections : s.setup,
            }));
          }
        })
        .catch(() => {
          if (!cancelled) setState((s) => ({ ...s, loading: false, error: "Gagal memuat data" }));
        });
    };

    loadData();
    const handleTransactionAdded = () => loadData();
    window.addEventListener("wealthplanner:transaction-added", handleTransactionAdded);
    return () => {
      cancelled = true;
      window.removeEventListener("wealthplanner:transaction-added", handleTransactionAdded);
    };
  }, [monthOverride, includeAllMonths]);

  const totalIncome = state.transactions.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = state.transactions.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
  const totalSaving = state.transactions.filter((t) => t.type === "Saving").reduce((s, t) => s + t.amount, 0);

  function byCategory(type: Transaction["type"]) {
    const map = new Map<string, number>();
    const categorySource =
      type === "Income" ? incomeCategories :
      type === "Saving" ? savingCategories :
      expenseCategories;
    const setupKey = type === "Income" ? "income" : type === "Saving" ? "saving" : "expense";
    const activeSetup = state.setup[setupKey] || [];
    const activeNames = new Set(activeSetup.filter((item) => item.active).map((item) => item.name.toLowerCase()));

    for (const t of state.transactions) {
      if (t.type !== type) continue;
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    }

    // Only show categories belonging to the selected transaction type.
    // This prevents expense categories (e.g. Food & Groceries) from appearing
    // inside Income or Savings Overview.
    for (const item of categorySource) {
      const category = item.category;
      const allocation = state.budgetByCategory[category] ?? item.allocation ?? 0;
      if (!map.has(category) && allocation > 0) {
        map.set(category, 0);
      }
    }

    return Array.from(map.entries())
      .filter(([category]) => activeNames.size === 0 || activeNames.has(category.toLowerCase()))
      .map(([category, realization]) => ({
        category,
        allocation: state.budgetByCategory[category] ?? categorySource.find((c) => c.category === category)?.allocation ?? 0,
        realization,
      }));
  }

  return {
    ...state,
    totalIncome,
    totalExpense,
    totalSaving,
    byCategory,
  };
}
