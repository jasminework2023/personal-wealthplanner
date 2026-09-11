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
}

const CURRENT_MONTH_NAME = new Date().toLocaleString("en-US", { month: "long" });

export function useFinanceData(): FinanceData {
  const [state, setState] = useState<RawState>({
    loading: true,
    error: null,
    isRealData: false,
    username: null,
    month: CURRENT_MONTH_NAME,
    transactions: mockTransactions,
    budgetByCategory: mockAllocationMap(),
    assets: mockAssetData(),
  });

  useEffect(() => {
    captureTokenFromUrl();
    const token = getStoredToken();

    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    fetch(`${import.meta.env.BASE_URL}api/dashboard?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setState((s) => ({ ...s, loading: false, error: data.error || "Gagal memuat data" }));
        } else {
          setState({
            loading: false,
            error: null,
            isRealData: true,
            username: data.username,
            month: data.month || CURRENT_MONTH_NAME,
            transactions: data.transactions || [],
            budgetByCategory: data.budgetByCategory || {},
            assets: data.assets || mockAssetData(),
          });
        }
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false, error: "Gagal memuat data" }));
      });
  }, []);

  const totalIncome = state.transactions.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = state.transactions.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
  const totalSaving = state.transactions.filter((t) => t.type === "Saving").reduce((s, t) => s + t.amount, 0);

  function byCategory(type: Transaction["type"]) {
    const map = new Map<string, number>();
    for (const t of state.transactions) {
      if (t.type !== type) continue;
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    }
    for (const category of Object.keys(state.budgetByCategory)) {
      if (!map.has(category) && state.budgetByCategory[category] > 0) {
        map.set(category, 0);
      }
    }
    return Array.from(map.entries()).map(([category, realization]) => ({
      category,
      allocation: state.budgetByCategory[category] || 0,
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
