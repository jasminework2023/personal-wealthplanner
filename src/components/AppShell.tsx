import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DesktopSidebar, MobileSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DateHeader } from "./DateHeader";
import { ThemeToggle } from "./ThemeToggle";
import { Wallet, ArrowLeftRight, Target, BookOpen, Plus } from "lucide-react";

const titles: Record<string, string> = {
  "/": "Home",
  "/finance": "Dashboard Finance",
  "/transactions": "Transaction Report",
  "/budgeting": "Budgeting & Realization",
  "/calculator": "Financial Calculator",
  "/protection": "Proteksi Finansial",
  "/settings": "Profile & Settings",
  "/guidance": "Guidance",
};

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
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
            <button onClick={() => navigate("/transactions")} className={`flex flex-col items-center gap-1 py-1 ${location.pathname === "/transactions" ? "text-forest-700" : "text-charcoal/55"}`}><ArrowLeftRight size={19}/><span className="text-[10px] font-medium">Transaksi</span></button>
            <button onClick={() => navigate("/transactions")} aria-label="Tambah transaksi" className="-mt-5 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-700 text-white shadow-lg ring-4 ring-white"><Plus size={24}/></button>
            <button onClick={() => navigate("/goals")} className={`flex flex-col items-center gap-1 py-1 ${location.pathname === "/goals" ? "text-forest-700" : "text-charcoal/55"}`}><Target size={19}/><span className="text-[10px] font-medium">Goals</span></button>
            <button onClick={() => navigate("/settings")} className={`flex flex-col items-center gap-1 py-1 ${location.pathname === "/settings" ? "text-forest-700" : "text-charcoal/55"}`}><BookOpen size={19}/><span className="text-[10px] font-medium">Profil</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
