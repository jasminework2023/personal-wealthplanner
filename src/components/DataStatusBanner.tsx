import { useState } from "react";
import { Link2, CircleCheck } from "lucide-react";
import { setStoredToken } from "../lib/useFinanceData";

export function DataStatusBanner({ isRealData, username, error }: { isRealData: boolean; username: string | null; error: string | null }) {
  const [tokenInput, setTokenInput] = useState("");

  if (isRealData) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-forest-700 bg-forest-50 border border-forest-100 rounded-lg px-3.5 py-2 mb-4">
        <CircleCheck size={15} />
        Data asli tersambung{username ? ` — ${username}` : ""}.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 text-[13px] bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-3 mb-4">
      <Link2 size={15} className="text-amber-700 shrink-0" />
      <span className="text-amber-800 flex-1">
        {error ? `${error} — masih menampilkan data contoh.` : "Ini masih data contoh. Ketik "}
        {!error && <b>/dashboard</b>}
        {!error && " di bot Telegram buat lihat data asli, atau tempel token di sini:"}
      </span>
      <div className="flex gap-1.5">
        <input
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Tempel token..."
          className="border border-amber-200 rounded-md px-2 py-1 text-[12px] w-36"
        />
        <button
          onClick={() => {
            if (tokenInput.trim()) {
              setStoredToken(tokenInput.trim());
              window.location.reload();
            }
          }}
          className="bg-amber-600 text-white rounded-md px-2.5 py-1 text-[12px] font-medium hover:bg-amber-700"
        >
          Sambungkan
        </button>
      </div>
    </div>
  );
}
