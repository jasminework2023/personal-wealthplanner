import { useEffect, useState } from "react";
import type { Transaction } from "../data/types";
import { transactions as mockTransactions } from "../data/transactions";
import { incomeCategories, expenseCategories, savingCategories } from "../data/budgets";
import { assetGroups, totalAssets as mockTotalAssets, assetTarget, stocksID as mockStocksID, stocksUS as mockStocksUS } from "../data/assets";

const TOKEN_KEY = "wealthplanner_token";
const API_BASE = "/api";

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
  year: number;
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
  year: number;
  transactions: Transaction[];
  budgetByCategory: Record<string, number>;
  assets: AssetData;
  setup: Record<"income" | "expense" | "saving" | "bank", SetupCategory[]>;
}

const CURRENT_MONTH_NAME = new Date().toLocaleString("en-US", { month: "long" });

export function useFinanceData(monthOverride?: string, includeAllMonths = false, yearOverride?: number): FinanceData {
  const initialMonth = monthOverride || CURRENT_MONTH_NAME;
  const currentYear = new Date().getFullYear();
  const initialYear = yearOverride || currentYear;
  const [state, setState] = useState<RawState>({
    loading: true,
    error: null,
    isRealData: false,
    username: null,
    month: initialMonth,
    year: initialYear,
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
      const requestedYear = yearOverride || currentYear;

      if (!token) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          month: requestedMonth,
          year: requestedYear,
          transactions: mockTransactions.filter((t) => t.month.toLowerCase() === requestedMonth.toLowerCase()),
        }));
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null, month: requestedMonth }));
      Promise.all([
        fetch(`${API_BASE}/dashboard?token=${encodeURIComponent(token)}&month=${encodeURIComponent(requestedMonth)}&year=${requestedYear}${includeAllMonths ? "&allYears=1" : ""}`),
        fetch(`${API_BASE}/setup?token=${encodeURIComponent(token)}`),
      ])
        .then(async ([dashboardResponse, setupResponse]) => ({
          dashboard: { ok: dashboardResponse.ok, data: await dashboardResponse.json() },
          setup: { ok: setupResponse.ok, data: await setupResponse.json() },
        }))
        .then(({ dashboard, setup }) => {
          const { ok, data } = dashboard;
          if (cancelled) return;
          const cacheKey = `wealthplanner_finance_cache_${token}`;
          if (!ok) {
            try {
              const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
              if (cached?.dashboard) {
                const cachedData = cached.dashboard;
                setState((s) => ({
                  ...s,
                  loading: false,
                  error: `Data terakhir tersimpan digunakan — ${data.error || "server sedang tidak dapat diakses"}`,
                  isRealData: true,
                  username: cachedData.username || s.username,
                  month: cachedData.month || requestedMonth,
                  year: cachedData.year || requestedYear,
                  transactions: includeAllMonths ? (cachedData.transactions || []) : (cachedData.transactions || []).filter((t: Transaction) => String(t.month || "").toLowerCase() === String(cachedData.month || requestedMonth).toLowerCase()),
                  budgetByCategory: cachedData.budgetByCategory || {},
                  assets: cachedData.assets || s.assets,
                  setup: cached.setup?.sections || s.setup,
                }));
                return;
              }
            } catch {}
            setState((s) => ({ ...s, loading: false, error: data.error || "Gagal memuat data" }));
          } else {
            try { localStorage.setItem(cacheKey, JSON.stringify({ dashboard: data, setup: setup.ok ? setup.data : null, savedAt: Date.now() })); } catch {}
            setState((s) => ({
              ...s,
              loading: false,
              error: null,
              isRealData: true,
              username: data.username,
              month: data.month || requestedMonth,
              year: data.year || requestedYear,
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
    const handleRefresh = () => loadData();
    window.addEventListener("wealthplanner:transaction-added", handleRefresh);
    window.addEventListener("wealthplanner:setup-changed", handleRefresh);
    window.addEventListener("wealthplanner:budget-updated", handleRefresh);
    window.addEventListener("wealthplanner:asset-updated", handleRefresh);
    window.addEventListener("visibilitychange", handleRefresh);
    const interval = window.setInterval(loadData, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("wealthplanner:transaction-added", handleRefresh);
      window.removeEventListener("wealthplanner:setup-changed", handleRefresh);
      window.removeEventListener("wealthplanner:budget-updated", handleRefresh);
      window.removeEventListener("wealthplanner:asset-updated", handleRefresh);
      window.removeEventListener("visibilitychange", handleRefresh);
    };
  }, [monthOverride, includeAllMonths, yearOverride]);

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
    const configured = state.setup[setupKey] || [];
    const activeSetup = configured.filter((item) => item.active && item.name.trim());

    for (const t of state.transactions) {
      if (t.type !== type) continue;
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    }

    // Setup is the source of truth for which categories are active. Include
    // custom categories too, not only the original built-in category list.
    for (const item of activeSetup) {
      if (!map.has(item.name)) map.set(item.name, 0);
    }

    const fallbackAllocation = new Map(categorySource.map((c) => [c.category.toLowerCase(), c.allocation]));
    return Array.from(map.entries()).map(([category, realization]) => ({
      category,
      allocation: state.budgetByCategory[category] ?? fallbackAllocation.get(category.toLowerCase()) ?? 0,
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
