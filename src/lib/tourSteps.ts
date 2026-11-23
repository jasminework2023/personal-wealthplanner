export type TourStep = {
  id: string;
  route: string;
  selectorDesktop: string;
  selectorMobile: string;
  title: string;
  description: string;
  advanceOnTargetClick?: boolean;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
};

export const mainTourSteps: TourStep[] = [
  {
    id: "connection-status",
    route: "/",
    selectorDesktop: '[data-tour="connection-status"]',
    selectorMobile: '[data-tour="connection-status"]',
    title: "1. Status Koneksi & Token",
    description: "Tanda ceklis hijau berarti dashboard berhasil terhubung dan token akses aktif, sehingga data keuanganmu dapat dimuat. Jika tanda ini belum muncul, periksa koneksi dashboard terlebih dahulu.",
  },
  {
    id: "theme",
    route: "/",
    selectorDesktop: '[data-tour="theme-toggle"]',
    selectorMobile: '[data-tour="theme-toggle"]',
    title: "2. Atur Tampilan",
    description: "Ketuk ikon matahari atau bulan di kanan atas untuk berganti Mode Terang dan Mode Gelap. Pengaturan ini hanya mengubah tampilan, bukan data keuanganmu.",
    advanceOnTargetClick: false,
  },
  {
    id: "asset-budget",
    route: "/",
    selectorDesktop: '[data-tour="home-assets-budget-desktop"]',
    selectorMobile: '[data-tour="home-assets-budget-mobile"]',
    title: "3. Asset & Budget Tracker",
    description: "Di desktop, lihat dua kartu yang disorot: Total Aset di kiri dan Sisa Anggaran di kanan. Di HP, geser kartu ke samping untuk berpindah dari Asset Tracker ke Budget Tracker. Ketuk kartu untuk membuka detailnya.",
  },
  {
    id: "main-menu",
    route: "/",
    selectorDesktop: '[data-tour="main-menu-heading"]',
    selectorMobile: '[data-tour="main-menu-heading"]',
    title: "4. Menu Utama",
    description: "Ketuk judul Menu Utama untuk membuka atau menyembunyikan daftar fitur. Geser halaman seperti biasa untuk melihat bagian lain—petunjuk ini tidak mengunci navigasi.",
  },
  {
    id: "navigation",
    route: "/",
    selectorDesktop: '[data-tour="desktop-sidebar"]',
    selectorMobile: '[data-tour="mobile-bottom-nav"]',
    title: "5. Navigasi",
    description: "Di desktop, gunakan sidebar di sebelah kiri. Di ponsel, gunakan navigasi bawah atau buka menu dari tombol ☰. Kamu tetap bisa menggulir halaman saat tur berjalan.",
    advanceOnTargetClick: false,
  },
];

export const pageTourSteps: Record<string, TourStep[]> = {
  "/finance": [
    { id: "report-summary", route: "/finance", selectorDesktop: '[data-tour="report-summary"]', selectorMobile: '[data-tour="report-summary"]', title: "Ringkasan Laporan", description: "Lihat gambaran pemasukan, pengeluaran, dan posisi keuanganmu." },
    { id: "report-trends", route: "/finance", selectorDesktop: '[data-tour="report-trends"]', selectorMobile: '[data-tour="report-trends"]', title: "Tren Keuangan", description: "Lihat perubahan pemasukan dan pengeluaran dari waktu ke waktu." },
    { id: "report-categories", route: "/finance", selectorDesktop: '[data-tour="report-categories"]', selectorMobile: '[data-tour="report-categories"]', title: "Detail Kategori", description: "Cek kategori yang paling banyak membentuk pemasukan dan pengeluaranmu." },
  ],
  "/budgeting": [
    { id: "budget-summary", route: "/budgeting", selectorDesktop: '[data-tour="budget-summary"]', selectorMobile: '[data-tour="budget-summary"]', title: "Ringkasan Anggaran", description: "Lihat batas anggaran dan realisasi bulan ini." },
    { id: "budget-income", route: "/budgeting", selectorDesktop: '[data-tour="budget-income"]', selectorMobile: '[data-tour="budget-income"]', title: "Penghasilan", description: "Atur target penghasilan dan lihat realisasinya." },
    { id: "budget-expense", route: "/budgeting", selectorDesktop: '[data-tour="budget-expense"]', selectorMobile: '[data-tour="budget-expense"]', title: "Pengeluaran", description: "Atur batas per kategori dan pantau pemakaiannya." },
  ],
  "/wallets": [
    { id: "wallet-summary", route: "/wallets", selectorDesktop: '[data-tour="wallet-summary"]', selectorMobile: '[data-tour="wallet-summary"]', title: "Wallet", description: "Kelola saldo kas, rekening, dan akun investasi dari satu tempat." },
    { id: "wallet-list", route: "/wallets", selectorDesktop: '[data-tour="wallet-list"]', selectorMobile: '[data-tour="wallet-list"]', title: "Daftar Wallet", description: "Setiap wallet menjadi sumber saldo untuk pencatatan keuanganmu." },
    { id: "wallet-transfer", route: "/wallets", selectorDesktop: '[data-tour="wallet-transfer"]', selectorMobile: '[data-tour="wallet-transfer"]', title: "Transfer", description: "Pindahkan saldo antar wallet tanpa membuatnya menjadi pengeluaran." },
  ],
  "/calculator": [
    { id: "calculator-header", route: "/calculator", selectorDesktop: '[data-tour="calculator-header"]', selectorMobile: '[data-tour="calculator-header"]', title: "Financial Calculator", description: "Pilih kebutuhan finansial yang ingin kamu hitung." },
    { id: "calculator-list", route: "/calculator", selectorDesktop: '[data-tour="calculator-list"]', selectorMobile: '[data-tour="calculator-list"]', title: "Pilihan Kalkulator", description: "Hitung kebutuhan seperti pendidikan, Haji, pensiun, KPR, dan lainnya." },
    { id: "calculator-first-item", route: "/calculator", selectorDesktop: '[data-tour="calculator-first-item"]', selectorMobile: '[data-tour="calculator-first-item"]', title: "Mulai Simulasi", description: "Pilih salah satu kalkulator untuk mulai menghitung kebutuhanmu." },
  ],
};

