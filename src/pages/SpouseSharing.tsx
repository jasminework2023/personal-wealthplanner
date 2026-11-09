import { useEffect, useState } from "react";
import { Check, Copy, Heart, Link2, Loader2, UserRound, X } from "lucide-react";
import { Card } from "../components/Card";
import { getStoredToken } from "../lib/useFinanceData";

type Connection = {
  id: string;
  status: string;
  direction: "incoming" | "outgoing";
  otherUser: { userId: string; username: string } | null;
  inviteExpiresAt: string | null;
  acceptedAt: string | null;
};

export function SpouseSharing() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  async function load() {
    const token = getStoredToken();
    if (!token) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/spouse-sharing?token=${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal memuat Spouse Sharing.");
      setConnections(data.connections || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat Spouse Sharing.");
    } finally { setLoading(false); }
  }

  async function createInvite() {
    const token = getStoredToken();
    if (!token) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/spouse-sharing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "create_invite" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal membuat undangan.");
      const url = new URL(data.inviteUrl, window.location.origin).toString();
      setInviteUrl(url);
      await navigator.clipboard?.writeText(url).catch(() => {});
      setMessage("Link undangan berhasil dibuat dan disalin.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat undangan.");
    } finally { setWorking(false); }
  }

  async function acceptInvite() {
    const token = getStoredToken();
    if (!token || !inviteCode.trim()) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/spouse-sharing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "accept_invite", code: inviteCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menerima undangan.");
      setInviteCode(""); setMessage("Spouse Sharing berhasil diaktifkan.");
      window.history.replaceState({}, "", window.location.pathname);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menerima undangan.");
    } finally { setWorking(false); }
  }

  async function revoke(id: string) {
    const token = getStoredToken();
    if (!token) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/spouse-sharing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "revoke", connectionId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal memutuskan koneksi.");
      setMessage("Spouse Sharing diputus.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memutuskan koneksi.");
    } finally { setWorking(false); }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("spouse_invite");
    if (code) setInviteCode(code);
    load();
  }, []);

  const active = connections.find((x) => x.status === "accepted");
  const pending = connections.find((x) => x.status === "pending");

  return (
    <Card className="max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBD3E0] text-[#B83A62]"><Heart size={19}/></span>
        <div>
          <h3 className="text-[15px] font-semibold text-forest-900">Spouse Sharing</h3>
          <p className="text-[12px] text-charcoal/50 mt-0.5">Hubungkan akun dengan pasangan tanpa berbagi password atau akun.</p>
        </div>
      </div>

      {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] text-rose-700">{error}</div>}
      {message && <div className="mb-3 rounded-xl border border-forest-100 bg-forest-50 px-3 py-2.5 text-[12px] text-forest-700">{message}</div>}

      {loading ? <div className="py-6 flex justify-center text-charcoal/40"><Loader2 className="animate-spin"/></div> : active ? (
        <div className="rounded-2xl border border-forest-100 bg-forest-50/50 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest-700"><UserRound size={17}/></span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-forest-900">{active.otherUser?.username || "Pasangan"}</p>
              <p className="text-[11px] text-charcoal/50">Terhubung sebagai pasangan</p>
            </div>
            <span className="rounded-full bg-forest-100 px-2.5 py-1 text-[10.5px] font-semibold text-forest-700">Connected</span>
          </div>
          <button type="button" disabled={working} onClick={() => revoke(active.id)} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-charcoal/50 hover:text-rose-600"><X size={12}/> Putuskan koneksi</button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-charcoal/10 bg-charcoal/[0.02] p-4">
            <p className="text-[13px] font-semibold text-charcoal">Undang pasangan</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-charcoal/55">Pasangan tetap punya akun sendiri. Setelah terhubung, kita bisa menambahkan Family View dan data yang dibagikan secara terpisah.</p>
            {pending ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11.5px] text-amber-800">Undangan sedang aktif. Bagikan link yang sudah dibuat sebelumnya.</div>
            ) : (
              <button type="button" disabled={working} onClick={createInvite} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#123524] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"><Link2 size={14}/>{working ? "Menyiapkan..." : "Buat link undangan"}</button>
            )}
            {inviteUrl && <div className="mt-3 flex gap-2"><input readOnly value={inviteUrl} className="min-w-0 flex-1 rounded-xl border border-charcoal/12 bg-white px-3 py-2.5 text-[11px] text-charcoal/65"/><button type="button" onClick={() => navigator.clipboard?.writeText(inviteUrl)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-charcoal/12 bg-white text-charcoal/60"><Copy size={14}/></button></div>}
          </div>

          <div className="mt-3 rounded-2xl border border-charcoal/10 p-4">
            <p className="text-[13px] font-semibold text-charcoal">Punya undangan?</p>
            <p className="mt-1 text-[11.5px] text-charcoal/55">Masukkan kode dari pasangan untuk menghubungkan akun.</p>
            <div className="mt-3 flex gap-2">
              <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Kode undangan" className="min-w-0 flex-1 rounded-xl border border-charcoal/12 px-3 py-2.5 text-[12px] outline-none focus:border-forest-400"/>
              <button type="button" disabled={working || !inviteCode.trim()} onClick={acceptInvite} className="inline-flex items-center gap-1.5 rounded-xl bg-[#123524] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-40"><Check size={14}/> Terima</button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
