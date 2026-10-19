import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, Receipt, Search } from "lucide-react";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { Card } from "../components/Card";
import { DataStatusBanner } from "../components/DataStatusBanner";
import { formatRupiah } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import type { Transaction as TransactionItem, TransactionType } from "../data/types";

type Filter = "All" | TransactionType;

function transactionDateValue(value: string) {
  const [day, month, year] = String(value || "").split("/").map(Number);
  return year && month && day ? new Date(year, month - 1, day).getTime() : 0;
}

export function Transaction() {
  const { loading, error, isRealData, username, transactions } = useFinanceData(undefined, true);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filteredTransactions = useMemo(() => transactions
    .filter((t) => filter === "All" || t.type === filter)
    .filter((t) => {
      const q = search.trim().toLowerCase();
      return !q || [t.description, t.category, t.type, t.date].some((v) => String(v || "").toLowerCase().includes(q));
    })
    .sort((a, b) => transactionDateValue(b.date) - transactionDateValue(a.date)), [transactions, filter, search]);

  const totals = useMemo(() => ({
    income: transactions.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0),
    expense: transactions.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0),
    saving: transactions.filter((t) => t.type === "Saving").reduce((sum, t) => sum + t.amount, 0),
  }), [transactions]);

  const filters: Filter[] = ["All", "Income", "Expense", "Saving"];
  const iconFor = (type: TransactionType) => type === "Income" ? ArrowDownLeft : type === "Expense" ? ArrowUpRight : PiggyBank;
  const colorFor = (type: TransactionType) => type === "Income" ? "bg-emerald-50 text-emerald-700" : type === "Expense" ? "bg-rose-50 text-rose-600" : "bg-orange-50 text-orange-600";

  return (
    <div className="flex flex-col gap-5">
      <DataStatusBanner isRealData={isRealData} username={username} error={error} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">Transaction</h1>
          <p className="mt-1 text-sm text-charcoal/60">Kelola dan telusuri semua transaksi keuanganmu.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-800">
          <Plus size={16} /> Tambah Transaksi
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card><div className="p-4"><p className="text-xs text-charcoal/55">Total Income</p><p className="mt-1 text-lg font-semibold text-emerald-700">{formatRupiah(totals.income)}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs text-charcoal/55">Total Expense</p><p className="mt-1 text-lg font-semibold text-rose-600">{formatRupiah(totals.expense)}</p></div></Card>
        <Card><div className="p-4"><p className="text-xs text-charcoal/55">Total Saving</p><p className="mt-1 text-lg font-semibold text-orange-600">{formatRupiah(totals.saving)}</p></div></Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-forest-900">Daftar Transaksi</h2>
            <label className="flex items-center gap-2 rounded-xl border border-charcoal/10 bg-white px-3 py-2 sm:w-72">
              <Search size={16} className="text-charcoal/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari transaksi..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${filter === item ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}>{item === "All" ? "Semua" : item === "Income" ? "Pemasukan" : item === "Expense" ? "Pengeluaran" : "Tabungan"}</button>)}
          </div>
          {loading ? <p className="py-10 text-center text-sm text-charcoal/50">Memuat transaksi...</p> : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Receipt size={28} className="text-charcoal/30" />
              <p className="font-medium text-forest-900">Belum ada transaksi</p>
              <p className="text-sm text-charcoal/55">Coba ubah filter atau tambahkan transaksi baru.</p>
            </div>
          ) : (
            <div className="divide-y divide-charcoal/8">
              {filteredTransactions.map((t, i) => {
                const Icon = iconFor(t.type);
                const amountPrefix = t.type === "Expense" ? "−" : "+";
                const amountColor = t.type === "Income" ? "text-emerald-700" : t.type === "Expense" ? "text-rose-600" : "text-orange-600";
                return <div key={`${t.sheetRow ?? "local"}-${t.date}-${t.category}-${i}`} className="flex items-center gap-3 py-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorFor(t.type)}`}><Icon size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-forest-900">{t.description || t.category}</p>
                    <p className="mt-0.5 text-xs text-charcoal/50">{t.category} · {t.date}</p>
                  </div>
                  <p className={`shrink-0 text-right text-sm font-semibold ${amountColor}`}>{amountPrefix}{formatRupiah(t.amount)}</p>
                </div>;
              })}
            </div>
          )}
        </div>
      </Card>
      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={(_transaction: TransactionItem) => {}} />
    </div>
  );
}
