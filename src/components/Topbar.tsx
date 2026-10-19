import { Menu, BookOpen, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { getAppLanguage } from "../lib/format";

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const navigate = useNavigate();
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-charcoal/8 px-4 py-3 flex items-center gap-2">
      <button
        onClick={onMenuClick}
        aria-label="Buka menu"
        className="p-2 rounded-lg hover:bg-charcoal/5 -ml-2"
      >
        <Menu size={20} />
      </button>
      <div className="min-w-0 flex-1 flex items-center gap-1 truncate text-forest-900">
        <span className="shrink-0 text-[12px] font-bold tracking-tight">wealthplanner.id</span>
        <ChevronRight size={13} className="shrink-0 text-charcoal/40" />
        <span className="truncate text-[13px] font-semibold">{title}</span>
      </div>
      <button type="button" onClick={() => navigate("/guidance")} aria-label={getAppLanguage() === "id" ? "Panduan" : "Guidance"} title={getAppLanguage() === "id" ? "Panduan" : "Guidance"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-forest-700 hover:bg-charcoal/5">
        <BookOpen size={18} />
      </button>
      <ThemeToggle variant="compact" />
    </header>
  );
}
