import type { BudgetCategory } from "./types";

export const incomeCategories: BudgetCategory[] = [
  { category: "Gajian", allocation: 18000000, realization: 17000000 },
  { category: "Freelance Income", allocation: 2000000, realization: 13000000 },
  { category: "Business Income", allocation: 0, realization: 0 },
  { category: "Commission", allocation: 0, realization: 0 },
  { category: "Dividend / Interest", allocation: 0, realization: 600000 },
  { category: "Side Hustle", allocation: 0, realization: 0 },
];

export const expenseCategories: BudgetCategory[] = [
  { category: "Utilities", allocation: 2000000, realization: 10075000 },
  { category: "Internet & Phone", allocation: 400000, realization: 336000 },
  { category: "Insurance Premium", allocation: 500000, realization: 450000 },
  { category: "Food & Groceries", allocation: 300000, realization: 1302724 },
  { category: "Transport", allocation: 5000000, realization: 172000 },
  { category: "Entertainment", allocation: 100000, realization: 557899 },
  { category: "Education", allocation: 5000000, realization: 5000000 },
  { category: "Charity", allocation: 200000, realization: 100000 },
];

export const savingCategories: BudgetCategory[] = [
  { category: "Mutual Funds", allocation: 10000000, realization: 0 },
  { category: "Bonds", allocation: 0, realization: 20000 },
  { category: "Gold", allocation: 0, realization: 314000 },
  { category: "Deposito", allocation: 0, realization: 300000 },
];

export const totalIncome = incomeCategories.reduce((sum, c) => sum + c.realization, 0);
export const totalExpense = expenseCategories.reduce((sum, c) => sum + c.realization, 0);
export const totalSavings = savingCategories.reduce((sum, c) => sum + c.realization, 0);
export const budgetExpensePlan = expenseCategories.reduce((sum, c) => sum + c.allocation, 0);
