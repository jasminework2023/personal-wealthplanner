import { useMemo, useState } from "react";
import { Search, Plus, Sparkles, Pencil, Download } from "lucide-react";
import { Card } from "../components/Card";
import { TransactionBadge } from "../components/TransactionBadge";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { DataStatusBanner } from "../components/DataStatusBanner";
import { formatRupiah } from "../lib/format";
import { useFinanceData } from "../lib/useFinanceData";
import type { Transaction, TransactionType } from "../data/types";
import { EditTransactionModal } from "../components/EditTransactionModal";

export function TransactionReport() {
  const { isRealData, username, error, transactions, setup } = useFinanceData(undefined, true);
  const [extraTxs, setExtraTxs] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"manual" | "ai">("manual");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deletedKeys, setDeletedKeys] = useState<Set<string>>(new Set());

  const transactionKey = (t: Transaction) =>
    t.sheetRow ? `sheet:${t.sheetRow}` : `local:${t.date}|${t.type}|${t.category}|${t.description}|${t.amount}`;
  const allTxs = [...transactions, ...extraTxs].filter((t) => !deletedKeys.has(transactionKey(t)));
  const categories = useMemo(() => {
    const setupCategories = [
      ...setup.income.filter((x) => x.active).map((x) => x.name),
      ...setup.expense.filter((x) => x.active).map((x) => x.name),
      ...setup.saving.filter((x) => x.active).map((x) => x.name),
    ];
    return Array.from(new Set([...setupCategories, ...allTxs.map((t) => t.category)]));
  }, [allTxs, setup]);

  // Tanggal dari sheet bisa datang sebagai M/D/Y ("6/5/2026" = 5 Juni) atau
  // D/M/Y. Kolom "Month" dipakai sebagai penentu supaya urutannya benar.
  const MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];

  const parseDate = (date: string, monthLabel?: string) => {
    const parts = date.split("/").map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return 0;
    const [a, b, y] = parts;

    let month = b;
    let day = a;

    const idx = monthLabel ? MONTH_NAMES.indexOf(monthLabel.trim().toLowerCase()) : -1;
    if (idx !== -1) {
      const monthNum = idx + 1;
      if (a === monthNum && b !== monthNum) {
        month = a; // format M/D/Y
        day = b;
      } else if (b === monthNum) {
        month = b; // format D/M/Y
        day = a;
      }
    } else if (a > 12 && b <= 12) {
      month = b;
      day = a;
    } else if (b > 12 && a <= 12) {
      month = a;
      day = b;
    }

    return new Date(y || 0, (month || 1) - 1, day || 1).getTime();
  };

  const filtered = allTxs.filter((t) => {
    if (typeFilter !== "All" && t.type !== typeFilter) return false;
    if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase()) && !t.category.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <DataStatusBanner isRealData={isRealData} username={username} error={error} />

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-forest-900">Transaction Report</h1>
          <p className="text-[14px] text-charcoal/60 mt-0.5">Catat dan pantau setiap pergerakan uangmu.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              setModalMode("manual");
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 border border-charcoal/15 bg-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-charcoal/5"
          >
            <Plus size={15} /> Tambah Transaksi
          </button>
          <button
            onClick={() => {
              setModalMode("ai");
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-rose-600 text-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-rose-700"
          >
            <Sparkles size={15} /> Catat dengan AI
          </button>
          <button type="button" onClick={() => {
            const rows = [["Date","Month","Type","Category","Description","Amount"], ...filtered.map(t => [t.date,t.month,t.type,t.category,t.description,String(t.amount)])];
            const csv = rows.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"}); const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="wealthplanner-transactions.csv"; a.click(); URL.revokeObjectURL(url);
          }} className="flex items-center justify-center gap-1.5 border border-charcoal/15 bg-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-charcoal/5"><Download size={15}/> Export CSV</button>
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
          <div className="py-10 text-center">
            <div className="text-[14px] font-semibold text-forest-900">Belum ada transaksi yang cocok</div>
            <p className="mt-1 text-[13px] text-charcoal/50">Mulai catat transaksi secara manual atau gunakan AI untuk membantu membaca transaksi.</p>
            <button type="button" onClick={()=>{setModalMode("manual");setModalOpen(true)}} className="mt-4 rounded-lg bg-forest-600 px-4 py-2 text-[13px] font-semibold text-white">+ Tambah Transaksi</button>
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto rounded-xl border border-charcoal/8">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-charcoal/50 text-[12px] border-b border-charcoal/8 bg-charcoal/[0.025]">
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 font-medium">Type</th>
                  <th className="py-2.5 font-medium">Category</th>
                  <th className="py-2.5 font-medium">Description</th>
                  <th className="py-2.5 px-4 font-medium text-right">Total</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...filtered]
                  .sort((a, b) => parseDate(b.date, b.month) - parseDate(a.date, a.month))
                  .map((t, i) => (
                    <tr key={`${transactionKey(t)}-${i}`} className="border-b border-charcoal/8 last:border-0 hover:bg-charcoal/[0.02]">
                      <td className="py-3 px-4 whitespace-nowrap">{t.date}</td>
                      <td className="py-3"><TransactionBadge type={t.type} /></td>
                      <td className="py-3">{t.category}</td>
                      <td className="py-3 max-w-[260px] truncate">{t.description}</td>
                      <td className={`py-3 px-4 text-right font-medium whitespace-nowrap ${t.type === "Expense" ? "text-rose-600" : "text-forest-700"}`}>
                        {t.type === "Expense" ? "-" : "+"}{formatRupiah(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-right"><button onClick={()=>setEditing(t)} className="inline-flex items-center gap-1 rounded-md border border-charcoal/10 px-2 py-1 text-[11px] text-charcoal/60 hover:text-forest-700 hover:border-forest-200"><Pencil size={11}/> Edit</button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden flex flex-col gap-3">
            {[...filtered]
              .sort((a, b) => parseDate(b.date, b.month) - parseDate(a.date, a.month))
              .map((t, i) => (
                <div key={`${transactionKey(t)}-${i}`} className="rounded-xl border border-charcoal/10 p-3 bg-white/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[13px] text-forest-900 break-words">{t.description}</p>
                      <p className="text-[11px] text-charcoal/50 mt-0.5">{t.date} · {t.category}</p>
                    </div>
                    <button onClick={()=>setEditing(t)} className="shrink-0 inline-flex items-center gap-1 rounded-md border border-charcoal/10 px-2 py-1 text-[11px] text-charcoal/60"><Pencil size={11}/> Edit</button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <TransactionBadge type={t.type} />
                    <span className={`font-semibold text-[14px] ${t.type === "Expense" ? "text-rose-600" : "text-forest-700"}`}>
                      {t.type === "Expense" ? "-" : "+"}{formatRupiah(t.amount)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          </>
        )}
      </Card>

      <EditTransactionModal open={!!editing} transaction={editing} onClose={()=>setEditing(null)} onSaved={(next)=>{setExtraTxs(prev=>prev.map(x=>x===editing?next:x)); setEditing(null); window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added"));}} onDeleted={(old)=>{setDeletedKeys(prev=>new Set(prev).add(transactionKey(old)));setExtraTxs(prev=>prev.filter(x=>transactionKey(x)!==transactionKey(old)));setEditing(null);window.dispatchEvent(new CustomEvent("wealthplanner:transaction-added"));}} />

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
