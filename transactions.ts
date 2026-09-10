import type { Transaction } from "./types";

export const transactions: Transaction[] = [
  { date: "06/05/2026", month: "June", type: "Income", category: "Gajian", description: "Gajian bulanan", amount: 10000000 },
  { date: "06/05/2026", month: "June", type: "Income", category: "Freelance Income", description: "Produk digital", amount: 3000000 },
  { date: "06/05/2026", month: "June", type: "Expense", category: "Food & Groceries", description: "Jajan ciomy", amount: 23000 },
  { date: "06/05/2026", month: "June", type: "Expense", category: "Internet & Phone", description: "Kuota internet", amount: 336000 },
  { date: "06/06/2026", month: "June", type: "Expense", category: "Education", description: "Cicilan KPR", amount: 5000000 },
  { date: "06/06/2026", month: "June", type: "Expense", category: "Utilities", description: "Listrik & air", amount: 850000 },
  { date: "06/07/2026", month: "June", type: "Expense", category: "Entertainment", description: "Nonton bioskop", amount: 120000 },
  { date: "06/08/2026", month: "June", type: "Saving", category: "Gold", description: "Beli emas digital", amount: 314000 },
  { date: "06/09/2026", month: "June", type: "Saving", category: "Deposito", description: "Setoran deposito", amount: 300000 },
  { date: "06/10/2026", month: "June", type: "Income", category: "Dividend / Interest", description: "Dividen saham", amount: 600000 },
  { date: "06/11/2026", month: "June", type: "Expense", category: "Insurance Premium", description: "Premi bulanan", amount: 450000 },
  { date: "06/12/2026", month: "June", type: "Expense", category: "Transport", description: "Bensin & tol", amount: 172000 },
  { date: "06/13/2026", month: "June", type: "Expense", category: "Charity", description: "Sedekah", amount: 100000 },
  { date: "06/14/2026", month: "June", type: "Expense", category: "Food & Groceries", description: "Belanja mingguan", amount: 1279724 },
];

export const recentTransactions = [...transactions].reverse().slice(0, 5);
