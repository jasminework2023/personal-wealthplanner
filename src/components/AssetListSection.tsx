import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Info, TrendingUp } from "lucide-react";

export function AssetListSection({
  title,
  subtitle,
  totalValue,
  totalChangePercent,
  onAdd,
  open = true,
  onToggle,
  infoText,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  totalValue: ReactNode;
  totalChangePercent?: number;
  onAdd?: () => void;
  open?: boolean;
  onToggle?: () => void;
  infoText?: string;
  children: ReactNode;
}) {
  const change = typeof totalChangePercent === "number" ? totalChangePercent : null;
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!infoRef.current?.contains(event.target as Node)) setInfoOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInfoOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [infoOpen]);

  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white text-[rgb(var(--asset-primary-text))] shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <p className="truncate text-[22px] font-bold leading-tight tracking-[-0.025em] text-[rgb(var(--asset-primary-text))]">{title}</p>
              {infoText && (
                <div ref={infoRef} className="relative shrink-0">
                  <button
                    type="button"
                    aria-label="Info"
                    aria-expanded={infoOpen}
                    onClick={() => setInfoOpen((value) => !value)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#7B8492] transition-colors hover:bg-[#F3F4F6] hover:text-[#172033]"
                  >
                    <Info size={18} strokeWidth={2} />
                  </button>
                  {infoOpen && (
                    <div
                      role="tooltip"
                      className="absolute left-0 top-full z-20 mt-1.5 w-max max-w-[220px] rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-2 text-[11px] font-medium leading-relaxed text-[rgb(var(--c-charcoal))] shadow-lg"
                    >
                      {infoText}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex min-w-0 items-center gap-3">
              <p className="min-w-0 truncate text-[34px] font-bold leading-none tracking-[-0.035em] tabular-nums text-[rgb(var(--asset-primary-text))]">
                {totalValue}
              </p>
              {change !== null && (
                <span
                  className={`shrink-0 rounded-[14px] bg-[#EAF5F0] px-3 py-2 text-[13px] font-bold leading-none tabular-nums text-[#07845C]`}
                >
                  {change >= 0 ? "+" : "−"}{Math.abs(change).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={open ? "Ciutkan" : "Buka"}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#7B8492] transition-all hover:bg-[#F3F4F6] active:scale-95"
            >
              {open ? <ChevronUp size={25} strokeWidth={1.9} /> : <ChevronDown size={25} strokeWidth={1.9} />}
            </button>
          )}
        </div>
      </div>

      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

export function AssetListItem({
  icon,
  name,
  subtitle,
  value,
  changePercent,
  onClick,
}: {
  icon: ReactNode;
  name: string;
  subtitle: string;
  value: ReactNode;
  changePercent: number;
  onClick?: () => void;
}) {
  const positive = changePercent >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex min-h-[64px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-[rgb(var(--c-cream))] disabled:cursor-default sm:px-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[rgb(var(--c-forest-50))] text-[rgb(var(--c-up))]">
        {icon || <TrendingUp size={18} strokeWidth={2.2} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold leading-tight">{name}</span>
        <span className="mt-1 block truncate text-[12px] leading-tight text-[rgb(var(--c-muted))]">{subtitle}</span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-[14px] font-semibold leading-tight tabular-nums">{value}</span>
        <span
          className={`mt-1 inline-flex rounded-lg px-2 py-1 text-[10px] font-semibold leading-none tabular-nums ${
            positive
              ? "bg-[rgb(var(--c-forest-50))] text-[rgb(var(--c-up))]"
              : "bg-[rgb(var(--c-rose-50))] text-[rgb(var(--c-down))]"
          }`}
        >
          {positive ? "+" : "−"}{Math.abs(changePercent).toFixed(1)}%
        </span>
      </span>
    </button>
  );
}
