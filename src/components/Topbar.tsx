import { Menu, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { getAppLanguage } from "../lib/format";

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const navigate = useNavigate();
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
        <p className="mt-1 truncate text-[17px] font-bold tracking-[-0.025em] text-forest-900">{title}</p>
      </div>
      <button type="button" onClick={() => navigate("/guidance")} aria-label={getAppLanguage() === "id" ? "Panduan" : "Guidance"} title={getAppLanguage() === "id" ? "Panduan" : "Guidance"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-forest-100/70 bg-white text-forest-800 shadow-sm">
        <BookOpen size={18} />
      </button>
      <ThemeToggle variant="compact" />
    </header>
  );
}
