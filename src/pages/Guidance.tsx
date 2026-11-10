import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Moon,
  PiggyBank,
  Receipt,
  Settings2,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { getAppLanguage } from "../lib/format";

function FeatureButton({ children, to }: { children: ReactNode; to?: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => to && navigate(to)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-forest-100 bg-forest-50 px-3 py-2 text-[12px] font-semibold text-forest-700 transition hover:border-forest-200 hover:bg-forest-100"
    >
      {children}
      <ArrowRight size={13} />
    </button>
  );
}

function GuideCard({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: ComponentType<{ size?: number | string; strokeWidth?: number | string }>;
  tone: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-forest-900">{title}</h3>
          <div className="mt-2 text-[13px] leading-5 text-charcoal/60">{children}</div>
        </div>
      </div>
    </Card>
  );
}

function SectionTitle({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/40">Sesi {number}</p>
      <h2 className="mt-1 text-[20px] font-bold tracking-tight text-forest-900">{title}</h2>
      <p className="mt-1 text-[13px] leading-5 text-charcoal/55">{subtitle}</p>
    </div>
  );
}

export function Guidance() {
  const [language, setLanguage] = useState(getAppLanguage());

  useEffect(() => {
    const update = () => setLanguage(getAppLanguage());
    window.addEventListener("wealthplanner:language-changed", update);
    return () => window.removeEventListener("wealthplanner:language-changed", update);
  }, []);

  const id = language === "id";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-forest-50 px-3 py-1.5 text-[11px] font-semibold text-forest-700">
          <BookOpen size={14} /> Guide
        </div>
        <h1 className="mt-3 text-[26px] font-bold leading-[1.1] tracking-[-0.03em] text-forest-900 sm:text-3xl">
          {id ? "Mulai Menggunakan Wealthplanner" : "Start Using Wealthplanner"}
        </h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-6 text-charcoal/60">
          {id
            ? "Kenali tampilan aplikasinya dulu, lalu ikuti langkah sederhana untuk mulai membangun data keuanganmu."
            : "Get familiar with the app first, then follow a simple flow to start building your financial data."}
        </p>
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-white via-forest-50/45 to-rose-50/30">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#123524] text-white">
            <BookOpen size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal/40">Alur Wealthplanner</p>
            <p className="mt-1 text-[15px] font-semibold text-forest-900">
              Setup → Input kondisi saat ini → Catat → Hitung → Rencanakan → Monitor → Lindungi
            </p>
            <p className="mt-2 text-[12px] leading-5 text-charcoal/55">
              Ikuti urutan ini supaya data yang kamu masukkan saling terhubung dan hasil perencanaan menjadi lebih relevan.
            </p>
          </div>
        </div>
      </Card>

      <section>
        <SectionTitle
          number="01"
          title="Perkenalan"
          subtitle="Kenali bagian utama aplikasi dulu. Sesi ini hanya untuk memahami tampilan dan navigasi."
        />

        <div className="grid gap-4">
          <GuideCard icon={Menu} tone="bg-forest-50 text-forest-700" title="1. Kenali Sidebar">
            <p>
              Ketuk ikon <strong className="text-forest-800">3 garis (☰)</strong> di paling kiri untuk membuka Sidebar. Dari sini kamu bisa berpindah ke halaman utama dan fitur-fitur Wealthplanner.
            </p>
          </GuideCard>

          <GuideCard icon={Moon} tone="bg-charcoal/[0.06] text-charcoal/70" title="2. Atur Tampilan">
            <p>
              Gunakan tombol <strong className="text-forest-800">logo</strong> untuk mengganti tampilan <strong>dark/light</strong> sesuai kenyamananmu.
            </p>
          </GuideCard>

          <GuideCard icon={TrendingUp} tone="bg-forest-50 text-forest-700" title="3. Kenali Asset & Budget Tracker">
            <p>
              Di Home, kamu bisa <strong className="text-forest-800">geser kartu</strong> untuk berpindah antara <strong>Asset Tracker</strong> dan <strong>Budget Tracker</strong>.
            </p>
            <p className="mt-2">
              <strong>Asset Tracker</strong> membantu melihat perkembangan asetmu, sedangkan <strong>Budget Tracker</strong> membantu melihat penggunaan budget dibandingkan realisasinya.
            </p>
          </GuideCard>

          <GuideCard icon={LayoutDashboard} tone="bg-forest-50 text-forest-700" title="4. Kenali Menu Utama">
            <p>Menu Utama di Home menjadi pintasan ke fitur yang paling sering digunakan:</p>
            <p className="mt-2 font-medium text-forest-800">
              Transaction · Wallet · Budget · Asset · Calculator · Goals · Protection · Report · Community · AI Assistant · Guide
            </p>
          </GuideCard>

          <GuideCard icon={ArrowRight} tone="bg-rose-50 text-rose-700" title="5. Lihat Bagian Bawah Home">
            <p className="font-medium text-forest-800">Ketuk ke bawah untuk lihat lebih lengkap.</p>
          </GuideCard>
        </div>
      </section>

      <section>
        <SectionTitle
          number="02"
          title="Sekarang, saatnya mulai menggunakan App!"
          subtitle="Ikuti urutannya dari Setup sampai monitoring supaya Wealthplanner benar-benar bekerja berdasarkan kondisi keuanganmu."
        />

        <div className="grid gap-4">
          <GuideCard icon={Settings2} tone="bg-forest-50 text-forest-700" title="1. Mulai dari Profile">
            <p>
              Masuk ke <strong className="text-forest-800">Profile</strong>, lalu scroll ke bawah. Lengkapi <strong>nama</strong> dan pilih <strong>bahasa</strong> yang ingin kamu gunakan.
            </p>
          </GuideCard>

          <GuideCard icon={CircleDollarSign} tone="bg-forest-50 text-forest-700" title="2. Setup Mesin Keuangan">
            <p>
              Atur <strong className="text-forest-800">Pemasukan, Pengeluaran, dan Tabungan</strong>. Ini menjadi dasar untuk seluruh pencatatan transaksi dan perencanaanmu.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Ketuk <strong>+ Add Category</strong> untuk menambahkan kategori.</li>
              <li>Centang kategori yang ingin digunakan untuk mengaktifkannya.</li>
              <li>Hapus/nonaktifkan kategori yang tidak akan digunakan.</li>
            </ul>
            <p className="mt-2">
              Untuk <strong>AI Membership</strong>, setelah pembayaran kamu mendapatkan akses AI gratis dalam periode terbatas. Jika membutuhkan penggunaan AI lebih banyak, kamu bisa berlangganan AI PRO+.
            </p>
            <div className="mt-3"><FeatureButton to="/settings">Buka Profile & Setup</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={WalletCards} tone="bg-forest-50 text-forest-700" title="3a. Update Data — Wallet">
            <p>
              Tambahkan Wallet untuk mencatat tempat penyimpanan uangmu. Kamu bisa mengatur <strong>saldo awal</strong> dan membuat kartu Wallet sesuai kebutuhan. Gunakan <strong>Transfer</strong> jika memindahkan uang antar-Wallet.
            </p>
            <div className="mt-3"><FeatureButton to="/wallets">Buka Wallet</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={TrendingUp} tone="bg-forest-50 text-forest-700" title="3b. Update Data — Asset">
            <p>
              <strong>Liquid Asset</strong> adalah aset yang relatif mudah dicairkan seperti uang tunai dan saldo rekening. <strong>Fixed Asset</strong> adalah aset tetap seperti rumah atau kendaraan. <strong>Variable Asset</strong> adalah aset yang nilainya dapat berubah, seperti saham.
            </p>
            <p className="mt-2">
              Masukkan aset yang kamu miliki agar kondisi kekayaanmu dapat terbaca lebih lengkap.
            </p>
            <div className="mt-3"><FeatureButton to="/assets">Buka Asset</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={PiggyBank} tone="bg-forest-50 text-forest-700" title="3c. Update Data — Budget">
            <p>
              Atur target <strong>bulanan atau tahunan</strong>. Kategori budget mengikuti kategori yang sudah kamu aktifkan di Setup, lalu target setiap kategori bisa kamu sesuaikan.
            </p>
            <div className="mt-3"><FeatureButton to="/budgeting">Buka Budget</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Receipt} tone="bg-forest-50 text-forest-700" title="3d. Update Data — Transactions">
            <p>
              Catat transaksi secara <strong>manual</strong> atau gunakan <strong>AI</strong>. Setiap penggunaan AI mengonsumsi <strong>1 kredit</strong>.
            </p>
            <p className="mt-2">Gunakan fitur ini untuk menjaga pemasukan, pengeluaran, dan tabungan tetap tercatat.</p>
            <div className="mt-3"><FeatureButton to="/transaction">Buka Transaction</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Calculator} tone="bg-forest-50 text-forest-700" title="3e. Update Data — Calculator">
            <p>
              Gunakan <strong>Calculator</strong> untuk menghitung kebutuhan finansial berdasarkan angka-angka perencanaan, seperti target pendidikan, Haji, KPR, pensiun, dan tujuan finansial lainnya.
            </p>
            <div className="mt-3"><FeatureButton to="/calculator">Buka Calculator</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={ChartNoAxesCombined} tone="bg-forest-50 text-forest-700" title="3f. Update Data — Report">
            <p>
              Gunakan <strong>Report</strong> untuk memantau laporan keuangan dan melihat kondisi finansial berdasarkan data yang sudah kamu masukkan.
            </p>
            <div className="mt-3"><FeatureButton to="/finance">Buka Report</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Target} tone="bg-forest-50 text-forest-700" title="3g. Update Data — Goals">
            <p>
              Bandingkan hasil rencana dari <strong>Calculator</strong> dengan kondisi keuangan aktualmu. Setelah itu, tentukan alokasi dana untuk mencapai tujuan tersebut dari tabungan atau sumber dana lainnya.
            </p>
            <div className="mt-3"><FeatureButton to="/goals">Buka Goals</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={ShieldCheck} tone="bg-rose-50 text-rose-700" title="3h. Update Data — Protection">
            <p>
              Gunakan <strong>Protection</strong> untuk berkonsultasi mengenai kebutuhan perlindungan finansial bersama <strong>konsultan asuransi manusia</strong>.
            </p>
            <div className="mt-3"><FeatureButton to="/protection">Buka Protection</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={MessageCircle} tone="bg-forest-50 text-forest-700" title="3i. Update Data — AI Assistant">
            <p>
              <strong>AI Assistant</strong> adalah financial planner yang dilatih untuk membantu memberikan konsultasi dan insight terkait kondisi serta perencanaan keuanganmu.
            </p>
            <div className="mt-3"><FeatureButton to="/ai-assistant">Buka AI Assistant</FeatureButton></div>
          </GuideCard>
        </div>
      </section>

      <Card className="bg-[#123524] text-white">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={21} className="mt-0.5 shrink-0 text-[#6EE7A8]" />
          <div>
            <h2 className="text-[17px] font-semibold">Urutan paling sederhananya</h2>
            <p className="mt-2 text-[13px] leading-6 text-white/75">
              <strong className="text-white">Setup</strong> dulu → masukkan <strong className="text-white">kondisi saat ini</strong> → mulai <strong className="text-white">catat</strong> → gunakan <strong className="text-white">Calculator</strong> untuk menghitung → susun <strong className="text-white">Goals</strong> → pantau lewat <strong className="text-white">Report</strong> → lengkapi <strong className="text-white">Protection</strong> bila diperlukan.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-[17px] font-semibold text-forest-900">Catatan</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["Data pengguna", "Akurasi hasil bergantung pada data yang kamu masukkan dan perbarui."],
            ["Estimasi", "Hasil kalkulator dan simulasi merupakan estimasi berdasarkan asumsi yang digunakan."],
            ["Alat bantu", "Wealthplanner membantu memahami dan merencanakan kondisi keuangan, bukan mengambil keputusan finansial atas namamu."],
            ["Review berkala", "Perbarui data ketika kondisi keuangan atau tujuanmu berubah agar perencanaan tetap relevan."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-charcoal/8 bg-charcoal/[0.02] p-3">
              <p className="text-[12px] font-semibold text-forest-900">{title}</p>
              <p className="mt-1 text-[12px] leading-5 text-charcoal/55">{text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
