import type { TransactionType } from "../data/types";

const styles: Record<TransactionType, string> = {
  Income: "bg-forest-50 text-forest-700",
  Expense: "bg-rose-50 text-rose-700",
  Saving: "bg-amber-50 text-amber-700",
};

export function TransactionBadge({ type }: { type: TransactionType }) {
  return (
    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${styles[type]}`}>
      {type}
    </span>
  );
}
