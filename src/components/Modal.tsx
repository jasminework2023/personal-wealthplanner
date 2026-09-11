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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl2 shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold text-forest-900">{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="p-1 rounded-lg hover:bg-charcoal/5">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
