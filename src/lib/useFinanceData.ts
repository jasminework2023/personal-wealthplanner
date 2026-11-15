import { useEffect, useState } from "react";
import type { Transaction } from "../data/types";
import { incomeCategories, expenseCategories, savingCategories } from "../data/budgets";
import { assetTarget } from "../data/assets";
import { apiUrl } from "./apiBase";

const TOKEN_KEY = "wealthplanner_token";
const SESSION_TOKEN_KEY = "wealthplanner_session_token";

function getCookieToken(): string | null {
  try {
    const match = document.cookie.match(/(?:^|; )wealthplanner_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function persistToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  try { sessionStorage.setItem(SESSION_TOKEN_KEY, token); } catch {}
  try {
    document.cookie = "wealthplanner_token=" + encodeURIComponent(token) + "; Path=/; Max-Age=2592000; SameSite=Lax";
  } catch {}
}

/**
 * Resolve a dashboard token synchronously.
 * A fresh token in the URL takes precedence over a stale token in localStorage.
 * This also avoids a race where a page action runs before a React effect captures the URL.
 */
export function getStoredToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  const urlToken = (params.get("token") || params.get("ref") || "").trim();
  if (urlToken) {
    persistToken(urlToken);
    return urlToken;
  }
  try {
    const localToken = localStorage.getItem(TOKEN_KEY);
    if (localToken) return localToken;
  } catch {}
  try {
    const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken) return sessionToken;
  } catch {}
  return getCookieToken();
}

export function setStoredToken(token: string) {
  persistToken(token);
}

export function clearStoredToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
  try { sessionStorage.removeItem(SESSION_TOKEN_KEY); } catch {}
  try { document.cookie = "wealthplanner_token=; Path=/; Max-Age=0; SameSite=Lax"; } catch {}
}

function captureTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = (params.get("token") || params.get("ref") || "").trim();
  if (token) {
    setStoredToken(token);
    // Remove only authentication parameters, preserving unrelated query params and the hash.
    params.delete("token");
    params.delete("ref");
    const query = params.toString();
    const nextUrl = window.location.pathname + (query ? `?${query}` : "") + window.location.hash;
    window.history.replaceState({}, "", nextUrl);
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

export interface AssetTarget {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  currentValueSource: string;
}
export interface ManagedInvestmentAsset {
  id: string; name: string; category: string; quantity: number; unit: string;
  buyPrice: number; currentPrice: number; sourceAccount: string; purchaseDate: string;
  note: string; transactionId: string; currency: "IDR" | "USD"; fxRate: number;
  costBasis: number; value: number;
}
export interface RealAsset {
  id: string; name: string; initialValue: number; acquisitionDate: string;
  annualChangePercent: number; note: string; currentValue: number; changeValue: number;
  sourceAccount: string; transactionId: string;
  fundingMode: "purchase" | "owned";
}

export interface AssetData {
  totalAssets: number;
  stocksTotal: number;
  target: number;
  targets: AssetTarget[];
  liquidAssets: { name: string; value: number }[];
  investmentAssets: { name: string; value: number }[];
  investmentDetails: ManagedInvestmentAsset[];
  realAssets: RealAsset[];
  realAssetsTotal: number;
  excludedInvestmentNames: string[];
  stocksID: StockItem[];
  stocksUS: StockItem[];
}

interface SetupCategory { name: string; active: boolean }

interface FinanceData {
  loading: boolean;
  error: string | null;
  isRealData: boolean;
  username: string | null;
  userId: string | null;
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

function emptyAssetData(): AssetData {
  return {
    totalAssets: 0,
    stocksTotal: 0,
    target: 0,
    targets: [],
    liquidAssets: [],
    investmentAssets: [],
    investmentDetails: [],
    realAssets: [],
    realAssetsTotal: 0,
    excludedInvestmentNames: [],
    stocksID: [],
    stocksUS: [],
  };
}

function normalizeAssetData(value: any): AssetData {
  const fallback = emptyAssetData();
  return {
    totalAssets: Number(value?.totalAssets) || 0,
    stocksTotal: Number(value?.stocksTotal) || 0,
    target: Number(value?.target) || 0,
    targets: Array.isArray(value?.targets) ? value.targets : [],
    liquidAssets: Array.isArray(value?.liquidAssets) ? value.liquidAssets : fallback.liquidAssets,
    investmentAssets: Array.isArray(value?.investmentAssets) ? value.investmentAssets : fallback.investmentAssets,
    investmentDetails: Array.isArray(value?.investmentDetails) ? value.investmentDetails : [],
    realAssets: Array.isArray(value?.realAssets) ? value.realAssets : [],
    realAssetsTotal: Number(value?.realAssetsTotal) || 0,
    excludedInvestmentNames: Array.isArray(value?.excludedInvestmentNames) ? value.excludedInvestmentNames : [],
    stocksID: Array.isArray(value?.stocksID) ? value.stocksID : [],
    stocksUS: Array.isArray(value?.stocksUS) ? value.stocksUS : [],
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
  userId: string | null;
  month: string;
  year: number;
  transactions: Transaction[];
  budgetByCategory: Record<string, number>;
  assets: AssetData;
  setup: Record<"income" | "expense" | "saving" | "bank", SetupCategory[]>;
}

const CURRENT_MONTH_NAME = new Date().toLocaleString("en-US", { month: "long" });

// Dedupe request ke API: banyak komponen memanggil useFinanceData() sekaligus.
// Tanpa ini, tiap komponen menembak /api/dashboard & /api/setup sendiri-sendiri
// dan kuota baca Google Sheets (per menit) cepat habis.
const sharedRequests = new Map<string, { p: Promise<{ ok: boolean; data: any }>; t: number }>();
function sharedFetch(url: string, ttlMs: number, force = false): Promise<{ ok: boolean; data: any }> {
  const now = Date.now();
  const hit = sharedRequests.get(url);
  // Coalesce simultaneous forced refreshes from every mounted useFinanceData()
  // instance. A force refresh is shared while in flight, then cached briefly.
  if (hit && (hit.t === -1 || (!force && now - hit.t < ttlMs))) return hit.p;
  const entry = { p: Promise.resolve({ ok: false, data: {} as any }), t: force ? -1 : now };
  entry.p = fetch(url)
    .then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
    .then((result) => {
      if (sharedRequests.get(url) === entry) entry.t = Date.now();
      return result;
    })
    .catch((e) => {
      if (sharedRequests.get(url) === entry) sharedRequests.delete(url);
      throw e;
    });
  sharedRequests.set(url, entry);
  return entry.p;
}

export function useFinanceData(monthOverride?: string, includeAllMonths = false, yearOverride?: number, transactionsOnly = false): FinanceData {
  const initialMonth = monthOverride || CURRENT_MONTH_NAME;
  const currentYear = new Date().getFullYear();
  const initialYear = yearOverride || currentYear;
  const [state, setState] = useState<RawState>({
    loading: true,
    error: null,
    isRealData: false,
    username: null,
    userId: null,
    month: initialMonth,
    year: initialYear,
    transactions: [],
    budgetByCategory: {},
    assets: emptyAssetData(),
    setup: {
      income: incomeCategories.map((c) => ({ name: c.category, active: true })),
      expense: expenseCategories.map((c) => ({ name: c.category, active: true })),
      saving: savingCategories.map((c) => ({ name: c.category, active: true })),
      bank: [],
    },
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = (force = false) => {
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
          transactions: [],
          budgetByCategory: {},
          assets: emptyAssetData(),
          isRealData: false,
          username: null,
          userId: null,
        }));
        return;
      }

      setState((s) => ({ ...s, loading: true, error: null, month: requestedMonth }));
      const dashboardUrl = `${apiUrl("/dashboard")}?token=${encodeURIComponent(token)}&month=${encodeURIComponent(requestedMonth)}&year=${requestedYear}${includeAllMonths ? "&allYears=1" : ""}${transactionsOnly ? "&transactionsOnly=1" : ""}`;
      const setupUrl = `${apiUrl("/setup")}?token=${encodeURIComponent(token)}`;
      // A successful write must refresh from Sheets. The shared fetch layer
      // coalesces this forced refresh across all mounted listeners.
      const ttl = force ? 0 : 20000;
      Promise.all([
        sharedFetch(dashboardUrl, ttl, force),
        sharedFetch(setupUrl, ttl, force),
      ])
        .then(([dashboard, setup]) => ({ dashboard, setup }))
        .then(({ dashboard, setup }) => {
          const { ok, data } = dashboard;
          if (cancelled) return;
          if (!ok) {
            // Do not fall back to token-scoped/stale financial cache. A failed
            // request must never render another account or old mock data.
            setState((s) => ({
              ...s, loading: false, error: data.error || "Gagal memuat data",
              isRealData: false, userId: null, assets: emptyAssetData(),
              transactions: [], budgetByCategory: {},
            }));
          } else {
            const cacheKey = data?.user_id ? `wealthplanner_finance_cache_user_${data.user_id}` : "";
            try { if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify({ dashboard: data, setup: setup.ok ? setup.data : null, savedAt: Date.now() })); } catch {}
            setState((s) => ({
              ...s, loading: false, error: null, isRealData: true,
              username: data.username, userId: data.user_id || null,
              month: data.month || requestedMonth, year: data.year || requestedYear,
              transactions: includeAllMonths
                ? (data.transactions || [])
                : (data.transactions || []).filter((t: Transaction) => String(t.month || "").toLowerCase() === String(data.month || requestedMonth).toLowerCase()),
              budgetByCategory: data.budgetByCategory || {},
              assets: normalizeAssetData(data.assets),
              setup: setup.ok && setup.data?.sections ? setup.data.sections : s.setup,
            }));
          }        })
        .catch(() => {
          if (!cancelled) setState((s) => ({ ...s, loading: false, error: "Gagal memuat data" }));
        });
    };

    loadData();
    const handleRefresh = () => loadData(true);
    const handleVisible = () => {
      if (document.visibilityState === "visible") loadData();
    };
    window.addEventListener("wealthplanner:transaction-added", handleRefresh);
    window.addEventListener("wealthplanner:setup-changed", handleRefresh);
    window.addEventListener("wealthplanner:budget-updated", handleRefresh);
    window.addEventListener("wealthplanner:asset-updated", handleRefresh);
    window.addEventListener("visibilitychange", handleVisible);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadData();
    }, 180000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("wealthplanner:transaction-added", handleRefresh);
      window.removeEventListener("wealthplanner:setup-changed", handleRefresh);
      window.removeEventListener("wealthplanner:budget-updated", handleRefresh);
      window.removeEventListener("wealthplanner:asset-updated", handleRefresh);
      window.removeEventListener("visibilitychange", handleVisible);
    };
  }, [monthOverride, includeAllMonths, yearOverride]);

  // Gunakan satu sumber transaksi yang sudah dipastikan sesuai bulan dan tahun
  // agar realisasi tidak tercampur ketika cache memuat data lintas periode.
  const periodTransactions = state.transactions.filter((t) => {
    const txMonth = String(t.month || "").trim().toLowerCase();
    const txYear = Number(t.year || String(t.date || "").split("/").pop());
    return txMonth === String(state.month || initialMonth).trim().toLowerCase()
      && (!txYear || txYear === Number(state.year || initialYear));
  });

  const totalIncome = periodTransactions.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = periodTransactions.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
  const totalSaving = periodTransactions.filter((t) => t.type === "Saving").reduce((s, t) => s + t.amount, 0);

  function byCategory(type: Transaction["type"]) {
    const normalize = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const map = new Map<string, { category: string; realization: number }>();
    const categorySource =
      type === "Income" ? incomeCategories :
      type === "Saving" ? savingCategories :
      expenseCategories;
    const setupKey = type === "Income" ? "income" : type === "Saving" ? "saving" : "expense";
    const configured = state.setup[setupKey] || [];
    const activeSetup = configured.filter((item) => item.active && item.name.trim());
    const canonicalNames = new Map(activeSetup.map((item) => [normalize(item.name), item.name]));

    for (const t of periodTransactions) {
      if (t.type !== type) continue;
      const key = normalize(t.category);
      const category = canonicalNames.get(key) || String(t.category || "").trim();
      if (!category) continue;
      const existing = map.get(normalize(category));
      map.set(normalize(category), {
        category,
        realization: (existing?.realization || 0) + Number(t.amount || 0),
      });
    }

    // Selalu tampilkan kategori aktif, termasuk kategori yang belum memiliki transaksi.
    for (const item of activeSetup) {
      const key = normalize(item.name);
      if (!map.has(key)) map.set(key, { category: item.name, realization: 0 });
    }

    const budgetMap = new Map(Object.entries(state.budgetByCategory || {}).map(([name, amount]) => [normalize(name), amount]));
    const fallbackAllocation = new Map(categorySource.map((c) => [normalize(c.category), c.allocation]));
    return Array.from(map.values()).map(({ category, realization }) => ({
      category,
      allocation: budgetMap.get(normalize(category)) ?? fallbackAllocation.get(normalize(category)) ?? 0,
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
