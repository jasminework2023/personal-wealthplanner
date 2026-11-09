import { Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-cream/85 backdrop-blur-xl px-4 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] flex items-center gap-3">
      <button
        onClick={onMenuClick}
        aria-label="Buka menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-forest-100/70 bg-surface text-forest-800 shadow-sm"
      >
        <Menu size={19} />
      </button>
      <div className="min-w-0 flex-1 leading-none">
        <p className="truncate text-[10.5px] font-semibold tracking-[0.02em] text-charcoal/45">wealthplanner.id</p>
        <p className="mt-1 truncate font-display font-normal text-[26px] leading-[1.1] tracking-[-0.02em] text-forest-900">{title}</p>
      </div>
      <ThemeToggle variant="compact" />
    </header>
  );
}
