import { useEffect, useState } from "react";
import { getAppLanguage } from "../lib/format";
import { AddTransactionModal } from "./AddTransactionModal";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DesktopSidebar, MobileSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DateHeader } from "./DateHeader";
import { ThemeToggle } from "./ThemeToggle";
import { Wallet, ArrowLeftRight, Target, UserRound, Plus, Sparkles, X, ChartNoAxesCombined } from "lucide-react";

const titles: Record<string, string> = {
  "/": "Home",
  "/finance": "Finance Report",
  "/transactions": "Community",
  "/transaction": "Transaction",
  "/budgeting": "Budgeting & Realization",
  "/calculator": "Financial Calculator",
  "/protection": "Proteksi Finansial",
  "/settings": "Profile & Settings",
  "/guidance": "Guidance",
  "/goals": "Goals",
};

export function AppShell() {
  const [language, setLanguage] = useState(getAppLanguage());
  useEffect(() => { const updateLanguage = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", updateLanguage); return () => window.removeEventListener("wealthplanner:language-changed", updateLanguage); }, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionMode, setTransactionMode] = useState<"manual" | "ai">("manual");
  const navLabels = language === "id" ? { home: "Beranda", goals: "Target", close: "Tutup", quickAdd: "Tulis transaksi atau unggah foto struk" } : { home: "Home", goals: "Goals", close: "Close", quickAdd: "Enter a transaction or upload a receipt photo" };
  const location = useLocation();
  const navigate = useNavigate();
  const titleId: Record<string, string> = { "/": "Home", "/finance": "Finance Report", "/transactions": "Komunitas", "/transaction": "Transaksi", "/budgeting": "Anggaran Bulanan", "/calculator": "Kalkulator Keuangan", "/protection": "Proteksi Finansial", "/settings": "Profil & Pengaturan", "/guidance": "Panduan", "/goals": "Target" };
  const title = language === "en" ? (location.pathname.startsWith("/calculator/") ? "Financial Calculator" : (titles[location.pathname] ?? "Wealthplanner")) : (location.pathname.startsWith("/calculator/") ? "Kalkulator Keuangan" : (titleId[location.pathname] ?? "Wealthplanner"));

  return (
    <div className="min-h-screen flex bg-cream">
      <DesktopSidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-32 lg:py-8">
          <div className="hidden lg:flex items-center justify-end gap-3 mb-2">
            <DateHeader />
            <ThemeToggle variant="compact" />
          </div>
          <Outlet />
        </main>
        <nav aria-label={language === "id" ? "Navigasi utama" : "Main navigation"} className="pointer-events-none fixed inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] z-40 px-4 pb-0 lg:hidden">
          <div className="wp-nav pointer-events-auto mx-auto grid h-16 max-w-md grid-cols-5 items-center rounded-[22px] px-2">
            {([
              { to: "/", label: navLabels.home, Icon: Wallet },
              { to: "/transaction", label: language === "id" ? "Transaksi" : "Transaction", Icon: ArrowLeftRight },
            ] as const).map(({ to, label, Icon }) => {
              const active = location.pathname === to;
              return <button key={to} onClick={() => navigate(to)} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-0.5 py-0.5">
                <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${active ? "text-accent-text" : "text-muted"}`}><Icon size={19} strokeWidth={active ? 2.4 : 2}/></span>
                <span className={`text-[10px] font-semibold ${active ? "text-accent-text" : "text-muted"}`}>{label}</span>
              </button>;
            })}
            <button onClick={() => setQuickAddOpen(true)} aria-label={language === "id" ? "Tambah transaksi" : "Add transaction"} className="relative -mt-7 mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-accent-ink shadow-pop ring-[5px] ring-[rgb(var(--c-cream))]"><Plus size={28} strokeWidth={2.6}/></button>
            {([
              { to: "/goals", label: navLabels.goals, Icon: Target },
              { to: "/settings", label: language === "id" ? "Profil" : "Profile", Icon: UserRound },
            ] as const).map(({ to, label, Icon }) => {
              const active = location.pathname === to;
              return <button key={to} onClick={() => navigate(to)} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-0.5 py-0.5">
                <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${active ? "text-accent-text" : "text-muted"}`}><Icon size={19} strokeWidth={active ? 2.4 : 2}/></span>
                <span className={`text-[10px] font-semibold ${active ? "text-accent-text" : "text-muted"}`}>{label}</span>
              </button>;
            })}
          </div>
        </nav>
        {quickAddOpen && <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center">
          <div className="wp-backdrop absolute inset-0 bg-[#0F2A20]/45 backdrop-blur-[2px]" onClick={() => setQuickAddOpen(false)} />
          <div className="wp-sheet relative w-full max-w-sm rounded-[28px] bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-float" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-charcoal/15" />
            <div className="mb-4 flex items-center justify-between"><h3 className="text-[17px] font-bold tracking-[-0.02em] text-forest-900">{language === "id" ? "Tambah Transaksi" : "Add Transaction"}</h3><button onClick={() => setQuickAddOpen(false)} aria-label={navLabels.close} className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal/[0.06] text-charcoal/60"><X size={18}/></button></div>
            <button onClick={() => { setTransactionMode("manual"); setTransactionModalOpen(true); setQuickAddOpen(false); }} className="mb-2.5 flex w-full items-center gap-3.5 rounded-2xl bg-accent/20 p-3.5 text-left"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink"><Plus size={21} strokeWidth={2.4}/></span><span><span className="block text-[14px] font-bold text-forest-900">{language === "id" ? "Tambah Transaksi Manual" : "Add Transaction Manually"}</span><span className="mt-0.5 block text-[12px] text-charcoal/55">{language === "id" ? "Isi pemasukan, pengeluaran, atau tabungan" : "Enter income, expenses, or savings"}</span></span></button>
            <button onClick={() => { setTransactionMode("ai"); setTransactionModalOpen(true); setQuickAddOpen(false); }} className="flex w-full items-center gap-3.5 rounded-2xl bg-[#123524] p-3.5 text-left text-white"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-[#6EE7A8]"><Sparkles size={20}/></span><span><span className="block text-[14px] font-bold">{language === "id" ? "Catat dengan AI" : "Track with AI"}</span><span className="mt-0.5 block text-[12px] text-white/65">{navLabels.quickAdd}</span></span></button>
          </div>
        </div>}
        <AddTransactionModal open={transactionModalOpen} onClose={() => setTransactionModalOpen(false)} onAdd={() => {}} initialMode={transactionMode}/>
      </div>
    </div>
  );
}
