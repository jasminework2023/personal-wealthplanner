import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, Receipt, Search, CalendarDays, SlidersHorizontal, X, Pencil, Trash2 } from "lucide-react";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { EditTransactionModal } from "../components/EditTransactionModal";
import { Card } from "../components/Card";
import { DataStatusBanner } from "../components/DataStatusBanner";
import { formatRupiah } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import type { Transaction as TransactionItem, TransactionType } from "../data/types";

type Filter = "All" | TransactionType;

function transactionParts(value: string): { day: number; month: number; year: number } {
  const raw = String(value || "").trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  const parts = raw.split(/[\/. -]/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return { day: 0, month: 0, year: 0 };
  let [day, month, year] = parts;
  if (day <= 12 && month > 12) [day, month] = [month, day];
  if (year < 100) year += year < 50 ? 2000 : 1900;
  return { day, month, year };
}
function transactionDateValue(value: string): number {
  const { day, month, year } = transactionParts(value);
  return year && month >= 1 && month <= 12 && day >= 1 && day <= 31
    ? new Date(year, month - 1, day).getTime()
    : 0;
}

export function Transaction() {
  const { loading, error, isRealData, username, transactions } = useFinanceData(undefined, true);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);

  const availableYears = useMemo(() => Array.from(new Set(transactions.map((t) => {
    const parts = transactionParts(t.date);
    return parts.year ? String(parts.year) : "";
  }).filter(Boolean))).sort((a, b) => Number(b) - Number(a)), [transactions]);

  const filteredTransactions = useMemo(() => transactions
    .filter((t) => filter === "All" || t.type === filter)
    .filter((t) => {
      const parts = transactionParts(t.date);
      const month = parts.month;
      const year = parts.year;
      return (selectedMonth === "all" || month === Number(selectedMonth)) && (selectedYear === "all" || year === Number(selectedYear));
    })
    .filter(() => true)
    .filter((t) => {
      const q = search.trim().toLowerCase();
      return !q || [t.description, t.category, t.type, t.date].some((v) => String(v || "").toLowerCase().includes(q));
    })
    .sort((a, b) => sortOrder === "newest" ? transactionDateValue(b.date) - transactionDateValue(a.date) : transactionDateValue(a.date) - transactionDateValue(b.date)), [transactions, filter, search, selectedMonth, selectedYear, sortOrder]);

  const filters: Filter[] = ["All", "Income", "Expense", "Saving"];
  const iconFor = (type: TransactionType) => type === "Income" ? ArrowDownLeft : type === "Expense" ? ArrowUpRight : PiggyBank;
  const colorFor = (type: TransactionType) => type === "Income" ? "bg-emerald-50 text-emerald-700" : type === "Expense" ? "bg-rose-50 text-rose-600" : "bg-orange-50 text-orange-600";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">Transaction</h1>
          <p className="mt-1 text-sm text-charcoal/60">Kelola dan telusuri semua transaksi keuanganmu.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCalendarOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-charcoal/10 bg-white px-3 py-2.5 text-xs font-medium text-forest-900"><CalendarDays size={16}/><span>{selectedMonth === "all" && selectedYear === "all" ? "Semua Transaksi" : `${selectedMonth === "all" ? "Semua bulan" : ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][Number(selectedMonth)]} ${selectedYear === "all" ? "" : selectedYear}`.trim()}</span></button>
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-forest-700 px-3 py-2.5 text-xs font-semibold text-white hover:bg-forest-800 sm:px-4 sm:text-sm"><Plus size={16} /> Tambah Transaksi</button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-forest-900">Daftar Transaksi</h2>
            <div className="flex items-center gap-2 sm:w-72"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-charcoal/10 bg-white px-3 py-2">
              <Search size={16} className="text-charcoal/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari transaksi..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label><button type="button" aria-label={sortOrder === "newest" ? "Urutkan dari terlama ke terbaru" : "Urutkan dari terbaru ke terlama"} onClick={() => setSortOrder((current) => current === "newest" ? "oldest" : "newest")} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-charcoal/10 ${sortOrder === "newest" ? "bg-forest-50 text-forest-800" : "bg-white text-forest-800"}`}><SlidersHorizontal size={17}/></button></div>
          </div>
          {calendarOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center"><div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-forest-900">Filter transaksi</h3><button type="button" aria-label="Tutup filter" onClick={() => setCalendarOpen(false)} className="rounded-full p-1 text-charcoal/60"><X size={20}/></button></div><button type="button" onClick={() => {setSelectedMonth("all");setSelectedYear("all");setCalendarOpen(false);}} className={`mb-3 w-full rounded-xl border px-3 py-2.5 text-left text-sm ${selectedMonth === "all" && selectedYear === "all" ? "border-forest-700 bg-forest-50 text-forest-900" : "border-charcoal/10 text-charcoal"}`}>Semua Transaksi</button><p className="mb-1 text-xs text-charcoal/60">Bulan</p><select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="mb-3 w-full rounded-xl border border-charcoal/10 bg-white px-3 py-2.5 text-sm text-forest-900"><option value="all">Semua bulan</option>{["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((month, i) => <option key={month} value={String(i + 1)}>{month}</option>)}</select><p className="mb-1 text-xs text-charcoal/60">Tahun</p><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="mb-4 w-full rounded-xl border border-charcoal/10 bg-white px-3 py-2.5 text-sm text-forest-900"><option value="all">Semua tahun</option>{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select><button type="button" onClick={() => setCalendarOpen(false)} className="w-full rounded-xl bg-forest-700 py-2.5 text-sm font-semibold text-white">Terapkan filter</button></div></div>}
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
            {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${filter === item ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-800 hover:bg-forest-100"}`}>{item === "All" ? "Semua" : item === "Income" ? "Pemasukan" : item === "Expense" ? "Pengeluaran" : "Tabungan"}</button>)}
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
                return <div key={`${t.sheetRow ?? "local"}-${t.date}-${t.category}-${i}`} className="flex items-center gap-2 py-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorFor(t.type)}`}><Icon size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-forest-900">{t.description || t.category}</p>
                    <p className="mt-0.5 text-xs text-charcoal/50">{t.category} · {t.date}</p>
                  </div>
                  <p className={`shrink-0 text-right text-sm font-semibold ${amountColor}`}>{amountPrefix}{formatRupiah(t.amount)}</p>
                  <button type="button" aria-label="Edit transaksi" title="Edit transaksi" onClick={() => setEditingTransaction(t)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-forest-700 hover:bg-forest-50"><Pencil size={16}/></button>
                </div>;
              })}
            </div>
          )}
        </div>
      </Card>
      <AddTransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={(_transaction: TransactionItem) => {}} />
      <EditTransactionModal
        open={editingTransaction !== null}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSaved={() => {
          setEditingTransaction(null);
          window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added"));
        }}
        onDeleted={() => {
          setEditingTransaction(null);
          window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added"));
        }}
      />
    </div>
  );
}
