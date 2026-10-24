import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`bg-surface rounded-[28px] shadow-card border border-line p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em] text-charcoal dark:text-white">{title}</h3>
          {subtitle && <p className="text-[14px] leading-snug text-charcoal/60 dark:text-white/60 mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
