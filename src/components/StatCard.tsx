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
  tone?: "forest" | "rose" | "neutral";
  trend?: string;
}) {
  const toneClasses = {
    forest: "bg-forest-50 text-forest-700",
    rose: "bg-rose-50 text-rose-700",
    neutral: "bg-charcoal/5 text-charcoal/70",
  }[tone];

  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-[13px] text-charcoal/60 mb-1">{label}</p>
        <p className="text-2xl font-semibold text-forest-900 tracking-tight">{value}</p>
        {trend && <p className="text-[12px] text-charcoal/50 mt-1">{trend}</p>}
      </div>
      {Icon && (
        <div className={`rounded-full p-2.5 ${toneClasses}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      )}
    </Card>
  );
}
