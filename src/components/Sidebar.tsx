import { NavLink } from "react-router-dom";
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
} from "lucide-react";

const mainLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/finance", label: "Dashboard Finance", icon: LayoutDashboard },
  { to: "/transactions", label: "Transaction Report", icon: Receipt },
  { to: "/budgeting", label: "Monthly Budgeting", icon: CalendarRange },
];

const toolLinks = [
  { to: "/calculator", label: "Kalkulator Finansial", icon: Calculator },
  { to: "/protection", label: "Proteksi Finansial", icon: Shield },
];

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-all ${
          isActive
            ? "bg-white/12 text-white font-semibold shadow-sm"
            : "text-white/78 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-rose-300" />}
          <Icon
            size={18}
            strokeWidth={2}
            className={isActive ? "text-rose-200" : "text-white/55 group-hover:text-rose-200"}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-4">
        <p className="text-[15px] font-semibold text-white tracking-tight">Wealthplanner</p>
        <p className="text-[12px] text-white/60">Personal Finance</p>
      </div>

      <div className="px-2 flex-1 overflow-y-auto">
        <p className="px-3.5 text-[11px] font-medium uppercase tracking-wider text-white/50 mt-2 mb-1.5">Main</p>
        <nav className="flex flex-col gap-0.5 mb-4">
          {mainLinks.map((l) => <NavItem key={l.to} {...l} />)}
        </nav>

        <p className="px-3.5 text-[11px] font-medium uppercase tracking-wider text-white/50 mt-2 mb-1.5">Tools</p>
        <nav className="flex flex-col gap-0.5">
          {toolLinks.map((l) => <NavItem key={l.to} {...l} />)}
        </nav>
      </div>

      <div className="px-2 pb-4 pt-2 border-t border-white/12 flex flex-col gap-0.5">
        <NavItem to="/guidance" label="Guidance" icon={BookOpen} />
        <NavItem to="/settings" label="Settings" icon={Settings} />
        <NavItem to="/profile" label="Profile" icon={User} />
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
        <SidebarContent />
      </div>
    </div>
  );
}
