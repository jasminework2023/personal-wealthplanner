import { useMemo, useState } from "react";
import { Search, Plus, Sparkles } from "lucide-react";
import { Card } from "../components/Card";
import { TransactionBadge } from "../components/TransactionBadge";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { DataStatusBanner } from "../components/DataStatusBanner";
import { formatRupiah } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import type { Transaction, TransactionType } from "../data/types";

export function TransactionReport() {
  const { isRealData, username, error, transactions, setup } = useFinanceData(undefined, true);
  const [extraTxs, setExtraTxs] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<string>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"manual" | "ai">("manual");

  const allTxs = [...transactions, ...extraTxs];
  const categories = useMemo(() => {
    const setupCategories = [
      ...setup.income.filter((x) => x.active).map((x) => x.name),
      ...setup.expense.filter((x) => x.active).map((x) => x.name),
      ...setup.saving.filter((x) => x.active).map((x) => x.name),
    ];
    return Array.from(new Set([...setupCategories, ...allTxs.map((t) => t.category)]));
  }, [allTxs, setup]);

  const parseDate = (date: string) => {
    const [d, m, y] = date.split("/").map(Number);
    return new Date(y || 0, (m || 1) - 1, d || 1).getTime();
  };

  const monthGroup = (t: Transaction) => {
    const [d, m, y] = t.date.split("/").map(Number);
    if (d && m && y) {
      return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    return t.month || "Tanpa Bulan";
  };

  const months = useMemo(() => {
    const groups = new Map<string, number>();
    allTxs.forEach((t) => {
      const key = monthGroup(t);
      const timestamp = parseDate(t.date);
      groups.set(key, Math.max(groups.get(key) ?? 0, timestamp));
    });
    return Array.from(groups.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label);
  }, [allTxs]);

  const filtered = allTxs.filter((t) => {
    if (typeFilter !== "All" && t.type !== typeFilter) return false;
    if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
    if (monthFilter !== "All" && monthGroup(t) !== monthFilter) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase()) && !t.category.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <DataStatusBanner isRealData={isRealData} username={username} error={error} />

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">Transaction Report</h1>
          <p className="text-[14px] text-charcoal/60 mt-0.5">Catat dan pantau setiap pergerakan uangmu.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setModalMode("manual");
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 border border-charcoal/15 bg-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-charcoal/5"
          >
            <Plus size={15} /> Tambah Transaksi
          </button>
          <button
            onClick={() => {
              setModalMode("ai");
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-rose-600 text-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-rose-700"
          >
            <Sparkles size={15} /> Catat dengan AI
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
            <input
              placeholder="Search transaction..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-charcoal/15 rounded-lg pl-9 pr-3 py-2 text-[14px]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | "All")}
            className="border border-charcoal/15 rounded-lg px-3 py-2 text-[14px] bg-white"
          >
            <option value="All">Semua tipe</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
            <option value="Saving">Saving</option>
          </select>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="border border-charcoal/15 rounded-lg px-3 py-2 text-[14px] bg-white"
          >
            <option value="All">Semua bulan</option>
            {months.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-charcoal/15 rounded-lg px-3 py-2 text-[14px] bg-white"
          >
            <option value="All">Semua kategori</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="py-8 text-center text-charcoal/40 text-[13px]">Nggak ada transaksi yang cocok.</div>
        ) : (
          <div className="flex flex-col gap-5">
            {months
              .filter((month) => month === "All" || filtered.some((t) => monthGroup(t) === month))
              .map((month) => {
                const monthTxs = filtered
                  .filter((t) => monthGroup(t) === month)
                  .sort((a, b) => parseDate(b.date) - parseDate(a.date));

                return (
                  <div key={month} className="overflow-hidden rounded-xl border border-charcoal/8">
                    <div className="flex items-center justify-between gap-3 bg-charcoal/[0.025] px-4 py-3 border-b border-charcoal/8">
                      <div>
                        <p className="text-[14px] font-semibold text-forest-900">{month}</p>
                        <p className="text-[11px] text-charcoal/45 mt-0.5">{monthTxs.length} transaksi</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px] min-w-[640px]">
                        <thead>
                          <tr className="text-left text-charcoal/50 text-[12px] border-b border-charcoal/8">
                            <th className="py-2.5 px-4 font-medium">Date</th>
                            <th className="py-2.5 font-medium">Type</th>
                            <th className="py-2.5 font-medium">Category</th>
                            <th className="py-2.5 font-medium">Description</th>
                            <th className="py-2.5 px-4 font-medium text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthTxs.map((t, i) => (
                            <tr key={`${t.date}-${t.category}-${t.description}-${i}`} className="border-b border-charcoal/8 last:border-0">
                              <td className="py-2.5 px-4 whitespace-nowrap">{t.date}</td>
                              <td className="py-2.5"><TransactionBadge type={t.type} /></td>
                              <td className="py-2.5">{t.category}</td>
                              <td className="py-2.5">{t.description}</td>
                              <td className={`py-2.5 px-4 text-right font-medium ${t.type === "Expense" ? "text-rose-600" : "text-forest-700"}`}>
                                {t.type === "Expense" ? "-" : "+"}{formatRupiah(t.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(t) => {
          if (!isRealData) setExtraTxs((prev) => [...prev, t]);
        }}
        initialMode={modalMode}
      />
    </div>
  );
}
