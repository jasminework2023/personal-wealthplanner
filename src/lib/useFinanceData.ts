import { useEffect, useState } from "react";
import type { Transaction } from "../data/types";
import { transactions as mockTransactions } from "../data/transactions";

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

// Ambil token dari URL (?token=xxx) sekali di awal, simpan ke localStorage
// biar nggak perlu ada di URL terus-terusan.
function captureTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    setStoredToken(token);
    window.history.replaceState({}, "", window.location.pathname);
  }
}

interface FinanceData {
  loading: boolean;
  error: string | null;
  isRealData: boolean;
  username: string | null;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  totalSaving: number;
  byCategory: (type: Transaction["type"]) => { category: string; realization: number }[];
}

function summarize(transactions: Transaction[], type: Transaction["type"]) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    map.set(t.category, (map.get(t.category) || 0) + t.amount);
  }
  return Array.from(map.entries()).map(([category, realization]) => ({ category, realization }));
}

export function useFinanceData(): FinanceData {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    isRealData: boolean;
    username: string | null;
    transactions: Transaction[];
  }>({ loading: true, error: null, isRealData: false, username: null, transactions: mockTransactions });

  useEffect(() => {
    captureTokenFromUrl();
    const token = getStoredToken();

    if (!token) {
      setState({ loading: false, error: null, isRealData: false, username: null, transactions: mockTransactions });
      return;
    }

    fetch(`${import.meta.env.BASE_URL}api/dashboard?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setState({ loading: false, error: data.error || "Gagal memuat data", isRealData: false, username: null, transactions: mockTransactions });
        } else {
          setState({ loading: false, error: null, isRealData: true, username: data.username, transactions: data.transactions });
        }
      })
      .catch(() => {
        setState({ loading: false, error: "Gagal memuat data", isRealData: false, username: null, transactions: mockTransactions });
      });
  }, []);

  const totalIncome = state.transactions.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = state.transactions.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
  const totalSaving = state.transactions.filter((t) => t.type === "Saving").reduce((s, t) => s + t.amount, 0);

  return {
    ...state,
    totalIncome,
    totalExpense,
    totalSaving,
    byCategory: (type) => summarize(state.transactions, type),
  };
}
