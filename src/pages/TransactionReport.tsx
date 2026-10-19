import { Users } from "lucide-react";
import { Card } from "../components/Card";

export function TransactionReport() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
        <Users size={30} />
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-forest-900">Community</h1>
        <p className="mt-2 text-[14px] text-charcoal/60">Ruang untuk tumbuh dan belajar finansial bersama.</p>
      </div>
      <Card>
        <div className="px-8 py-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-rose-500">Coming Soon</p>
          <p className="mt-2 max-w-sm text-[13px] leading-6 text-charcoal/60">Community Wealthplanner sedang kami siapkan. Stay tuned ya!</p>
        </div>
      </Card>
    </div>
  );
}
