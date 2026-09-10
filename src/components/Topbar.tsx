import { Menu } from "lucide-react";

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-charcoal/8 px-4 py-3 flex items-center gap-3">
      <button
        onClick={onMenuClick}
        aria-label="Buka menu"
        className="p-2 rounded-lg hover:bg-charcoal/5 -ml-2"
      >
        <Menu size={20} />
      </button>
      <p className="font-semibold text-forest-900">{title}</p>
    </header>
  );
}
