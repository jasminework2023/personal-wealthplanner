import { Card } from "../components/Card";
import { BookOpen } from "lucide-react";

export function Guidance() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-forest-900">Guidance</h1>
        <p className="text-[14px] text-charcoal/60 mt-0.5">Panduan singkat memakai Wealthplanner.</p>
      </div>
      <Card className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lilac-50 text-lilac-700">
          <BookOpen size={17} />
        </span>
        <p className="text-[14px] text-charcoal/60">
          Knowledge base lengkap belum dibangun di versi ini (masih FUTURE). Sementara ini isinya placeholder — kabari kalau mau diisi FAQ, cara pakai Catat dengan AI, atau penjelasan istilah di Protection Planner.
        </p>
      </Card>
    </div>
  );
}
