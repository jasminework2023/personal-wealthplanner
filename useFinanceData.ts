import { useCallback, useEffect, useState } from "react";
import type { Transaction, TransactionType } from "../data/types";
import { transactions as mockTransactions } from "../data/transactions";
import { incomeCategories, expenseCategories, savingCategories } from "../data/budgets";
import { assetGroups, totalAssets as mockTotalAssets, assetTarget, stocksID as mockStocksID, stocksUS as mockStocksUS } from "../data/assets";

const TOKEN_KEY = "wealthplanner_token";

export function getStoredToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setStoredToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearStoredToken() { localStorage.removeItem(TOKEN_KEY); }

function captureTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    setStoredToken(token);
    window.history.replaceState({}, "", window.location.pathname);
  }
}

export interface StockItem { ticker: string; currentPrice: number; shares: number; avgPrice: number; value: number; pl: number; }
export interface AssetData {
  totalAssets: number; target: number;
  liquidAssets: { name: string; value: number }[];
  investmentAssets: { name: string; value: number }[];
  stocksID: StockItem[]; stocksUS: StockItem[];
}
export interface DashboardRow { category: string; allocation: number; realization: number; usage: number; }

interface DashboardData {
  year: number; month: string; totalIncome: number; budgetExpense: number; totalSpending: number; totalSaving: number;
  income: DashboardRow[]; saving: DashboardRow[]; expense: DashboardRow[];
}

interface FinanceData {
  loading: boolean; saving: boolean; error: string | null; isRealData: boolean; username: string | null;
  transactions: Transaction[]; totalIncome: number; totalExpense: number; totalSaving: number;
  budgetExpense: number; month: string; year: number; assets: AssetData;
  categories: { income: string[]; expense: string[]; saving: string[] };
  byCategory: (type: TransactionType) => DashboardRow[];
  addTransaction: (t: Transaction) => Promise<void>;
  updateBudget: (category: string, month: string, amount: number) => Promise<void>;
  refresh: () => Promise<void>;
}

function mockAssetData(): AssetData {
  const liquid = assetGroups.find((g) => g.group === "Liquid Assets")?.items ?? [];
  const investment = assetGroups.find((g) => g.group === "Investment Assets")?.items ?? [];
  return { totalAssets: mockTotalAssets, target: assetTarget, liquidAssets: liquid, investmentAssets: investment,
    stocksID: mockStocksID.map((s) => ({ ...s, value: s.currentPrice * s.shares, pl: (s.currentPrice - s.avgPrice) * s.shares })),
    stocksUS: mockStocksUS.map((s) => ({ ...s, value: s.currentPrice * s.shares, pl: (s.currentPrice - s.avgPrice) * s.shares })) };
}
function mockAllocationMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of [...incomeCategories, ...expenseCategories, ...savingCategories]) map[c.category] = c.allocation;
  return map;
}

const mockDashboard: DashboardData = {
  year: new Date().getFullYear(), month: new Date().toLocaleString("en-US", { month: "long" }),
  totalIncome: mockTransactions.filter(t => t.type === "Income").reduce((s,t)=>s+t.amount,0),
  budgetExpense: expenseCategories.reduce((s,c)=>s+c.allocation,0),
  totalSpending: mockTransactions.filter(t => t.type === "Expense").reduce((s,t)=>s+t.amount,0),
  totalSaving: mockTransactions.filter(t => t.type === "Saving").reduce((s,t)=>s+t.amount,0),
  income: incomeCategories.map(c=>({category:c.category,allocation:c.allocation,realization:c.realization,usage:c.allocation?c.realization/c.allocation:0})),
  saving: savingCategories.map(c=>({category:c.category,allocation:c.allocation,realization:c.realization,usage:c.allocation?c.realization/c.allocation:0})),
  expense: expenseCategories.map(c=>({category:c.category,allocation:c.allocation,realization:c.realization,usage:c.allocation?c.realization/c.allocation:0})),
};

export function useFinanceData(): FinanceData {
  const [state, setState] = useState({
    loading: true, saving: false, error: null as string | null, isRealData: false, username: null as string | null,
    transactions: mockTransactions, dashboard: mockDashboard, assets: mockAssetData(),
    categories: { income: incomeCategories.map(c=>c.category), expense: expenseCategories.map(c=>c.category), saving: savingCategories.map(c=>c.category) },
  });

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) { setState(s => ({ ...s, loading: false })); return; }
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}api/dashboard?token=${encodeURIComponent(token)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Gagal memuat data");
      setState({ loading:false, saving:false, error:null, isRealData:true, username:data.username || null,
        transactions:data.transactions || [], dashboard:data.dashboard || mockDashboard, assets:data.assets || mockAssetData(),
        categories:data.categories || state.categories });
    } catch (e) {
      setState(s => ({ ...s, loading:false, error:e instanceof Error ? e.message : "Gagal memuat data" }));
    }
  }, []);

  useEffect(() => { captureTokenFromUrl(); refresh(); }, [refresh]);

  const post = useCallback(async (body: Record<string, unknown>) => {
    const token = getStoredToken();
    if (!token) throw new Error("Dashboard token belum tersedia");
    const r = await fetch(`${import.meta.env.BASE_URL}api/dashboard?token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Gagal menyimpan perubahan");
  }, []);

  const addTransaction = useCallback(async (t: Transaction) => {
    setState(s => ({ ...s, saving:true, error:null }));
    try { await post({ action:"transaction", ...t }); await refresh(); }
    catch (e) { setState(s => ({ ...s, saving:false, error:e instanceof Error ? e.message : "Gagal menyimpan transaksi" })); throw e; }
  }, [post, refresh]);

  const updateBudget = useCallback(async (category: string, month: string, amount: number) => {
    setState(s => ({ ...s, saving:true, error:null }));
    try { await post({ action:"budget", category, month, amount }); await refresh(); }
    catch (e) { setState(s => ({ ...s, saving:false, error:e instanceof Error ? e.message : "Gagal menyimpan budget" })); throw e; }
  }, [post, refresh]);

  function byCategory(type: TransactionType) {
    if (type === "Income") return state.dashboard.income;
    if (type === "Saving") return state.dashboard.saving;
    return state.dashboard.expense;
  }

  return {
    loading:state.loading, saving:state.saving, error:state.error, isRealData:state.isRealData, username:state.username,
    transactions:state.transactions, totalIncome:state.dashboard.totalIncome, totalExpense:state.dashboard.totalSpending,
    totalSaving:state.dashboard.totalSaving, budgetExpense:state.dashboard.budgetExpense, month:state.dashboard.month,
    year:state.dashboard.year, assets:state.assets, categories:state.categories, byCategory, addTransaction, updateBudget, refresh,
  };
}
