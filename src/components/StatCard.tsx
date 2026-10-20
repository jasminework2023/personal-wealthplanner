import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "forest",
  trend,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "forest" | "rose" | "neutral" | "lilac";
  trend?: string;
}) {
  const toneClasses = {
    forest: "bg-mint-100 text-[#0B6B47]",
    rose: "bg-rose-50 text-rose-600",
    neutral: "bg-charcoal/5 text-charcoal/70",
    lilac: "bg-lilac-50 text-lilac-700",
  }[tone];

  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12.5px] text-charcoal/55 mb-1.5">{label}</p>
        <p className="num text-[clamp(20px,6vw,26px)] font-semibold leading-tight text-forest-900 break-words">{value}</p>
        {trend && <p className="text-[12px] text-charcoal/50 mt-1.5">{trend}</p>}
      </div>
      {Icon && (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
          <Icon size={17} strokeWidth={2.2} />
        </div>
      )}
    </Card>
  );
}
