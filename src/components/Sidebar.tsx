import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { getAppLanguage } from "../lib/format";
import {
  Home,
  BarChart3,
  Receipt,
  CalendarRange,
  PieChart,
  Calculator,
  Shield,
  Settings,
  UsersRound,
  Wallet,
  X,
  ExternalLink,
} from "lucide-react";
import logoMark from "../assets/logo-mark-white.png";

const mainLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/finance", label: "Report", icon: BarChart3 },
  { to: "/assets", label: "Asset", icon: BarChart3 },
  { to: "/transactions", label: "Community", icon: UsersRound },
  { to: "/budgeting", label: "Monthly Budget", icon: PieChart },
];

const toolLinks = [
  { to: "/wallets", label: "Wallet", icon: Wallet },
  { to: "/calculator", label: "Financial Calculator", icon: Calculator },
  { to: "/protection", label: "Financial Protection", icon: Shield },
];

function NavItem({ to, label, icon: Icon, onNavigate, dataTour }: { to: string; label: string; icon: any; onNavigate?: () => void; dataTour?: string }) {
  return (
    <NavLink
      data-tour={dataTour}
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] transition-all ${
          isActive ? "sidebar-item-active" : "sidebar-item"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="sidebar-active-indicator absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#6EE7A8]" />}
          <Icon
            size={18}
            strokeWidth={2}
            className={isActive ? "sidebar-icon-active" : "sidebar-icon"}
          />
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
          <p className="text-[12px] text-charcoal/55">{getAppLanguage() === "id" ? "Keuangan Pribadi" : "Personal Finance"}</p>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [language, setLanguage] = useState(getAppLanguage());
  useEffect(() => { const update = () => setLanguage(getAppLanguage()); window.addEventListener("wealthplanner:language-changed", update); return () => window.removeEventListener("wealthplanner:language-changed", update); }, []);
  const labels = language === "id" ? { main: "Menu Utama", tools: "Alat", report: "Laporan", asset: "Aset", community: "Komunitas", budget: "Anggaran Bulanan", calculator: "Kalkulator Keuangan", protection: "Proteksi Finansial", guidance: "Panduan", profile: "Profil & Pengaturan", wallet: "Wallet", website: "Situs Web", personalFinance: "Keuangan Pribadi" } : { main: "Main", tools: "Tools", report: "Report", asset: "Asset", community: "Community", budget: "Monthly Budget", calculator: "Financial Calculator", protection: "Financial Protection", wallet: "Wallet", guidance: "Guidance", profile: "Profile & Settings", website: "Website", personalFinance: "Personal Finance" };
  return (
    <div className="flex flex-col h-full">
      <Brand />

      <div className="px-2 flex-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal/45 mt-2 mb-1.5">{labels.main}</p>
        <nav className="flex flex-col gap-0.5 mb-4">
          {mainLinks.map((l) => <NavItem key={l.to} {...l} dataTour={l.to === "/finance" ? "menu-report" : l.to === "/assets" ? "menu-asset" : l.to === "/budgeting" ? "menu-budget" : undefined} label={l.to === "/finance" ? labels.report : l.to === "/assets" ? labels.asset : l.to === "/transactions" ? labels.community : l.to === "/budgeting" ? labels.budget : l.label} onNavigate={onNavigate} />)}
        </nav>

        <p className="px-3 sidebar-group-label text-[11px] font-medium uppercase tracking-[0.08em] text-charcoal/45 mt-2 mb-1.5">{labels.tools}</p>
        <nav className="flex flex-col gap-0.5">
          {toolLinks.map((l) => <NavItem key={l.to} {...l} dataTour={l.to === "/calculator" ? "menu-calculator" : l.to === "/protection" ? "menu-protection" : undefined} label={l.to === "/wallets" ? labels.wallet : l.to === "/calculator" ? labels.calculator : labels.protection} onNavigate={onNavigate} />)}
          <a href="https://www.wealthplanner.id"  onClick={onNavigate} className="sidebar-item group flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] transition-all">
            <ExternalLink size={18} strokeWidth={2} className="sidebar-icon" />
            {labels.website}
          </a>
        </nav>
      </div>

      <div className="mx-2 mb-3 rounded-xl border border-[#E4E6E8] bg-white p-1 flex flex-col gap-0.5">
        <NavItem to="/settings" label={labels.profile} icon={Settings} onNavigate={onNavigate} />
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
