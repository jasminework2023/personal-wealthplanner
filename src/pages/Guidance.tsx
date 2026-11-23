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
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("wealthplanner:start-tour", { detail: { type: "main", route: "/" } }))}
            className="inline-flex min-h-10 items-center rounded-full border border-forest-100 bg-forest-50 px-4 py-2 text-[12px] font-semibold text-forest-700"
          >
            {id ? "Mulai Tour 1" : "Start Tour 1"}
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("wealthplanner:start-tour", { detail: { type: "usage", route: "/" } }))}
            className="inline-flex min-h-10 items-center rounded-full bg-[#0B6B47] px-4 py-2 text-[12px] font-semibold text-white"
          >
            {id ? "Mulai Tour 2" : "Start Tour 2"}
          </button>
        </div>
      </div>

      <Card className="overflow-hidden bg-gradient-to-br from-white via-forest-50/45 to-rose-50/30">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#123524] text-white">
            <BookOpen size={18} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal/40">Alur Wealthplanner</p>
            <p className="mt-1 text-[15px] font-semibold text-forest-900">
              Profile → Baseline keuangan → Saldo Wallet → Transaction → Budget → Asset Tracker
            </p>
            <p className="mt-2 text-[12px] leading-5 text-charcoal/55">
              Ikuti urutan ini agar saldo awal, transaksi, anggaran, dan aset tercatat dengan rapi sejak awal.
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
          title="Setup awal: ikuti 6 langkah ini"
          subtitle="Mulai dari profil, siapkan rekening dan saldo awal, lalu catat transaksi dan aset. Ikuti urutan ini agar laporanmu terbentuk dengan benar."
        />

        <div className="grid gap-4">
          <GuideCard icon={Settings2} tone="bg-forest-50 text-forest-700" title="1. Bereskan Profile">
            <p>Lengkapi profil lebih dulu supaya aplikasi mengenali preferensi dan pengaturan dasarmu.</p>
            <StepList steps={[
              "Buka Sidebar (☰), lalu pilih Profile atau Settings.",
              "Lengkapi nama dan informasi profil yang tersedia.",
              "Pilih bahasa aplikasi yang nyaman digunakan.",
              "Periksa kembali pengaturan dan simpan perubahan jika diminta.",
            ]} />
            <div className="mt-3"><FeatureButton to="/settings">Buka Profile & Settings</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={CircleDollarSign} tone="bg-forest-50 text-forest-700" title="2. Atur baseline keuangan dan rekening">
            <p>Sebelum membuat Wallet, tentukan dulu sumber pemasukan, kategori pengeluaran, tabungan/investasi, serta akun bank yang akan kamu gunakan. Pengaturannya ada di <strong className="text-forest-800">Settings → Pengaturan Baseline Keuangan</strong>.</p>
            <StepList steps={[
              "Buka Settings, lalu cari bagian Pengaturan Baseline Keuangan.",
              "Atur bagian Pemasukan: pilih sumber pemasukan yang sesuai, misalnya gaji, bonus, komisi, atau usaha.",
              "Atur bagian Pengeluaran: pilih kategori yang memang kamu gunakan, misalnya makan, transportasi, tempat tinggal, dan tagihan.",
              "Atur bagian Tabungan & Investasi: pilih kategori yang relevan dengan kebiasaan menyisihkan atau mengembangkan dana.",
              "Atur bagian Akun Bank/rekening yang akan digunakan untuk pencatatan.",
              "Tambahkan kategori sendiri dengan tombol + jika belum tersedia. Pilih yang benar-benar dipakai agar daftar tetap rapi.",
              "Simpan perubahan. Kategori ini akan menjadi pilihan saat mencatat transaksi dan menyusun budget.",
            ]} />
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[12px] font-semibold text-amber-900">Ingat</p>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">Limit kartu kredit bukan saldo rekening dan bukan aset. Jangan masukkan limit kartu kredit sebagai saldo Wallet.</p>
            </div>
            <div className="mt-3"><FeatureButton to="/settings">Buka Settings</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={WalletCards} tone="bg-forest-50 text-forest-700" title="3. Isi saldo saat ini di setiap Wallet">
            <p>Setelah rekening disiapkan, masukkan saldo yang benar-benar kamu miliki sekarang. Ini adalah <strong className="text-forest-800">saldo awal/existing balance</strong>, bukan total pemasukan sepanjang bulan.</p>
            <StepList steps={[
              "Buka menu Wallet. Rekening yang sudah disiapkan dari Settings akan muncul di sini.",
              "Buka satu Wallet, lalu pilih Atur wallet atau pengaturan saldo awal.",
              "Isi saldo aktual rekening tersebut hari ini. Contoh: saldo BCA Rp4.500.000, saldo BSI Rp2.000.000, dan tunai Rp500.000.",
              "Simpan, lalu ulangi untuk setiap Wallet yang kamu miliki.",
              "Periksa Total Saldo Wallet dan pastikan sesuai dengan saldo rekening/kas sebenarnya.",
              "Jika ada rekening yang belum tersedia, kembali ke Settings untuk melengkapi pengaturan baseline.",
            ]} />
            <p className="mt-2">Saldo awal menjadi titik mulai perhitungan. Transaksi yang dicatat setelahnya akan menambah atau mengurangi saldo Wallet secara otomatis.</p>
            <div className="mt-3"><FeatureButton to="/wallets">Buka Wallet</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Receipt} tone="bg-forest-50 text-forest-700" title="4. Mulai catat transaksi">
            <p>Setelah saldo awal benar, mulai catat aktivitas keuangan sejak tanggal kamu mulai menggunakan aplikasi. Pilih AI untuk menulis seperti chat atau Manual untuk mengisi satu per satu.</p>
            <div className="mt-3 rounded-xl border border-forest-100 bg-forest-50/60 p-3">
              <p className="text-[12px] font-semibold text-forest-900">Contoh menulis dengan AI</p>
              <div className="mt-2 space-y-2 text-[11px] leading-5 text-charcoal/70">
                <p className="rounded-lg bg-white px-3 py-2">“Gaji masuk Rp8.000.000 ke BCA.”</p>
                <p className="rounded-lg bg-white px-3 py-2">“Tadi makan siang Rp35.000 pakai BCA.”</p>
                <p className="rounded-lg bg-white px-3 py-2">“Bayar listrik Rp450.000 dari Mandiri.”</p>
                <p className="rounded-lg bg-white px-3 py-2">“Pindah uang Rp1.000.000 dari BCA ke BSI.”</p>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-forest-700">Tulis aktivitas + nominal + rekening/metode pembayaran. Pilih contoh untuk mengisi kolom, lalu sesuaikan dengan transaksi kamu.</p>
            </div>
            <StepList steps={[
              "Buka Transaction lalu pilih Tambah Transaksi.",
              "Pilih AI atau Manual.",
              "Untuk AI, tulis apa yang terjadi, nominal, dan Wallet yang digunakan. Proses teks dengan AI.",
              "Periksa tipe transaksi, tanggal, kategori, deskripsi, nominal, dan Wallet hasil pembacaan AI sebelum menyimpan.",
              "Untuk Manual, pilih Income, Expense, Saving, atau Transfer, lalu isi kolom yang diminta.",
              "Jika memindahkan uang antar-rekening sendiri, gunakan Transfer, bukan Expense atau Income.",
              "Simpan transaksi, lalu cek apakah transaksi muncul di daftar dan saldo Wallet berubah sesuai.",
            ]} />
            <div className="mt-3"><FeatureButton to="/transaction">Buka Transaction</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={PiggyBank} tone="bg-forest-50 text-forest-700" title="5. Atur Budget bulanan">
            <p>Setelah kategori dan transaksi mulai tersedia, buat batas pengeluaran bulanan agar kamu bisa membandingkan rencana dengan realisasi.</p>
            <StepList steps={[
              "Buka menu Budget.",
              "Pilih periode bulanan dan bulan yang ingin diatur.",
              "Pilih kategori pengeluaran yang ingin diberi batas, misalnya makan, transportasi, belanja, dan tagihan.",
              "Masukkan nominal maksimal yang realistis untuk setiap kategori.",
              "Simpan budget. Gunakan kategori yang sudah kamu aktifkan di baseline keuangan.",
              "Pantau realisasi secara berkala. Jika pengeluaran mendekati batas, evaluasi sisa budget sebelum berbelanja lagi.",
            ]} />
            <div className="mt-3"><FeatureButton to="/budgeting">Buka Budget</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={TrendingUp} tone="bg-forest-50 text-forest-700" title="6. Catat aset yang sudah kamu miliki">
            <p>Masukkan posisi kekayaanmu saat ini agar Asset Tracker menampilkan gambaran aset dan komposisi portofolio. Catat nilai aset yang sudah dimiliki sekarang, bukan hanya transaksi pembeliannya.</p>
            <StepList steps={[
              "Buka Asset Tracker dari menu Asset atau Home.",
              "Liquid Assets: periksa saldo kas dan rekening. Bagian ini terhubung dengan Wallet, jadi jangan input ulang saldo rekening yang sudah tercatat agar tidak double counting.",
              "Investment Assets/Portfolio: tambahkan investasi yang sudah dimiliki seperti obligasi, emas, reksa dana, P2P lending, atau investasi lainnya. Isi nama/kategori dan nilai saat ini sesuai kolom yang tersedia.",
              "Portfolio Saham/Stock Tracker: catat saham yang dimiliki dengan kode saham (ticker), jumlah lembar/lot, harga beli atau rata-rata pembelian, dan harga pasar saat ini jika diminta.",
              "Real Assets/Aset Riil: tambahkan aset seperti rumah, tanah, kendaraan, atau aset berharga lainnya, lalu masukkan estimasi nilai saat ini.",
              "Periksa Portfolio Allocation untuk melihat komposisi aset berdasarkan jenisnya.",
              "Simpan dan cek total Asset Tracker. Pastikan saldo Wallet tidak tercatat dua kali sebagai aset tambahan.",
            ]} />
            <div className="mt-3 rounded-xl border border-forest-100 bg-forest-50/60 p-3">
              <p className="text-[12px] font-semibold text-forest-900">Contoh data existing</p>
              <p className="mt-1 text-[11px] leading-5 text-charcoal/65">Punya 10 lot saham BBCA, 5 gram emas, deposito Rp20 juta, dan mobil? Masukkan posisi kepemilikan dan estimasi nilai saat ini ke bagian yang sesuai. Tidak perlu membuat transaksi pembelian lama satu per satu hanya untuk membentuk saldo aset awal.</p>
            </div>
            <div className="mt-3"><FeatureButton to="/assets">Buka Asset Tracker</FeatureButton></div>
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
