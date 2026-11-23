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
  Users,
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
            onClick={() => window.dispatchEvent(new CustomEvent("wealthplanner:start-tour", { detail: { type: "welcome", route: "/" } }))}
            className="inline-flex min-h-10 items-center rounded-full bg-[#0B6B47] px-5 py-2.5 text-[12px] font-semibold text-white shadow-sm"
          >
            {id ? "Mulai Tur Interaktif" : "Start Interactive Tour"}
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
              Profile → Baseline → Saldo Wallet → Transaction → Budget → Aset → Utang → Calculator → Goals → Report → Protection → AI → Community → Settings
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
          <GuideCard icon={CheckCircle2} tone="bg-forest-50 text-forest-700" title="1. Ceklis: koneksi dan token aktif">
            <p>
              Ceklis hijau di samping sapaan pada Home menandakan dashboard berhasil terhubung dan token akses aktif. Artinya, Wealthplanner dapat memuat data keuangan dari akunmu. Jika ceklis belum muncul, periksa kembali koneksi dashboard.
            </p>
          </GuideCard>

          <GuideCard icon={Moon} tone="bg-forest-50 text-forest-700" title="2. Atur Tampilan">
            <p>
              Gunakan ikon <strong className="text-forest-800">matahari/bulan</strong> di kanan atas untuk mengganti <strong>Mode Terang</strong> atau <strong>Mode Gelap</strong>. Pengaturan ini bisa diubah kapan saja dan tidak memengaruhi data keuanganmu.
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
          title="Journey Wealthplanner: ikuti 14 langkah"
          subtitle="Ikuti urutan dari menyiapkan profil sampai memahami seluruh fitur. Selesaikan data dasar lebih dulu agar hasil transaksi, budget, aset, utang, dan laporan saling terhubung."
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

          <GuideCard icon={CircleDollarSign} tone="bg-rose-50 text-rose-700" title="7. Catat utang yang masih berjalan">
            <p>Catat kewajiban yang masih harus kamu lunasi supaya gambaran kekayaan bersih tidak hanya melihat aset. Utang bukan pengeluaran baru saat kamu memasukkan saldo awalnya; ini adalah posisi kewajiban saat ini.</p>
            <StepList steps={[
              "Buka menu Report/Finance lalu pilih tab Debt Tracker, atau gunakan pintasan Debt Tracker jika tersedia.",
              "Tambahkan setiap kewajiban yang masih berjalan, misalnya KPR, kendaraan, pinjaman pribadi, paylater, atau kartu kredit.",
              "Masukkan nama utang, sisa pokok/tagihan saat ini, dan informasi cicilan sesuai kolom yang tersedia.",
              "Gunakan sisa pokok yang belum dibayar, bukan total pinjaman awal jika sebagian sudah dilunasi.",
              "Perbarui nilainya setelah melakukan pembayaran pokok atau ketika tagihan kartu kredit berubah.",
              "Jangan masukkan limit kartu kredit sebagai aset. Yang dicatat sebagai kewajiban adalah tagihan/pemakaian yang harus dibayar."
            ]} />
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[12px] font-semibold text-amber-900">Contoh</p>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">Sisa pokok KPR Rp350 juta dan tagihan kartu kredit Rp2 juta: catat sebagai kewajiban masing-masing. Limit kartu kredit Rp20 juta tidak dicatat sebagai aset maupun utang.</p>
            </div>
            <div className="mt-3"><FeatureButton to="/debt">Buka Debt Tracker</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Calculator} tone="bg-forest-50 text-forest-700" title="8. Gunakan Financial Calculator">
            <p>Calculator membantu mengubah tujuan atau pertanyaan keuangan menjadi simulasi angka. Isi asumsi yang diminta, baca hasilnya, lalu simpan simulasi yang ingin kamu tindak lanjuti.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ["Financial Check-Up", "Menilai cashflow, utang, dana darurat, dan likuiditas."],
                ["KPR", "Membandingkan simulasi pembiayaan rumah konvensional atau syariah."],
                ["Dana Pendidikan", "Memproyeksikan biaya pendidikan dan kebutuhan menabung."],
                ["Dana Pensiun", "Mengestimasi kebutuhan masa pensiun dan setoran rutin."],
                ["Perencanaan Warisan", "Membuat simulasi pembagian aset berdasarkan ahli waris."],
                ["Haji & Umroh", "Menghitung target biaya dan rencana pelunasan."],
                ["Zakat dan Wakaf", "Membantu simulasi zakat penghasilan, zakat maal, dan wakaf."],
                ["Investasi", "Memproyeksikan pertumbuhan investasi dan kebutuhan setoran."],
                ["Kebutuhan Asuransi", "Mengestimasi kebutuhan uang pertanggungan berdasarkan penghasilan."]
              ].map(([name, desc]) => <div key={name} className="rounded-xl border border-charcoal/8 bg-charcoal/[0.02] p-3"><p className="text-[12px] font-semibold text-forest-900">{name}</p><p className="mt-1 text-[11px] leading-5 text-charcoal/55">{desc}</p></div>)}
            </div>
            <StepList steps={[
              "Pilih jenis kalkulator yang sesuai dengan pertanyaanmu.",
              "Isi nominal dan asumsi berdasarkan kondisi nyata. Jika belum tahu, gunakan asumsi sementara dan tandai untuk ditinjau kembali.",
              "Perhatikan satuan, jangka waktu, inflasi, dan tingkat imbal hasil/bunga yang diminta.",
              "Baca ringkasan dan hasil simulasi. Ubah asumsi untuk membandingkan beberapa skenario.",
              "Simpan hasil yang relevan agar bisa dilanjutkan sebagai Goals."
            ]} />
            <p className="mt-2 text-[11px] text-charcoal/55">Hasil merupakan simulasi berdasarkan input dan asumsi, bukan janji hasil atau rekomendasi investasi personal.</p>
            <div className="mt-3"><FeatureButton to="/calculator">Buka Calculator</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Target} tone="bg-forest-50 text-forest-700" title="9. Buat Goals dari rencana keuangan">
            <p>Goals digunakan untuk mengubah hasil perhitungan atau keinginan finansial menjadi target yang bisa dipantau progresnya—misalnya dana darurat, pendidikan, rumah, haji, pensiun, atau investasi.</p>
            <StepList steps={[
              "Buat simulasi lebih dulu di Calculator, lalu pilih simpan hasil jika ingin menjadikannya rencana.",
              "Buka Goals untuk melihat target yang tersimpan. Kamu juga bisa menambahkan target manual.",
              "Periksa nama target, kategori, nominal target, dan saran setoran dari simulasi.",
              "Gunakan Alokasikan Dana untuk menghubungkan aset yang sudah dimiliki dengan tujuan. Ini menandai alokasi, bukan memindahkan uang secara fisik.",
              "Pantau persentase progres dan perbarui alokasi ketika kondisi berubah."
            ]} />
            <div className="mt-3"><FeatureButton to="/goals">Buka Goals</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={ChartNoAxesCombined} tone="bg-forest-50 text-forest-700" title="10. Baca Report untuk evaluasi">
            <p>Report/Finance merangkum data yang sudah kamu masukkan. Gunakan untuk melihat apa yang terjadi, bukan sekadar mengumpulkan angka.</p>
            <div className="mt-3 space-y-2">
              {[
                ["Income Statement", "Melihat pemasukan, pengeluaran, surplus/defisit, tren bulanan, dan rincian kategori."],
                ["Asset Tracker", "Melihat aset likuid, investasi, portofolio saham, aset riil, alokasi, dan perkembangan target aset."],
                ["Debt Tracker", "Memantau sisa kewajiban dan utang yang masih berjalan."],
                ["Cashflow Tracker", "Melihat arus uang masuk dan keluar serta pengeluaran berdasarkan kategori."]
              ].map(([name, desc]) => <div key={name} className="rounded-xl border border-charcoal/8 p-3"><p className="text-[12px] font-semibold text-forest-900">{name}</p><p className="mt-1 text-[11px] leading-5 text-charcoal/55">{desc}</p></div>)}
            </div>
            <StepList steps={[
              "Buka Report/Finance dan pilih periode bulan atau tahun yang ingin diperiksa.",
              "Pilih tab laporan yang ingin dibaca.",
              "Bandingkan rencana dengan realisasi, perhatikan kategori yang paling besar, dan cari perubahan dari bulan sebelumnya.",
              "Jika angka tidak sesuai, periksa kembali transaksi, saldo Wallet, aset, dan utang sumbernya."
            ]} />
            <div className="mt-3"><FeatureButton to="/finance">Buka Report</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={ShieldCheck} tone="bg-forest-50 text-forest-700" title="11. Pahami Protection">
            <p>Protection membantu memetakan risiko finansial yang bisa mengganggu rencana, seperti kehilangan penghasilan, biaya kesehatan, atau kewajiban keluarga. Tujuannya memahami kebutuhan dan gap proteksi, bukan langsung membeli produk.</p>
            <StepList steps={[
              "Buka Protection dan pilih atau buat rencana yang ingin dianalisis.",
              "Masukkan kebutuhan/target kewajiban, misalnya kebutuhan keluarga, pendidikan, pembiayaan, atau tujuan lain yang relevan.",
              "Isi dana atau aset yang sudah disiapkan dan manfaat proteksi yang sudah dimiliki jika ada.",
              "Periksa estimasi gap antara kebutuhan dan sumber daya/proteksi yang tersedia.",
              "Gunakan hasilnya sebagai bahan evaluasi; cek kembali syarat, pengecualian, masa tunggu, dan kemampuan membayar sebelum memilih perlindungan."
            ]} />
            <div className="mt-3"><FeatureButton to="/protection">Buka Protection</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={MessageCircle} tone="bg-forest-50 text-forest-700" title="12. Gunakan AI Assistant sebagai tutor keuangan">
            <p>AI Assistant bisa membantu memahami data dashboard yang terhubung, membaca pola pengeluaran, dan memberi ide evaluasi. Anggap sebagai teman diskusi dan tutor, bukan pengganti keputusanmu.</p>
            <div className="mt-3 rounded-xl border border-forest-100 bg-forest-50/60 p-3">
              <p className="text-[12px] font-semibold text-forest-900">Contoh pertanyaan yang bisa dicoba</p>
              <div className="mt-2 space-y-2 text-[11px] leading-5 text-charcoal/70">
                <p className="rounded-lg bg-white px-3 py-2">“Tolong jelaskan kondisi cashflow-ku bulan ini.”</p>
                <p className="rounded-lg bg-white px-3 py-2">“Kategori pengeluaran terbesarku apa?”</p>
                <p className="rounded-lg bg-white px-3 py-2">“Apa yang bisa aku evaluasi dari budget bulan ini?”</p>
                <p className="rounded-lg bg-white px-3 py-2">“Bantu aku memahami perbedaan aset dan utang.”</p>
              </div>
            </div>
            <StepList steps={[
              "Pastikan transaksi, Wallet, budget, aset, dan utang sudah diisi agar analisis punya konteks.",
              "Buka AI Assistant dan pilih contoh pertanyaan atau ketik pertanyaanmu sendiri.",
              "Minta penjelasan langkah demi langkah jika ada istilah yang belum dipahami.",
              "Periksa kembali angka penting dengan Report dan data sumber di aplikasi.",
              "Gunakan tombol riwayat untuk melanjutkan percakapan sebelumnya."
            ]} />
            <p className="mt-2 text-[11px] text-charcoal/55">Ketersediaan chat mengikuti akses dan kredit AI pada akunmu. Hindari memasukkan password, PIN, atau data rahasia.</p>
            <div className="mt-3"><FeatureButton to="/ai-assistant">Buka AI Assistant</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Users} tone="bg-forest-50 text-forest-700" title="13. Bergabung dengan Community">
            <p>Community adalah ruang untuk belajar, berbagi insight, dan berdiskusi tentang perjalanan finansial bersama pengguna lain.</p>
            <StepList steps={[
              "Buka menu Community.",
              "Baca tujuan dan aturan dasar komunitas.",
              "Pilih Gabung Community WhatsApp jika ingin ikut berdiskusi.",
              "Jaga privasi: jangan membagikan nomor rekening, detail saldo, password, atau dokumen pribadi di ruang publik."
            ]} />
            <div className="mt-3"><FeatureButton to="/community">Buka Community</FeatureButton></div>
          </GuideCard>

          <GuideCard icon={Settings2} tone="bg-forest-50 text-forest-700" title="14. Kembali ke Settings untuk mengelola aplikasi">
            <p>Settings adalah pusat pengaturan profil dan preferensi. Kamu bisa kembali ke sini kapan pun untuk memperbarui data dasar dan pengaturan akun.</p>
            <StepList steps={[
              "Periksa dan ubah nama/profil yang ditampilkan jika diperlukan.",
              "Atur bahasa aplikasi dan preferensi tampilan yang tersedia.",
              "Kelola Pengaturan Baseline Keuangan: sumber pemasukan, kategori pengeluaran, tabungan/investasi, dan rekening.",
              "Periksa pengaturan integrasi spreadsheet atau fitur berbagi jika digunakan.",
              "Cek status akses AI PRO+ dan masa aktifnya jika fitur membership tersedia di akunmu."
            ]} />
            <p className="mt-2 text-[11px] text-charcoal/55">Langkah 1 dan 2 sama-sama menggunakan area Settings: lengkapi profil terlebih dahulu, lalu atur baseline keuangan sebelum menambahkan saldo Wallet.</p>
            <div className="mt-3"><FeatureButton to="/settings">Buka Settings</FeatureButton></div>
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
