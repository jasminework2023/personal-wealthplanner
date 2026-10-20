import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="wp-backdrop absolute inset-0 bg-[#0F2A20]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div className="wp-sheet relative bg-white rounded-t-3xl2 sm:rounded-xl2 shadow-float w-full max-w-md max-h-[92vh] overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-charcoal/15 sm:hidden" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-bold tracking-[-0.02em] text-forest-900">{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal/[0.06] text-charcoal/60 hover:bg-charcoal/10">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
