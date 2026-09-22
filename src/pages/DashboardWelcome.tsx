import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, ExternalLink, FileSpreadsheet, Loader2, Link2, RefreshCw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../components/Card";
import { setStoredToken } from "../lib/useFinanceData";

const API_BASE = "/api";

export function DashboardWelcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState("");
  const [data, setData] = useState<any>(null);
  const [spreadsheet, setSpreadsheet] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checkActivation = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/access?ref=${encodeURIComponent(token)}&t=${Date.now()}`, {
        cache: "no-store",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mengecek status akun.");
      setData(body);
      if (body.spreadsheetUrl) setSpreadsheet(body.spreadsheetUrl);
      setError("");
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Gagal mengecek status aktivasi.");
    } finally {
      if (!silent) setChecking(false);
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("token") || "";
    if (!ref) {
      setLoading(false);
      setError("Link akses tidak lengkap. Gunakan link Dashboard yang diberikan setelah checkout.");
      return;
    }
    setToken(ref);
    setStoredToken(ref);
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    checkActivation();
    const interval = window.setInterval(() => checkActivation(true), 5000);
    return () => window.clearInterval(interval);
  }, [token, checkActivation]);

  async function connectSheet() {
    setError("");
    setSuccess("");
    setConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/connect-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, spreadsheetId: spreadsheet }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menghubungkan spreadsheet.");
      setSuccess("Google Sheet berhasil terhubung. Dashboard kamu sudah siap.");
      setData((current: any) => ({ ...current, ready: true, spreadsheetUrl: body.spreadsheetUrl }));
      setTimeout(() => navigate("/"), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghubungkan spreadsheet.");
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-charcoal/50">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const active = Boolean(data?.paymentActive);
  const ready = Boolean(data?.ready);

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${active ? "bg-forest-600" : "bg-amber-500"} text-white`}>
            {active ? <CheckCircle2 size={28} /> : <Clock3 size={28} />}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">Wealthplanner Personal</p>
          <h1 className="mt-2 text-3xl font-semibold text-forest-900">
            {active ? `Selamat datang${data?.username ? `, ${data.username}` : ""} 👋` : "Menunggu konfirmasi pembayaran"}
          </h1>
          <p className="mt-2 text-sm text-charcoal/60">
            {active
              ? "Akses kamu sudah aktif. Tinggal hubungkan Google Sheet pribadi jika belum tersambung."
              : "Aktivasi dilakukan otomatis oleh sistem setelah pembayaran terkonfirmasi. Kamu tidak perlu menunggu admin."}
          </p>
        </div>

        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div className="mb-4 rounded-xl border border-forest-100 bg-forest-50 px-4 py-3 text-sm text-forest-700">{success}</div>}

        {!active && (
          <Card>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Clock3 size={18} /></div>
                <div>
                  <h2 className="font-semibold text-forest-900">Aktivasi sedang diproses</h2>
                  <p className="mt-1 text-sm text-charcoal/60">
                    Setelah Lynk mengirim konfirmasi pembayaran, akun akan otomatis aktif. Halaman ini mengecek status secara berkala.
                  </p>
                </div>
              </div>
              <button
                onClick={() => checkActivation()}
                disabled={checking}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest-600 px-4 py-3 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-50"
              >
                {checking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {checking ? "Mengecek..." : "Cek status aktivasi"}
              </button>
            </div>
          </Card>
        )}

        {active && (
          <Card>
            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">1</div>
                <div>
                  <h2 className="font-semibold text-forest-900">Buat Google Sheet pribadi</h2>
                  <p className="mt-1 text-sm text-charcoal/60">Buka template, lalu klik <b>File → Make a copy</b>. Copy-nya akan masuk ke Google Drive kamu.</p>
                </div>
              </div>

              {data?.templateUrl ? (
                <a href={data.templateUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm font-semibold text-forest-800 hover:bg-forest-100">
                  <span className="flex items-center gap-2"><FileSpreadsheet size={18} /> Buka Template Google Sheet</span><ExternalLink size={16} />
                </a>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Link template belum diset oleh admin.</div>
              )}

              {data?.serviceAccountEmail && (
                <p className="text-xs text-charcoal/55">
                  Setelah membuat copy, share Sheet tersebut ke <b className="text-charcoal/75">{data.serviceAccountEmail}</b> agar sistem bisa membaca dan memperbarui data.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">2</div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-forest-900">Hubungkan Sheet</h2>
                  <p className="mt-1 text-sm text-charcoal/60">Paste URL Google Sheet hasil Make a copy di bawah.</p>
                  <div className="mt-3 flex gap-2">
                    <input value={spreadsheet} onChange={(e) => setSpreadsheet(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="min-w-0 flex-1 rounded-xl border border-charcoal/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-50" />
                    <button onClick={connectSheet} disabled={!spreadsheet.trim() || connecting} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-forest-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-40">
                      {connecting ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Hubungkan
                    </button>
                  </div>
                </div>
              </div>

              {ready && data?.dashboardUrl && (
                <button onClick={() => navigate("/")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-sm font-semibold text-charcoal/75 hover:border-forest-200 hover:text-forest-700">
                  Masuk ke Dashboard <ArrowRight size={16} />
                </button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
