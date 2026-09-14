import { useState } from "react";
import { Check, User as UserIcon } from "lucide-react";
import { Card } from "../components/Card";
import { getDisplayName, setDisplayName } from "../lib/settings";
import { useFinanceData } from "../lib/useFinanceData";

export function Settings() {
  const { username } = useFinanceData();
  const [name, setName] = useState(() => getDisplayName());
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setDisplayName(name);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-forest-900">Settings</h1>
        <p className="text-[14px] text-charcoal/60 mt-0.5">Atur profil dan preferensi akunmu.</p>
      </div>

      <Card className="max-w-lg">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
            <UserIcon size={17} />
          </span>
          <h3 className="text-[15px] font-semibold text-forest-900">Profile</h3>
        </div>

        <label className="text-[13px] font-medium text-charcoal/75">Display Name</label>
        <p className="text-[12px] text-charcoal/50 mt-0.5 mb-2">
          Dipakai untuk sapaan di dashboard. Kalau dikosongkan, kami pakai nama akun{username ? ` (${username})` : ""} sebagai fallback.
        </p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={username || "Nama kamu"}
            className="flex-1 border border-charcoal/15 rounded-lg px-3 py-2 text-[14px] outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-50"
          />
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-forest-600 text-white rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-forest-700"
          >
            {saved ? <Check size={14} /> : null}
            {saved ? "Tersimpan" : "Simpan"}
          </button>
        </div>
      </Card>

      <Card className="max-w-lg">
        <p className="text-[14px] text-charcoal/60">
          Setting lain (kategori, notifikasi, dsb) belum ada fungsinya di versi ini — sengaja belum ditambahkan supaya nggak ada opsi yang keliatan aktif tapi sebenarnya nggak ngapa-ngapain.
        </p>
      </Card>
    </div>
  );
}
