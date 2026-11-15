import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CreditCard, ArrowDownLeft, ArrowUpRight, CircleDollarSign } from "lucide-react";
import { Card } from "../components/Card";
import { formatRupiah, getAppLanguage } from "../lib/format";
import { useFinanceData, getStoredToken } from "../lib/useFinanceData";

type Debt = { id: string; name: string; dueDate: string; remainingPrincipal: number; minimumPayment: number; active: boolean };

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function normalizeDate(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const m = value.match(/^(\d{1,2})[\\/.-](\d{1,2})[\\/.-](\d{2,4})$/);
  if (!m) return "";
  let y = Number(m[3]);
  if (y < 100) y += y < 50 ? 2000 : 1900;
  const d = new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[1])));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function Calendar() {
  const id = getAppLanguage() === "id";
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const monthName = MONTHS[month];
  const { transactions, loading, isRealData } = useFinanceData(monthName, true, year);
  const [debts, setDebts] = useState<Debt[]>([]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    fetch("/api/debt-tracker?token=" + encodeURIComponent(token))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDebts(d.debts || []); })
      .catch(() => {});
  }, []);

  const txByDate = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    transactions.forEach(t => {
      const date = normalizeDate(t.date);
      if (!date) return;
      const list = map.get(date) || [];
      list.push(t);
      map.set(date, list);
    });
    return map;
  }, [transactions]);

  const debtByDate = useMemo(() => {
    const map = new Map<string, Debt[]>();
    debts.filter(d => d.active && d.dueDate && d.remainingPrincipal > 0).forEach(d => {
      const date = normalizeDate(d.dueDate);
      if (!date) return;
      const x = new Date(date + "T00:00:00");
      if (x.getMonth() !== month || x.getFullYear() !== year) return;
      const list = map.get(date) || [];
      list.push(d);
      map.set(date, list);
    });
    return map;
  }, [debts, month, year]);

  const events = useMemo(() => {
    const result: { date: string; title: string; amount: number; kind: "income"|"expense"|"saving"|"debt" }[] = [];
    txByDate.forEach((list, date) => list.forEach(t => {
      if (t.type === "Income" || t.type === "Expense" || t.type === "Saving") {
        result.push({ date, title: t.description || t.category || "Transaksi", amount: t.amount, kind: t.type === "Income" ? "income" : t.type === "Saving" ? "saving" : "expense" });
      }
    }));
    debtByDate.forEach((list, date) => list.forEach(d => result.push({ date, title: "Jatuh tempo · " + d.name, amount: d.minimumPayment || d.remainingPrincipal, kind: "debt" })));
    return result.sort((a,b) => a.date.localeCompare(b.date));
  }, [txByDate, debtByDate]);

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = (first.getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: start + count }, (_, i) => i < start ? null : i - start + 1);
  }, [month, year]);

  const summary = {
    income: events.filter(e => e.kind === "income").reduce((s,e) => s + e.amount, 0),
    expense: events.filter(e => e.kind === "expense").reduce((s,e) => s + e.amount, 0),
    debt: events.filter(e => e.kind === "debt").reduce((s,e) => s + e.amount, 0)
  };

  const changeMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
  };

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const weekdays = id ? ["Sen","Sel","Rab","Kam","Jum","Sab","Min"] : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  if (loading) return <div className="space-y-3"><div className="h-24 animate-pulse rounded-3xl bg-charcoal/[0.06]"/><div className="h-[500px] animate-pulse rounded-3xl bg-charcoal/[0.06]"/></div>;

  return <div className="flex flex-col gap-3">
    <div className="flex items-start justify-between">
      <div><h1 className="text-[20px] font-bold text-forest-900">{id ? "Kalender Keuangan" : "Financial Calendar"}</h1><p className="mt-1 text-[12px] text-charcoal/55">{id ? "Transaksi dan jatuh tempo dalam satu kalender." : "Transactions and due dates in one calendar."}</p></div>
      <CalendarDays size={23} className="mt-1 text-forest-700"/>
    </div>

    {!isRealData ? <Card><div className="py-12 text-center"><CalendarDays className="mx-auto text-charcoal/25" size={34}/><p className="mt-3 font-semibold text-forest-900">Lengkapi data dulu</p><p className="mt-1 text-xs text-charcoal/50">Kalender akan terisi otomatis dari transaksi dan utangmu.</p></div></Card> : <>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-[#DFF3E7] px-3 py-3"><p className="text-[10px] text-charcoal/55">Pemasukan</p><p className="mt-1 truncate text-[13px] font-bold text-[#0B6B47]">{formatRupiah(summary.income)}</p></div>
        <div className="rounded-2xl bg-[#FDE3EA] px-3 py-3"><p className="text-[10px] text-charcoal/55">Pengeluaran</p><p className="mt-1 truncate text-[13px] font-bold text-[#C23A5B]">{formatRupiah(summary.expense)}</p></div>
        <div className="rounded-2xl bg-[#FFF0D9] px-3 py-3"><p className="text-[10px] text-charcoal/55">Jatuh tempo</p><p className="mt-1 truncate text-[13px] font-bold text-[#C47A19]">{formatRupiah(summary.debt)}</p></div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => changeMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10" aria-label="Bulan sebelumnya"><ChevronLeft size={18}/></button>
          <div className="text-center"><p className="text-[16px] font-bold text-forest-900">{monthName} {year}</p><button type="button" onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }} className="text-[10px] font-semibold text-forest-700">Hari ini</button></div>
          <button type="button" onClick={() => changeMonth(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10" aria-label="Bulan berikutnya"><ChevronRight size={18}/></button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1">
          {weekdays.map(d => <div key={d} className="py-1 text-center text-[9px] font-semibold uppercase text-charcoal/40">{d}</div>)}
          {days.map((day, index) => {
            if (!day) return <div key={"blank-" + index} className="min-h-[72px] sm:min-h-[88px]"/>;
            const date = new Date(year, month, day);
            const iso = date.toISOString().slice(0, 10);
            const txs = txByDate.get(iso) || [];
            const due = debtByDate.get(iso) || [];
            const isToday = iso === todayIso;
            return <div key={iso} className={"min-h-[72px] rounded-xl border p-1.5 sm:min-h-[88px] " + (isToday ? "border-forest-500 bg-forest-50/60" : "border-charcoal/8 bg-white")}>
              <p className={"text-[10px] font-bold " + (isToday ? "text-forest-700" : "text-charcoal/55")}>{day}</p>
              <div className="mt-1 space-y-0.5">
                {txs.some(t => t.type === "Income") && <span className="block truncate rounded bg-[#DFF3E7] px-1 py-0.5 text-[8px] font-semibold text-[#0B6B47]">+ Pemasukan</span>}
                {txs.some(t => t.type === "Expense") && <span className="block truncate rounded bg-[#FDE3EA] px-1 py-0.5 text-[8px] font-semibold text-[#C23A5B]">− Pengeluaran</span>}
                {due.length > 0 && <span className="block truncate rounded bg-[#FFF0D9] px-1 py-0.5 text-[8px] font-semibold text-[#C47A19]">• Jatuh tempo</span>}
              </div>
            </div>;
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between"><h2 className="text-[14px] font-bold text-forest-900">Agenda bulan ini</h2><span className="text-[10px] text-charcoal/45">{events.length} agenda</span></div>
        <div className="mt-3 space-y-1">
          {events.length ? events.map((e, i) => {
            const Icon = e.kind === "income" ? ArrowDownLeft : e.kind === "expense" ? ArrowUpRight : e.kind === "debt" ? CreditCard : CircleDollarSign;
            const cls = e.kind === "income" ? "bg-[#DFF3E7] text-[#0B6B47]" : e.kind === "expense" ? "bg-[#FDE3EA] text-[#C23A5B]" : e.kind === "debt" ? "bg-[#FFF0D9] text-[#C47A19]" : "bg-[#EAF0FF] text-[#4663A8]";
            return <div key={e.date + "-" + i} className="flex items-center gap-3 rounded-xl border border-charcoal/7 px-3 py-2.5"><span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " + cls}><Icon size={15}/></span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-charcoal/80">{e.title}</p><p className="mt-0.5 text-[10px] text-charcoal/45">{new Date(e.date + "T00:00:00").toLocaleDateString(id ? "id-ID" : "en-US", { day: "numeric", month: "long" })}</p></div><span className="shrink-0 text-[11px] font-bold tabular-nums text-forest-900">{formatRupiah(e.amount)}</span></div>;
          }) : <div className="py-8 text-center text-xs text-charcoal/45">Belum ada agenda keuangan</div>}
        </div>
      </Card>
    </>}
  </div>;
}