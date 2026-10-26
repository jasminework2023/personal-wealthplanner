import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, PiggyBank, Plus, Receipt, Search, CalendarDays, SlidersHorizontal, X, Pencil, Trash2, Wallet as WalletIcon } from "lucide-react";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { EditTransactionModal } from "../components/EditTransactionModal";
import { Card } from "../components/Card";
import { DataStatusBanner } from "../components/DataStatusBanner";
import { formatRupiah, getAppLanguage } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import { useNavigate } from "react-router-dom";
import { WalletsPage } from "./WalletsPage";
import type { Transaction as TransactionItem, TransactionType } from "../data/types";

type Filter = "All" | TransactionType;

function transactionParts(value: string): { day: number; month: number; year: number } {
  const raw = String(value || "").trim();
  // ISO dates are unambiguous: YYYY-MM-DD.
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T|\s)/);
  let day: number, month: number, year: number;
  if (iso) {
    year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]);
  } else {
    const yearFirst = raw.match(/^(\d{4})[\/. -](\d{1,2})[\/. -](\d{1,2})$/);
    if (yearFirst) {
      year = Number(yearFirst[1]); month = Number(yearFirst[2]); day = Number(yearFirst[3]);
    } else {
      const parts = raw.split(/[\/. -]/).filter(Boolean).map(Number);
      if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return { day: 0, month: 0, year: 0 };
      [day, month, year] = parts;
      // Source data uses DD/MM/YYYY; infer MM/DD/YYYY only when the second part exceeds 12.
      if (day <= 12 && month > 12) [day, month] = [month, day];
    }
  }
  if (year < 100) year += year < 50 ? 2000 : 1900;
  return { day, month, year };
}
function transactionDateValue(value: string): number {
  const { day, month, year } = transactionParts(value);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return 0;
  const date = new Date(year, month - 1, day);
  // Reject impossible dates such as 31/02/2026 instead of silently rolling them forward.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return 0;
  return date.getTime();
}
function formatTransactionDate(value: string): string {
  const { day, month, year } = transactionParts(value);
  if (!transactionDateValue(value)) return String(value || "—");
  return [day, month, year].map((part, index) => String(part).padStart(index === 2 ? 4 : 2, "0")).join("/");
}

