import { NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import {
  Home,
  LayoutDashboard,
  Receipt,
  CalendarRange,
  Calculator,
  Shield,
  Settings,
  User,
  BookOpen,
  X,
  Globe,
} from "lucide-react";

const mainLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/finance", label: "Dashboard Finance", icon: LayoutDashboard },
  { to: "/transactions", label: "Transaction Report", icon: Receipt },
  { to: "/budgeting", label: "Monthly Budget", icon: CalendarRange },
];

const toolLinks = [
  { to: "/calculator", label: "Financial Calculator", icon: Calculator },
  { to: "/protection", label: "Financial Protection", icon: Shield },
];

function NavItem({ to, label, icon: Icon, onNavigate }: { to: string; label: string; icon: any; onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-all ${
          isActive
            ? "bg-rose-500/15 text-rose-200 font-semibold"
            : "text-white hover:bg-white/10 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-rose-400" />}
          <Icon
            size={18}
            strokeWidth={2}
            className={isActive ? "text-rose-300" : "text-white/75 group-hover:text-rose-300"}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

function Brand() {
  return (
    <div className="px-4 pt-5 pb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-sm" aria-hidden>
          <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
            <path d="M8 25.5 13.5 14l6 11.5L25 14l7 11.5" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 30h20" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity=".7"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white tracking-tight">Wealthplanner</p>
          <p className="text-[12px] text-white/65">Personal Finance</p>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <Brand />

      <div className="px-2 flex-1 overflow-y-auto">
        <p className="px-3.5 text-[11px] font-medium uppercase tracking-wider text-white/50 mt-2 mb-1.5">Main</p>
        <nav className="flex flex-col gap-0.5 mb-4">
          {mainLinks.map((l) => <NavItem key={l.to} {...l} onNavigate={onNavigate} />)}
        </nav>

        <p className="px-3.5 text-[11px] font-medium uppercase tracking-wider text-white/50 mt-2 mb-1.5">Tools</p>
        <nav className="flex flex-col gap-0.5">
          {toolLinks.map((l) => <NavItem key={l.to} {...l} onNavigate={onNavigate} />)}
        </nav>
        <a href="https://www.wealthplanner.id" target="_blank" rel="noreferrer" className="group mx-2 mt-2 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] text-white hover:bg-white/10 hover:text-white transition-all">
          <Globe size={18} strokeWidth={2} className="text-white/75 group-hover:text-rose-300" />
          <span className="flex-1">Website</span>
          <span aria-hidden className="text-white/50">↗</span>
        </a>
      </div>

      <div className="px-2 pb-4 pt-2 border-t border-white/12 flex flex-col gap-0.5">
        <ThemeToggle />
        <NavItem to="/guidance" label="Guidance" icon={BookOpen} onNavigate={onNavigate} />
        <NavItem to="/settings" label="Settings" icon={Settings} onNavigate={onNavigate} />
        <NavItem to="/profile" label="Profile" icon={User} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 h-screen sticky top-0 bg-forest-700 border-r border-white/10">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-forest-700 shadow-xl">
        <button onClick={onClose} aria-label="Tutup menu" className="absolute right-3 top-4 p-1.5 rounded-lg hover:bg-white/10 text-white">
          <X size={18} />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
