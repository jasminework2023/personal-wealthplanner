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
  ExternalLink,
  X,
} from "lucide-react";

const mainLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dashboard", label: "Dashboard Finance", icon: LayoutDashboard },
  { to: "/transactions", label: "Transaction Report", icon: Receipt },
  { to: "/budgeting", label: "Monthly Budgeting", icon: CalendarRange },
];

type ToolLink =
  | { href: string; to?: never; label: string; icon: any; external: true }
  | { href?: never; to: string; label: string; icon: any; external: false };

const toolLinks: ToolLink[] = [
  {
    href: "https://www.wealthplanner.id",
    label: "Kalkulator Finansial",
    icon: Calculator,
    external: true,
  },
  {
    to: "/protection",
    label: "Proteksi Finansial",
    icon: Shield,
    external: false,
  },
];

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[14px] transition-colors ${
          isActive
            ? "bg-forest-600 text-white font-medium"
            : "text-charcoal/70 hover:bg-forest-50 hover:text-forest-700"
        }`
      }
    >
      <Icon size={18} strokeWidth={2} />
      {label}
    </NavLink>
  );
}

function ExternalItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[14px] text-charcoal/70 hover:bg-rose-50 hover:text-rose-700 transition-colors"
    >
      <Icon size={18} strokeWidth={2} />
      <span className="flex-1">{label}</span>
      <ExternalLink size={13} className="opacity-50" />
    </a>
  );
}

function SidebarContent() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-4">
        <p className="text-[15px] font-semibold text-forest-900 tracking-tight">Wealthplanner</p>
        <p className="text-[12px] text-charcoal/50">Personal Finance</p>
      </div>

      <div className="px-2 flex-1 overflow-y-auto">
        <p className="px-3.5 text-[11px] font-medium uppercase tracking-wider text-charcoal/40 mt-2 mb-1.5">
          Main
        </p>
        <nav className="flex flex-col gap-0.5 mb-4">
          {mainLinks.map((l) => (
            <NavItem key={l.to} {...l} />
          ))}
        </nav>

        <p className="px-3.5 text-[11px] font-medium uppercase tracking-wider text-charcoal/40 mt-2 mb-1.5">
          Tools
        </p>
        <nav className="flex flex-col gap-0.5">
          {toolLinks.map((l) =>
            l.external ? (
              <ExternalItem key={l.href} {...l} />
            ) : (
              <NavItem key={l.to} to={l.to} label={l.label} icon={l.icon} />
            ),
          )}
        </nav>
      </div>

      <div className="px-2 pb-4 pt-2 border-t border-charcoal/8">
        <NavItem to="/settings" label="Settings" icon={Settings} />
        <NavItem to="/profile" label="Profile" icon={User} />
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-charcoal/8">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
        <button
          onClick={onClose}
          aria-label="Tutup menu"
          className="absolute right-3 top-4 p-1.5 rounded-lg hover:bg-charcoal/5"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </div>
    </div>
  );
}
