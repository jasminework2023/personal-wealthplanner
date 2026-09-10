import { Card } from "../components/Card";

export function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-forest-900">Settings</h1>
        <p className="text-[14px] text-charcoal/60 mt-0.5">Atur kategori, budget, dan preferensi akunmu.</p>
      </div>
      <Card>
        <p className="text-[14px] text-charcoal/60">
          Halaman ini tempat mengaktifkan kategori Saving & Investment tambahan dan pengaturan lainnya. Masih placeholder — kabari kalau mau dibangun lebih lanjut.
        </p>
      </Card>
    </div>
  );
}