export const usageTourSteps: TourStep[] = [
  {
    id: "usage-profile",
    route: "/",
    selectorDesktop: '[data-tour="sidebar-profile"]',
    selectorMobile: '[data-tour="mobile-bottom-profile"]',
    title: "1. Profil",
    description: "Buka Profil untuk masuk langsung ke Profil & Pengaturan.",
    advanceOnTargetClick: true,
  },
  {
    id: "usage-setup-income",
    route: "/settings",
    selectorDesktop: '[data-tour="setup-income"]',
    selectorMobile: '[data-tour="setup-income"]',
    title: "2. Setup Pemasukan",
    description: "Atur sumber pemasukan yang ingin kamu gunakan. Kategori ini akan menjadi pilihan saat mencatat transaksi.",
  },
  {
    id: "usage-setup-expense",
    route: "/settings",
    selectorDesktop: '[data-tour="setup-expense"]',
    selectorMobile: '[data-tour="setup-expense"]',
    title: "3. Setup Pengeluaran",
    description: "Atur kategori pengeluaran yang ingin digunakan untuk pencatatan dan anggaran.",
  },
  {
    id: "usage-setup-saving",
    route: "/settings",
    selectorDesktop: '[data-tour="setup-saving"]',
    selectorMobile: '[data-tour="setup-saving"]',
    title: "4. Setup Tabungan & Investasi",
    description: "Atur kategori tabungan dan investasi yang kamu gunakan untuk membangun aset dan tujuan finansial.",
  },
  {
    id: "usage-setup-bank",
    route: "/settings",
    selectorDesktop: '[data-tour="setup-bank"]',
    selectorMobile: '[data-tour="setup-bank"]',
    title: "5. Setup Nama Akun",
    description: "Atur nama akun seperti BCA, Mandiri, Cash, atau akun lain yang kamu gunakan. Bagian ini akan menjadi pilihan wallet saat mencatat transaksi.",
  },
  {
    id: "usage-profile-card",
    route: "/settings",
    selectorDesktop: '[data-tour="profile-settings-fields"]',
    selectorMobile: '[data-tour="profile-settings-fields"]',
    title: "6. Atur Profil",
    description: "Atur nama tampilan dan bahasa aplikasi sesuai kebutuhanmu.",
  },
  {
    id: "usage-spouse-sharing",
    route: "/settings",
    selectorDesktop: '[data-tour="spouse-sharing"]',
    selectorMobile: '[data-tour="spouse-sharing"]',
    title: "7. Spouse Sharing",
    description: "Hubungkan akun dengan pasangan untuk mengelola perencanaan keuangan bersama tanpa berbagi password.",
  },
  {
    id: "usage-ai-membership",
    route: "/settings",
    selectorDesktop: '[data-tour="ai-membership"]',
    selectorMobile: '[data-tour="ai-membership"]',
    title: "8. AI Membership",
    description: "Cek status akses AI dan kelola membership AI PRO+ untuk menggunakan Financial Assistant dan AI Scan Struk.",
  },
  {
    id: "usage-wallet",
    route: "/wallets",
    selectorDesktop: '[data-tour="menu-wallet"]',
    selectorMobile: '[data-tour="menu-wallet"]',
    title: "9. Wallet",
    description: "Lihat total saldo seluruh wallet aktif, lalu kelola rekening, kas, dan akun investasimu dari satu tempat.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-wallet-add",
    route: "/wallets",
    selectorDesktop: '[data-tour="wallet-add"]',
    selectorMobile: '[data-tour="wallet-add"]',
    title: "10. Tambah Wallet",
    description: "Tekan + Tambah untuk mengatur rekening atau dompet baru melalui Pengaturan. Setelah disimpan, wallet akan muncul di daftar ini.",
  },
  {
    id: "usage-wallet-cards",
    route: "/wallets",
    selectorDesktop: '[data-tour="wallet-list-heading"]',
    selectorMobile: '[data-tour="wallet-list-heading"]',
    title: "11. Daftar Wallet",
    description: "Setiap kartu menunjukkan saldo dan ringkasan transaksi wallet. Ketuk kartu untuk membuka detail dan riwayatnya. Gulir halaman untuk melihat wallet lain; kartu petunjuk ini juga bisa digeser agar tidak menutupi tampilan.",
  },
  {
    id: "usage-wallet-transfer",
    route: "/wallets",
    selectorDesktop: '[data-tour="wallet-transfer"]',
    selectorMobile: '[data-tour="wallet-transfer"]',
    title: "12. Transfer Antar-Wallet",
    description: "Gunakan Transfer untuk memindahkan saldo dari satu wallet ke wallet lain. Transfer tidak dihitung sebagai pengeluaran baru.",
  },
  {
    id: "usage-asset",
    route: "/assets",
    selectorDesktop: '[data-tour="asset-total"]',
    selectorMobile: '[data-tour="asset-total"]',
    title: "13. Asset",
    description: "Pantau nilai aset, target aset, dan posisi investasimu dalam satu tampilan.",
  },
  {
    id: "usage-budget",
    route: "/budgeting",
    selectorDesktop: '[data-tour="budget-summary"]',
    selectorMobile: '[data-tour="budget-summary"]',
    title: "14. Budget",
    description: "Atur anggaran dan bandingkan rencana dengan realisasi pengeluaran.",
  },
  {
    id: "usage-transaction",
    route: "/transaction",
    selectorDesktop: '[data-tour="transaction-add"]',
    selectorMobile: '[data-tour="transaction-add"]',
    title: "15. Transaksi",
    description: "Catat pemasukan, pengeluaran, tabungan, pembelian saham, dan transfer.",
  },
  {
    id: "usage-calculator",
    route: "/calculator",
    selectorDesktop: '[data-tour="calculator-header"]',
    selectorMobile: '[data-tour="calculator-header"]',
    title: "16. Kalkulator",
    description: "Simulasikan kebutuhan pendidikan, Haji, KPR, pensiun, dan tujuan finansial lainnya.",
  },
  {
    id: "usage-report",
    route: "/finance",
    selectorDesktop: '[data-tour="report-summary"]',
    selectorMobile: '[data-tour="report-summary"]',
    title: "17. Report",
    description: "Evaluasi pemasukan, pengeluaran, aset, dan arus kas melalui ringkasan laporan.",
  },
  {
    id: "usage-goals",
    route: "/goals",
    selectorDesktop: '[data-tour="goals-page"]',
    selectorMobile: '[data-tour="goals-page"]',
    title: "18. Goals",
    description: "Susun target keuangan dan pantau progres pencapaiannya.",
  },
  {
    id: "usage-protection",
    route: "/protection",
    selectorDesktop: '[data-tour="protection-page"]',
    selectorMobile: '[data-tour="protection-page"]',
    title: "19. Protection",
    description: "Petakan kebutuhan perlindungan finansial dan lihat potensi gap proteksi.",
  },
  {
    id: "usage-ai-assistant",
    route: "/ai-assistant",
    selectorDesktop: '[data-tour="ai-assistant-page"]',
    selectorMobile: '[data-tour="ai-assistant-page"]',
    title: "20. AI Assistant",
    description: "Tanyakan kondisi keuanganmu dan dapatkan analisis berdasarkan data Wealthplanner.",
  },
];
export function getTourSteps(type: "main" | "page" | "usage", route: string): TourStep[] {
  if (type === "main") return mainTourSteps;
  if (type === "usage") return usageTourSteps;
  return pageTourSteps[route] || [];
}
