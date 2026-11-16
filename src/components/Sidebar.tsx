import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getAppLanguage } from "../lib/format";
import {
  Home,
  BarChart3,
  Receipt,
  CalendarRange,
  CalendarDays,
  CreditCard,
  PieChart,
  Calculator,
  Shield,
  Settings,
  Wallet,
  X,
  Sparkles,
  CircleCheck,
} from "lucide-react";
import logoMark from "../assets/logo-mark-white.png";

const mainLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/transaction", label: "Transaction", icon: Receipt },
  { to: "/budgeting", label: "Budget", icon: PieChart },
  { to: "/finance", label: "Asset & Report", icon: BarChart3 },
  { to: "/calculator", label: "Calculator", icon: Calculator },
  { to: "/goals", label: "Goals", icon: CalendarRange },
  { to: "/protection", label: "Protection", icon: Shield },
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/guidance", label: "Guide", icon: CircleCheck },
];

const toolLinks = [
  { to: "/wallets", label: "Wallet", icon: Wallet },
  { to: "/checkup", label: "Consultation", icon: CircleCheck },
];

function NavItem({ to, label, icon: Icon, onNavigate, dataTour }: { to: string; label: string; icon: any; onNavigate?: () => void; dataTour?: string }) {
  return (
    <NavLink
      data-tour={dataTour}
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] transition-all ${isActive ? "sidebar-item-active" : "sidebar-item"}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="sidebar-active-indicator absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#6EE7A8]" />}
          <Icon size={18} strokeWidth={2} className={isActive ? "sidebar-icon-active" : "sidebar-icon"} />
          {label}
        </>
      )}
    </NavLink>
  );
}

function Brand() {
  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B6B47]" aria-hidden>
          <img src={logoMark} alt="Wealthplanner" className="h-6 w-6 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-forest-900 tracking-tight">wealthplanner.id</p>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [language, setLanguage] = useState(getAppLanguage());
  useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const labels = language === "id"
    ? { main: "Menu Utama", tools: "Alat", report: "Aset & Laporan", budget: "Anggaran", calculator: "Kalkulator", protection: "Proteksi", checkup: "Konsultasi", profile: "Profil & Pengaturan", wallet: "Wallet", transaction: "Transaksi", goals: "Target", aiAssistant: "Asisten AI", guide: "Panduan" }
    : { main: "Main", tools: "Tools", report: "Asset & Report", budget: "Budget", calculator: "Calculator", protection: "Protection", checkup: "Consultation", profile: "Profile & Settings", wallet: "Wallet", transaction: "Transaction", goals: "Goals", aiAssistant: "AI Assistant", guide: "Guide" };
  return (
    <div className="flex flex-col h-full">
      <Brand />

      <div className="px-2 flex-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal/45 mt-2 mb-1.5">{labels.main}</p>
        <nav className="flex flex-col gap-0.5 mb-4">
          {mainLinks.map((l) => <NavItem key={l.to} {...l} dataTour={l.to === "/finance" ? "menu-report" : l.to === "/budgeting" ? "menu-budget" : l.to === "/transaction" ? "menu-transaction" : l.to === "/goals" ? "menu-goals" : l.to === "/calculator" ? "menu-calculator" : l.to === "/protection" ? "menu-protection" : undefined} label={l.to === "/finance" ? labels.report : l.to === "/budgeting" ? labels.budget : l.to === "/transaction" ? labels.transaction : l.to === "/goals" ? labels.goals : l.to === "/ai-assistant" ? labels.aiAssistant : l.to === "/guidance" ? labels.guide : l.label} onNavigate={onNavigate} />)}
        </nav>

        <p className="px-3 sidebar-group-label text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal/45 mt-2 mb-1.5">{labels.tools}</p>
        <nav className="flex flex-col gap-0.5">
          {toolLinks.map((l) => <NavItem key={l.to} {...l} dataTour={l.to === "/wallets" ? "menu-wallet" : l.to === "/checkup" ? "menu-checkup" : undefined} label={l.to === "/wallets" ? labels.wallet : l.to === "/checkup" ? labels.checkup : l.label} onNavigate={onNavigate} />)}
          <div className="group flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] text-charcoal/35 cursor-default">
            <Sparkles size={18} strokeWidth={2} className="opacity-50" />
            Community
            <span className="ml-auto text-[9px] font-medium uppercase tracking-wide">Soon</span>
          </div>
        </nav>
      </div>

      <div className="mx-2 mb-3">
        <NavLink data-tour="sidebar-profile" to="/settings" onClick={onNavigate} className="sidebar-item group flex w-full items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] transition-all">
          <Settings size={18} strokeWidth={2} className="sidebar-icon" />
          {labels.profile}
        </NavLink>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside data-tour="desktop-sidebar" className="desktop-sidebar hidden lg:flex lg:flex-col w-[232px] shrink-0 h-screen sticky top-0 bg-[#F7F7F5] border-r border-[#E4E6E8]">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-[#F7F7F5] border-r border-[#E4E6E8] shadow-xl">
        <button onClick={onClose} aria-label="Tutup menu" className="absolute right-3 top-4 p-1.5 rounded-lg hover:bg-charcoal/[0.06] text-charcoal/60">
          <X size={18} />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