export function Transaction() {
  const navigate = useNavigate();
  const { loading, error, isRealData, username, transactions } = useFinanceData(undefined, true);
  const [language, setLanguage] = useState(getAppLanguage());
  useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const txText = language === "id" ? { title: "Transaksi", intro: "Kelola dan telusuri semua transaksi keuanganmu.", all: "Semua Transaksi", allMonths: "Semua bulan", add: "Tambah Transaksi", list: "Daftar Transaksi", search: "Cari transaksi...", filter: "Filter transaksi", month: "Bulan", year: "Tahun", allYears: "Semua tahun", apply: "Terapkan filter", loading: "Memuat transaksi...", empty: "Belum ada transaksi", emptyHint: "Coba ubah filter atau tambahkan transaksi baru.", close: "Tutup filter", newestToOldest: "Urutkan dari terbaru ke terlama", oldestToNewest: "Urutkan dari terlama ke terbaru", edit: "Edit transaksi" } : { title: "Transaction", intro: "Manage and review all your financial transactions.", all: "All Transactions", allMonths: "All months", add: "Add Transaction", list: "Transaction List", search: "Search transactions...", filter: "Filter transactions", month: "Month", year: "Year", allYears: "All years", apply: "Apply filters", loading: "Loading transactions...", empty: "No transactions yet", emptyHint: "Try changing the filters or add a new transaction.", close: "Close filter", newestToOldest: "Sort newest to oldest", oldestToNewest: "Sort oldest to newest", edit: "Edit transaction" };
  const [activeTab, setActiveTab] = useState<"transactions" | "wallets">("transactions");
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
    .sort((a, b) => { const difference = sortOrder === "newest" ? transactionDateValue(b.date) - transactionDateValue(a.date) : transactionDateValue(a.date) - transactionDateValue(b.date); return difference || (sortOrder === "newest" ? Number(b.sheetRow || 0) - Number(a.sheetRow || 0) : Number(a.sheetRow || 0) - Number(b.sheetRow || 0)); }), [transactions, filter, search, selectedMonth, selectedYear, sortOrder]);

  const filters: Filter[] = ["All", "Income", "Expense", "Saving", "Transfer"];
  const iconFor = (type: TransactionType) => type === "Income" ? ArrowDownLeft : type === "Expense" ? ArrowUpRight : type === "Transfer" ? ArrowLeftRight : PiggyBank;
  const colorFor = (type: TransactionType) => type === "Income" ? "bg-[#DFF3E7] text-[#0B6B47]" : type === "Expense" ? "bg-[#FDE3EA] text-[#C23A5B]" : type === "Transfer" ? "bg-[#DCEBFF] text-[#1A5FD0]" : "bg-[#E8DDFA] text-[#6F46B0]";

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 rounded-2xl bg-charcoal/[0.05] p-1">
        <button type="button" onClick={() => setActiveTab("transactions")} className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${activeTab === "transactions" ? "bg-white text-[#123524] shadow-sm" : "text-charcoal/55"}`}>Transaction List</button>
        <button type="button" onClick={() => setActiveTab("wallets")} className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${activeTab === "wallets" ? "bg-[#123524] text-white shadow-sm" : "text-charcoal/55"}`}>Dompet</button>
      </div>
      {activeTab === "wallets" ? <WalletsPage embedded /> : <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{txText.title}</h1>
          <p className="page-sub">{txText.intro}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCalendarOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-forest-100/70 bg-white px-3.5 py-2.5 text-xs font-semibold text-forest-900 shadow-sm"><CalendarDays size={16}/><span>{selectedMonth === "all" && selectedYear === "all" ? txText.all : `${selectedMonth === "all" ? txText.allMonths : ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][Number(selectedMonth)]} ${selectedYear === "all" ? "" : selectedYear}`.trim()}</span></button>
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#DDF7E8] px-4 py-2.5 text-xs font-bold text-[#0B6B47] shadow-pop sm:text-sm"><Plus size={16} /> {txText.add}</button>
        </div>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">{txText.list}</h2>
            <div className="flex items-center gap-2 sm:w-72"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-charcoal/10 bg-white px-4 py-2.5">
              <Search size={16} className="text-charcoal/40" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={txText.search} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </label><button type="button" aria-label={sortOrder === "newest" ? txText.newestToOldest : txText.oldestToNewest} onClick={() => setSortOrder((current) => current === "newest" ? "oldest" : "newest")} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-charcoal/10 ${sortOrder === "newest" ? "bg-forest-50 text-forest-800" : "bg-white text-forest-800"}`}><SlidersHorizontal size={17}/></button></div>
          </div>
          {calendarOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center"><div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-forest-900">{txText.filter}</h3><button type="button" aria-label={txText.close} onClick={() => setCalendarOpen(false)} className="rounded-full p-1 text-charcoal/60"><X size={20}/></button></div><button type="button" onClick={() => {setSelectedMonth("all");setSelectedYear("all");setCalendarOpen(false);}} className={`mb-3 w-full rounded-xl border px-3 py-2.5 text-left text-sm ${selectedMonth === "all" && selectedYear === "all" ? "border-forest-700 bg-forest-50 text-forest-900" : "border-charcoal/10 text-charcoal"}`}>{txText.all}</button><p className="mb-1 text-xs text-charcoal/60">{txText.month}</p><select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="mb-3 w-full rounded-xl border border-charcoal/10 bg-white px-3 py-2.5 text-sm text-forest-900"><option value="all">{txText.allMonths}</option>{["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((month, i) => <option key={month} value={String(i + 1)}>{month}</option>)}</select><p className="mb-1 text-xs text-charcoal/60">{txText.year}</p><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="mb-4 w-full rounded-xl border border-charcoal/10 bg-white px-3 py-2.5 text-sm text-forest-900"><option value="all">{txText.allYears}</option>{availableYears.map((year) => <option key={year} value={year}>{year}</option>)}</select><button type="button" onClick={() => setCalendarOpen(false)} className="w-full rounded-xl bg-forest-700 py-2.5 text-sm font-semibold text-white">{txText.apply}</button></div></div>}
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1">
            {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${filter === item ? "bg-[#123524] text-white shadow-sm" : "bg-charcoal/[0.05] text-forest-800 hover:bg-charcoal/10"}`}>{item === "All" ? "Semua" : item === "Income" ? "Pemasukan" : item === "Expense" ? "Pengeluaran" : item === "Transfer" ? "Transfer" : "Tabungan"}</button>)}
          </div>
          {loading ? <p className="py-10 text-center text-sm text-charcoal/50">{txText.loading}</p> : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Receipt size={28} className="text-charcoal/30" />
              <p className="font-medium text-forest-900">{txText.empty}</p>
              <p className="text-sm text-charcoal/55">{txText.emptyHint}</p>
            </div>
          ) : (
            <div className="divide-y divide-charcoal/8">
              {filteredTransactions.map((t, i) => {
                const Icon = iconFor(t.type);
                const amountPrefix = t.type === "Expense" ? "−" : "+";
                const amountColor = t.type === "Income" ? "text-[#0B6B47]" : t.type === "Expense" ? "text-rose-600" : "text-[#6F46B0]";
                return <div key={`${t.sheetRow ?? "local"}-${t.date}-${t.category}-${i}`} className="flex items-center gap-3 py-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colorFor(t.type)}`}><Icon size={19} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-forest-900">{t.description || t.category}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-charcoal/50">{t.category} · {formatTransactionDate(t.date)}</p>
                  </div>
                  <p className={`num shrink-0 text-right text-[13.5px] font-semibold ${amountColor}`}>{amountPrefix}{formatRupiah(t.amount)}</p>
                  <button type="button" aria-label={txText.edit} title={txText.edit} onClick={() => setEditingTransaction(t)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-charcoal/40 hover:bg-forest-50 hover:text-forest-700"><Pencil size={16}/></button>
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
      </div>}
    </div>
  );
}
