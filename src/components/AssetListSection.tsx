import type { ReactNode } from "react";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

export function AssetListSection({
  title,
  totalValue,
  totalChangePercent,
  onAdd,
  open = true,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  totalValue: ReactNode;
  totalChangePercent?: number;
  onAdd?: () => void;
  open?: boolean;
  onToggle?: () => void;
  children: ReactNode;
}) {
  const change = typeof totalChangePercent === "number" ? totalChangePercent : null;

  return (
    <section className="rounded-[24px] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-charcoal))]">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight">{title}</p>
            {subtitle && <p className="mt-1 truncate text-[11px] leading-tight text-[rgb(var(--c-muted))]">{subtitle}</p>}
            <div className="mt-1.5 flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate text-[22px] font-bold leading-none tracking-[-0.02em] tabular-nums">{totalValue}</p>
              {change !== null && (
                <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold tabular-nums ${
                  change >= 0
                    ? "bg-[rgb(var(--c-forest-50))] text-[rgb(var(--c-up))]"
                    : "bg-[rgb(var(--c-rose-50))] text-[rgb(var(--c-down))]"
                }`}>
                  {change >= 0 ? "+" : "−"}{Math.abs(change).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {onAdd && (
              <button
                type="button"
                onClick={onAdd}
                aria-label={`Tambah ${
                  title.toLowerCase()
                }`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--c-forest-50))] text-[rgb(var(--c-up))] transition-colors hover:bg-[rgb(var(--c-forest-100))]"
              >
                <span className="text-[22px] font-light leading-none">+</span>
              </button>
            )}
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                aria-label={open ? "Ciutkan" : "Buka"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--c-cream))] text-[rgb(var(--c-charcoal))] transition-colors hover:bg-[rgb(var(--c-border))]"
              >
                {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
            )}
          </div>
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
        <span className="block truncate text-[15px] font-semibold leading-tight">{name}</span>
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
