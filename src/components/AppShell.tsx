import { useState } from "react";
import { AddTransactionModal } from "./AddTransactionModal";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DesktopSidebar, MobileSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DateHeader } from "./DateHeader";
import { ThemeToggle } from "./ThemeToggle";
import { Wallet, ArrowLeftRight, Target, UserRound, Plus, Sparkles, X, ChartNoAxesCombined } from "lucide-react";

const titles: Record<string, string> = {
  "/": "Home",
  "/finance": "Report",
  "/transactions": "Report",
  "/transaction": "Transaction",
  "/budgeting": "Budgeting & Realization",
  "/calculator": "Financial Calculator",
  "/protection": "Proteksi Finansial",
  "/settings": "Profile & Settings",
  "/guidance": "Guidance",
};

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionMode, setTransactionMode] = useState<"manual" | "ai">("manual");
  const location = useLocation();
  const navigate = useNavigate();
  const title = location.pathname.startsWith("/calculator/") ? "Financial Calculator" : (titles[location.pathname] ?? "Wealthplanner");

  return (
    <div className="min-h-screen flex bg-cream">
      <DesktopSidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:py-8">
          <div className="hidden lg:flex items-center justify-end gap-3 mb-2">
            <DateHeader />
            <ThemeToggle variant="compact" />
          </div>
          <Outlet />
        </main>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rose-100 bg-white/95 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
            <button onClick={() => navigate("/")} className={`flex flex-col items-center gap-1 py-1 ${location.pathname === "/" ? "text-forest-700" : "text-charcoal/55"}`}><Wallet size={19}/><span className="text-[10px] font-medium">Home</span></button>
            <button onClick={() => navigate("/finance")} className={`flex flex-col items-center gap-1 py-1 ${location.pathname === "/finance" ? "text-forest-700" : "text-charcoal/55"}`}><ChartNoAxesCombined size={19}/><span className="text-[10px] font-medium">Report</span></button>
            <button onClick={() => setQuickAddOpen(true)} aria-label="Tambah transaksi" className="-mt-5 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-700 text-white shadow-lg ring-4 ring-white"><Plus size={24}/></button>
            <button onClick={() => navigate("/goals")} className={`flex flex-col items-center gap-1 py-1 ${location.pathname === "/goals" ? "text-forest-700" : "text-charcoal/55"}`}><Target size={19}/><span className="text-[10px] font-medium">Goals</span></button>
            <button onClick={() => navigate("/settings")} className={`flex flex-col items-center gap-1 py-1 ${location.pathname === "/settings" ? "text-forest-700" : "text-charcoal/55"}`}><UserRound size={19}/><span className="text-[10px] font-medium">Profil</span></button>
          </div>
        </div>
        {quickAddOpen && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/35 p-4 sm:items-center" onClick={() => setQuickAddOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h3 className="text-[16px] font-semibold text-forest-900">Tambah Transaksi</h3><button onClick={() => setQuickAddOpen(false)} aria-label="Tutup" className="rounded-lg p-1 text-charcoal/50"><X size={18}/></button></div>
            <button onClick={() => { setTransactionMode("manual"); setTransactionModalOpen(true); setQuickAddOpen(false); }} className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-rose-100 p-3 text-left hover:bg-rose-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-forest-700"><Plus size={19}/></span><span><span className="block text-[13px] font-semibold text-forest-900">Tambah Transaksi Manual</span><span className="block text-[11px] text-charcoal/50">Isi pemasukan, pengeluaran, atau tabungan</span></span></button>
            <button onClick={() => { setTransactionMode("ai"); setTransactionModalOpen(true); setQuickAddOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-rose-100 p-3 text-left hover:bg-rose-50/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-forest-700"><Sparkles size={19}/></span><span><span className="block text-[13px] font-semibold text-forest-900">Catat dengan AI</span><span className="block text-[11px] text-charcoal/50">Tulis transaksi atau unggah foto struk</span></span></button>
          </div>
        </div>}
        <AddTransactionModal open={transactionModalOpen} onClose={() => setTransactionModalOpen(false)} onAdd={() => {}} initialMode={transactionMode}/>
      </div>
    </div>
  );
}
