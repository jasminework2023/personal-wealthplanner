import { budgetStatus } from "../data/types";

const statusStyles: Record<string, { bar: string; text: string; bg: string }> = {
  Healthy: { bar: "bg-forest-600", text: "text-forest-700", bg: "bg-forest-50" },
  "Near Limit": { bar: "bg-[#F6C445]", text: "text-[#7A5E00]", bg: "bg-butter-50" },
  "Over Budget": { bar: "bg-rose-600", text: "text-rose-700", bg: "bg-rose-50" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] ?? statusStyles.Healthy;
  return (
    <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      {status}
    </span>
  );
}

export function BudgetProgressBar({ usagePct }: { usagePct: number }) {
  const status = budgetStatus(usagePct);
  const s = statusStyles[status];
  const width = Math.min(usagePct, 100);
  return (
    <div className="w-full h-2.5 rounded-full bg-charcoal/[0.07] overflow-hidden relative">
      <div className={`h-full rounded-full ${s.bar} transition-[width] duration-500`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function SimpleProgressBar({ pct, tone = "forest" }: { pct: number; tone?: "forest" | "rose" }) {
  const barColor = tone === "rose" ? "bg-rose-600" : "bg-forest-600";
  return (
    <div className="w-full h-2.5 rounded-full bg-charcoal/[0.07] overflow-hidden">
      <div className={`h-full rounded-full ${barColor} transition-[width] duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}
