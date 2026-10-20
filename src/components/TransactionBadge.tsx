import type { TransactionType } from "../data/types";

const styles: Record<TransactionType, string> = {
  Income: "bg-mint-100 text-[#0B6B47]",
  Expense: "bg-rose-50 text-rose-700",
  Saving: "bg-lilac-50 text-lilac-700",
};

export function TransactionBadge({ type }: { type: TransactionType }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${styles[type]}`}>
      {type}
    </span>
  );
}
