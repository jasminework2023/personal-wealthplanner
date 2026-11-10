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
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-forest-900">{title}</h3>
          <div className="mt-2 text-[13px] leading-5 text-charcoal/60">{children}</div>
        </div>
      </div>
    </Card>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((step, index) => (
        <li key={`${index}-${step}`} className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-100 text-[10px] font-bold text-forest-700">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
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
            <p>Profile adalah titik awal untuk menyiapkan identitas dan preferensi aplikasi.</p>
            <StepList steps={[
              "Buka Sidebar (☰), lalu pilih Profile.",
              "Scroll ke bagian bawah halaman.",
              "Isi nama dan pilih bahasa yang ingin digunakan.",
              "Simpan perubahan jika tombol simpan tersedia.",
            ]} />
            <div className="mt-3"><FeatureButton to="/settings">Buka Profile</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={CircleDollarSign} tone="bg-forest-50 text-forest-700" title="2. Setup Mesin Keuangan">
            <p>Setup ini menentukan kategori yang akan dipakai saat kamu mencatat pemasukan, pengeluaran, dan tabungan.</p>
            <StepList steps={[
              "Masuk ke Profile → Setup Mesin Keuangan.",
              "Pilih bagian Pemasukan, Pengeluaran, atau Tabungan.",
              "Ketuk + Add Category untuk menambah kategori yang belum tersedia.",
              "Centang kategori yang benar-benar ingin kamu gunakan.",
              "Nonaktifkan/hapus kategori yang tidak relevan agar pencatatan tetap rapi.",
              "Setelah setup selesai, kategori tersebut akan menjadi pilihan saat kamu mencatat transaksi dan membuat Budget.",
            ]} />
            <p className="mt-3">AI Membership juga dikelola dari area ini. Setelah pembayaran, akses AI gratis diberikan sesuai periode yang berlaku. Untuk penggunaan AI lebih banyak, gunakan AI PRO+.</p>
            <div className="mt-3"><FeatureButton to="/settings">Buka Profile & Setup</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={WalletCards} tone="bg-forest-50 text-forest-700" title="3. Isi kondisi uangmu — Wallet">
            <p>Wallet dipakai untuk mencatat <strong>tempat uang disimpan</strong>, misalnya cash, rekening bank, atau wallet lain.</p>
            <StepList steps={[
              "Buka Wallet dari Menu Utama.",
              "Ketuk Tambah Wallet.",
              "Pilih/isi nama Wallet dan jenisnya sesuai kebutuhan.",
              "Masukkan saldo awal agar posisi uangmu mulai dari angka yang benar.",
              "Simpan Wallet.",
              "Kalau uang berpindah antar-Wallet, gunakan Transfer supaya saldo kedua Wallet ikut menyesuaikan dan tidak dianggap sebagai pemasukan baru.",
            ]} />
            <div className="mt-3"><FeatureButton to="/wallets">Buka Wallet</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={TrendingUp} tone="bg-forest-50 text-forest-700" title="4. Isi kondisi kekayaanmu — Asset">
            <p>Asset dipakai untuk mencatat kekayaan yang kamu punya di luar saldo Wallet, dengan pengelompokan berdasarkan jenis aset.</p>
            <StepList steps={[
              "Buka Asset.",
              "Pilih jenis aset: Liquid Asset, Fixed Asset, atau Variable Asset.",
              "Liquid Asset: masukkan aset yang relatif mudah dicairkan dan pastikan tidak menduplikasi saldo yang sudah tercatat di Wallet.",
              "Fixed Asset: masukkan aset tetap seperti rumah atau kendaraan beserta nilainya.",
              "Variable Asset: masukkan aset yang nilainya berubah, seperti saham/investasi.",
              "Untuk saham, masukkan ticker, jumlah saham, harga beli/rata-rata, dan data harga saat ini jika tersedia.",
              "Simpan lalu cek kembali total Asset agar tidak ada aset yang tercatat dua kali.",
            ]} />
            <div className="mt-3"><FeatureButton to="/assets">Buka Asset</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={PiggyBank} tone="bg-forest-50 text-forest-700" title="5. Atur batas pengeluaran — Budget">
            <p>Budget dipakai untuk menentukan target pengeluaran dan membandingkannya dengan realisasi.</p>
            <StepList steps={[
              "Buka Budget.",
              "Pilih periode Bulanan atau Tahunan.",
              "Pilih kategori yang ingin diberi target.",
              "Masukkan nominal target untuk setiap kategori.",
              "Gunakan kategori yang sudah diaktifkan di Setup Mesin Keuangan.",
              "Simpan budget, lalu pantau realisasinya dari waktu ke waktu.",
            ]} />
            <div className="mt-3"><FeatureButton to="/budgeting">Buka Budget</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Receipt} tone="bg-forest-50 text-forest-700" title="6. Mulai mencatat — Transaction">
            <p>Setelah Wallet dan kategori siap, mulai catat semua pemasukan, pengeluaran, dan tabungan supaya data keuanganmu terus ter-update.</p>
            <StepList steps={[
              "Buka Transaction.",
              "Pilih pencatatan manual atau gunakan fitur AI.",
              "Untuk manual, isi informasi transaksi seperti tanggal, nominal, kategori, dan Wallet yang digunakan.",
              "Untuk AI, masukkan informasi transaksi sesuai format yang diminta lalu periksa hasil pembacaan AI.",
              "Pastikan tanggal, nominal, kategori, dan Wallet sudah benar sebelum menyimpan.",
              "Simpan transaksi dan cek apakah transaksi sudah muncul di daftar.",
              "Setiap 1 penggunaan AI = 1 kredit.",
            ]} />
            <div className="mt-3"><FeatureButton to="/transaction">Buka Transaction</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Calculator} tone="bg-forest-50 text-forest-700" title="7. Hitung kebutuhanmu — Calculator">
            <p>Calculator dipakai untuk mengubah tujuan finansial menjadi angka perencanaan.</p>
            <StepList steps={[
              "Buka Calculator.",
              "Pilih jenis kebutuhan yang ingin dihitung, misalnya Pendidikan, Haji, KPR, atau Pensiun.",
              "Isi angka yang diminta sesuai kondisi dan targetmu.",
              "Jalankan perhitungan untuk melihat estimasi kebutuhan dan rencana dana.",
              "Gunakan hasilnya sebagai angka acuan untuk menentukan target di Goals.",
            ]} />
            <div className="mt-3"><FeatureButton to="/calculator">Buka Calculator</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Target} tone="bg-forest-50 text-forest-700" title="8. Buat tujuan — Goals">
            <p>Goals menghubungkan hasil perencanaan dari Calculator dengan kondisi keuanganmu saat ini.</p>
            <StepList steps={[
              "Buka Goals.",
              "Pilih atau buat tujuan finansial yang ingin dicapai.",
              "Masukkan target sesuai hasil perhitungan atau target yang kamu tentukan.",
              "Tentukan sumber dana yang akan dialokasikan, misalnya dari tabungan atau dana lain yang tersedia.",
              "Pantau progres Goal dan sesuaikan alokasi jika kondisi keuangan berubah.",
            ]} />
            <div className="mt-3"><FeatureButton to="/goals">Buka Goals</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={ChartNoAxesCombined} tone="bg-forest-50 text-forest-700" title="9. Cek kesehatan keuangan — Report">
            <p>Report dipakai untuk membaca kondisi keuangan dari data yang sudah kamu masukkan.</p>
            <StepList steps={[
              "Buka Report.",
              "Lihat laporan Income Statement untuk memahami pemasukan dan pengeluaran.",
              "Lihat Cashflow untuk melihat arus uang.",
              "Lihat Asset untuk melihat posisi kekayaanmu.",
              "Gunakan hasil Report untuk menemukan bagian yang perlu diperbaiki atau diperbarui.",
            ]} />
            <div className="mt-3"><FeatureButton to="/finance">Buka Report</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={ShieldCheck} tone="bg-rose-50 text-rose-700" title="10. Lengkapi perlindungan & konsultasi — Protection + AI Assistant">
            <p>Protection membantu kamu mengecek kebutuhan perlindungan finansial dan berkonsultasi dengan konsultan asuransi manusia.</p>
            <StepList steps={[
              "Buka Protection.",
              "Lihat kebutuhan perlindungan yang ingin kamu evaluasi.",
              "Isi informasi yang diperlukan sesuai kondisi keuanganmu.",
              "Gunakan hasilnya sebagai bahan diskusi.",
              "Jika membutuhkan penjelasan atau rekomendasi produk, lanjutkan konsultasi dengan konsultan asuransi manusia.",
              "Untuk konsultasi keuangan umum, buka AI Assistant dan tulis kondisi atau pertanyaanmu. Setiap penggunaan AI mengonsumsi 1 kredit selama akses AI-mu aktif.",
            ]} />
            <div className="mt-3"><FeatureButton to="/protection">Buka Protection</FeatureButton></div>
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
