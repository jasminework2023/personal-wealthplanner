import { useEffect, useState } from "react";
const API_BASE = "/api";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  MessageCircle,
  Receipt,
  Settings2,
  ShieldCheck,
  Target,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { getStoredToken } from "../lib/useFinanceData";

const telegramUrl = (import.meta.env.VITE_TELEGRAM_URL || "").trim();

function FeatureButton({
  children,
  to,
  href,
  disabled = false,
}: {
  children: ReactNode;
  to?: string;
  href?: string;
  disabled?: boolean;
}) {
  const navigate = useNavigate();
  const className = `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold transition ${
    disabled
      ? "cursor-not-allowed border border-charcoal/10 bg-charcoal/[0.035] text-charcoal/35"
      : "border border-forest-100 bg-forest-50 text-forest-700 hover:border-forest-200 hover:bg-forest-100"
  }`;

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
        <ExternalLink size={13} />
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => to && navigate(to)}
      className={className}
    >
      {children}
      {!disabled && <ArrowRight size={13} />}
    </button>
  );
}

function Milestone({
  number,
  icon: Icon,
  tone,
  title,
  subtitle,
  children,
  last = false,
}: {
  number: string;
  icon: ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
  tone: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className="relative grid grid-cols-[48px_minmax(0,1fr)] gap-4 sm:grid-cols-[56px_minmax(0,1fr)] sm:gap-5">
      {!last && <div className="absolute left-[23px] top-12 bottom-[-22px] hidden w-px bg-forest-100 sm:left-[27px] sm:block" />}
      <div className="relative z-10 flex flex-col items-center">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm sm:h-14 sm:w-14 ${tone}`}>
          <Icon size={21} strokeWidth={2} />
        </div>
        <span className="mt-1 text-[9px] font-bold tracking-[0.16em] text-charcoal/35">{number}</span>
      </div>
      <Card className="min-w-0 p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/40">Langkah {number}</p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-forest-900">{title}</h2>
          <p className="mt-1 text-[13px] leading-5 text-charcoal/55">{subtitle}</p>
        </div>
        {children}
      </Card>
    </div>
  );
}

function StepCopy({ children }: { children: ReactNode }) {
  return <p className="text-[13px] leading-5 text-charcoal/65">{children}</p>;
}

export function Guidance() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    fetch(`${API_BASE}/setup?token=${encodeURIComponent(token)}`)
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => setSpreadsheetUrl(data?.spreadsheetUrl || ""))
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-forest-50 px-3 py-1.5 text-[11px] font-semibold text-forest-700">
          <BookOpen size={14} /> Guidance
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-forest-900 sm:text-3xl">Mulai Perjalanan Finansialmu Bersama Wealthplanner</h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-6 text-charcoal/60">
          Ikuti alur berikut untuk membangun data keuangan, memahami kondisi saat ini, menyusun tujuan, dan mempersiapkan perlindungan secara lebih terstruktur.
        </p>
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-white via-forest-50/45 to-rose-50/30">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/40">Satu ekosistem</p>
            <h2 className="mt-1 text-[18px] font-semibold text-forest-900">Telegram × Spreadsheet × Dashboard</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-charcoal/60">
              Gunakan masing-masing sesuai fungsinya. Telegram membantu pencatatan cepat, Spreadsheet menjadi tempat pengelolaan data, dan Dashboard menjadi pusat untuk melihat kondisi serta membuat perencanaan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <FeatureButton href={telegramUrl || undefined} disabled={!telegramUrl}>
              <MessageCircle size={13} /> Telegram
            </FeatureButton>
            <FeatureButton href={spreadsheetUrl || undefined} disabled={!spreadsheetUrl}>
              <WalletCards size={13} /> Spreadsheet
            </FeatureButton>
            <FeatureButton to="/finance">
              <LayoutDashboard size={13} /> Dashboard
            </FeatureButton>
          </div>
        </div>
        {!telegramUrl && (
          <p className="mt-3 text-[11px] text-charcoal/40">Link Telegram dapat diatur melalui environment variable <span className="font-semibold">VITE_TELEGRAM_URL</span>.</p>
        )}
      </Card>

      <div className="flex flex-col gap-5">
        <Milestone number="01" icon={Settings2} tone="bg-forest-700" title="Mulai dari Master Data" subtitle="Bangun fondasi pencatatanmu sebelum mulai memasukkan transaksi.">
          <StepCopy>
            Lakukan <strong className="text-forest-800">Setup</strong> untuk mengkategorikan <strong>Income, Saving & Investment, Expense,</strong> dan <strong>Bank Account</strong>.
          </StepCopy>
          <p className="mt-2 text-[12px] leading-5 text-charcoal/55">Data ini akan menjadi master data pencatatanmu sehingga transaksi dan perencanaan memiliki kategori yang terstruktur sejak awal.</p>
          <div className="mt-4"><FeatureButton to="/settings">Buka Setup</FeatureButton></div>
        </Milestone>

        <Milestone number="02" icon={ClipboardList} tone="bg-rose-600" title="Mulai Catat & Audit Keuangan" subtitle="Bangun gambaran kondisi keuanganmu berdasarkan data yang aktual.">
          <StepCopy>
            Lakukan audit keuangan melalui <strong className="text-forest-800">Dashboard Finance</strong>. Catat pemasukan dan pengeluaran melalui Telegram dengan AI atau langsung melalui Dashboard.
          </StepCopy>
          <p className="mt-2 text-[12px] leading-5 text-charcoal/55">Lengkapi juga <strong>Asset Tracker</strong> untuk merekap aset yang kamu miliki dan melihat perkembangan target aset.</p>
          <div className="mt-4 flex flex-wrap gap-2"><FeatureButton to="/finance">Buka Dashboard Finance</FeatureButton><FeatureButton to="/transactions">Lihat Transaction Report</FeatureButton></div>
        </Milestone>

        <Milestone number="03" icon={Receipt} tone="bg-yellow-500 !text-[#173b32]" title="Pantau Aktivitas Transaksi" subtitle="Pastikan seluruh aktivitas keuanganmu terdokumentasi dengan rapi.">
          <StepCopy>
            Gunakan <strong className="text-forest-800">Transaction Report</strong> untuk melihat aktivitas transaksi yang sudah tercatat.
          </StepCopy>
          <p className="mt-2 text-[12px] leading-5 text-charcoal/55">Pantau pemasukan, pengeluaran, dan saving untuk memastikan pencatatanmu tetap lengkap dan sesuai dengan aktivitas keuangan sehari-hari.</p>
          <div className="mt-4"><FeatureButton to="/transactions">Buka Transaction Report</FeatureButton></div>
        </Milestone>

        <Milestone number="04" icon={Target} tone="bg-lilac-600" title="Rapikan Budget" subtitle="Jadikan budget sebagai batas dan arah penggunaan uangmu.">
          <StepCopy>
            Lakukan <strong className="text-forest-800">Monthly Budget</strong> untuk menyusun budget Income, Expense, dan Saving.
          </StepCopy>
          <p className="mt-2 text-[12px] leading-5 text-charcoal/55">Bandingkan budget dengan realisasi agar penggunaan uangmu tetap terarah dan disiplin terhadap tujuan finansialmu.</p>
          <div className="mt-4"><FeatureButton to="/budgeting">Buka Monthly Budget</FeatureButton></div>
        </Milestone>

        <div className="grid gap-4 pl-0 sm:pl-[76px]">
          <Card className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-700"><Calculator size={17} /></div>
              <div className="min-w-0"><h3 className="text-[15px] font-semibold text-forest-900">05 — Hitung Tujuan Keuangan</h3><StepCopy>Gunakan <strong className="text-forest-800">Financial Calculator</strong> untuk menerjemahkan tujuan seperti KPR, pendidikan, pensiun, investasi, Haji & Umroh, warisan, dan kebutuhan lainnya menjadi angka yang lebih jelas.</StepCopy><div className="mt-3"><FeatureButton to="/calculator">Buka Financial Calculator</FeatureButton></div></div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700"><ShieldCheck size={17} /></div>
              <div className="min-w-0"><h3 className="text-[15px] font-semibold text-forest-900">06 — Hitung Kebutuhan Proteksi</h3><StepCopy>Gunakan <strong className="text-forest-800">Financial Protection</strong> untuk melihat Total Protection Needs, Existing Protection, dan Protection Gap dari rencana yang sudah kamu buat.</StepCopy><div className="mt-3"><FeatureButton to="/protection">Buka Financial Protection</FeatureButton></div></div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500"><ArrowRight size={17} /></div>
              <div className="min-w-0"><h3 className="text-[15px] font-semibold text-forest-900">07 — Konsultasikan Rencanamu</h3><StepCopy>Setelah mengetahui kondisi keuangan, tujuan, dan kebutuhan proteksimu, lanjutkan ke <strong className="text-forest-800">Konsultasi dengan Life Planner</strong> untuk mendapatkan proposal yang sesuai dengan kebutuhan perencanaanmu.</StepCopy><div className="mt-3"><a href="https://gri.my.id/f1/GJ5115" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-forest-700">Konsultasi dengan Life Planner <ExternalLink size={13} /></a></div></div>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="text-[17px] font-semibold text-forest-900">Your Financial Journey</h2>
        <p className="mt-2 text-[13px] leading-5 text-charcoal/60"><strong className="text-forest-800">Catat → Rencanakan → Lindungi</strong></p>
        <p className="mt-1 text-[12px] leading-5 text-charcoal/50">Mulai dari memahami kondisi keuanganmu, menyusun tujuan, hingga mempersiapkan perlindungan untuk apa yang sudah kamu bangun.</p>
      </Card>

      <Card>
        <h2 className="text-[17px] font-semibold text-forest-900">Term and Condition</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["Data pengguna", "Akurasi hasil bergantung pada data yang kamu masukkan dan perbarui."],
            ["Estimasi", "Hasil kalkulator dan simulasi merupakan estimasi berdasarkan asumsi yang digunakan."],
            ["Alat bantu", "Wealthplanner membantu memahami dan merencanakan kondisi keuangan, bukan mengambil keputusan finansial atas namamu."],
            ["Review berkala", "Perbarui data ketika kondisi keuangan atau tujuanmu berubah agar perencanaan tetap relevan."],
          ].map(([title, text]) => <div key={title} className="rounded-xl border border-charcoal/8 bg-charcoal/[0.02] p-3"><p className="text-[12px] font-semibold text-forest-900">{title}</p><p className="mt-1 text-[12px] leading-5 text-charcoal/55">{text}</p></div>)}
        </div>
      </Card>

      <Card>
        <h2 className="text-[17px] font-semibold text-forest-900">Butuh Bantuan?</h2>
        <p className="mt-1 text-[13px] text-charcoal/55">Terdapat kendala saat menggunakan Wealthplanner?</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="https://www.wealthplanner.id" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-forest-100 bg-forest-50 px-3 py-2 text-[12px] font-semibold text-forest-700 hover:bg-forest-100">Website <ExternalLink size={13} /></a>
          <a href="mailto:wealthplanner234@gmail.com" className="inline-flex items-center gap-1.5 rounded-lg border border-charcoal/10 bg-white px-3 py-2 text-[12px] font-semibold text-charcoal/65 hover:border-forest-200 hover:text-forest-700">wealthplanner234@gmail.com</a>
        </div>
      </Card>
    </div>
  );
}
