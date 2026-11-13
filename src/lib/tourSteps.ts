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
    id: "navigation",
    route: "/",
    selectorDesktop: '[data-tour="desktop-sidebar"]',
    selectorMobile: '[data-tour="mobile-menu-button"]',
    title: "1. Kenali Navigasi",
    description: "Gunakan sidebar di desktop atau tombol ☰ di mobile untuk berpindah halaman dan membuka Profil.",
  },
  {
    id: "theme",
    route: "/",
    selectorDesktop: '[data-tour="theme-toggle"]',
    selectorMobile: '[data-tour="theme-toggle"]',
    title: "2. Atur Tampilan",
    description: "Ganti Mode Gelap atau Mode Terang kapan saja sesuai kenyamananmu.",
    advanceOnTargetClick: false,
  },
  {
    id: "asset-budget",
    route: "/",
    selectorDesktop: '[data-tour="home-assets-desktop"]',
    selectorMobile: '[data-tour="home-assets-mobile"]',
    title: "3. Asset & Budget Tracker",
    description: "Geser kartu di mobile untuk melihat Asset atau Budget. Di sini kamu bisa memantau kondisi aset dan sisa anggaran.",
  },
  {
    id: "main-menu",
    route: "/",
    selectorDesktop: '[data-tour="main-menu"]',
    selectorMobile: '[data-tour="main-menu"]',
    title: "4. Menu Utama",
    description: "Semua fitur utama ada di sini: Transaction, Wallet, Budget, Asset, Calculator, Goals, Protection, Report, Community, AI Assistant, dan Guide.",
  },
  {
    id: "navigation",
    route: "/",
    selectorDesktop: '[data-tour="desktop-sidebar"]',
    selectorMobile: '[data-tour="mobile-bottom-nav"]',
    title: "5. Navigasi",
    description: "Gunakan navigasi utama untuk berpindah halaman dengan cepat. Di mobile, gunakan bar navigasi di bagian bawah.",
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
    description: "Klik Wallet untuk membuka dan mengelola saldo rekening, kas, dan akun investasi.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-asset",
    route: "/assets",
    selectorDesktop: '[data-tour="menu-asset"]',
    selectorMobile: '[data-tour="menu-asset"]',
    title: "10. Asset",
    description: "Klik Asset untuk melihat aset, target aset, dan posisi investasi yang kamu miliki.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-budget",
    route: "/budgeting",
    selectorDesktop: '[data-tour="menu-budget"]',
    selectorMobile: '[data-tour="menu-budget"]',
    title: "11. Budget",
    description: "Klik Budget untuk mengatur anggaran dan membandingkannya dengan realisasi pengeluaran.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-transaction",
    route: "/transaction",
    selectorDesktop: '[data-tour="menu-transaction"]',
    selectorMobile: '[data-tour="menu-transaction"]',
    title: "12. Transaksi",
    description: "Klik Transaction untuk mencatat pemasukan, pengeluaran, tabungan, pembelian saham, atau transfer.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-calculator",
    route: "/calculator",
    selectorDesktop: '[data-tour="menu-calculator"]',
    selectorMobile: '[data-tour="menu-calculator"]',
    title: "13. Kalkulator",
    description: "Klik Financial Calculator untuk menghitung kebutuhan pendidikan, Haji, KPR, pensiun, dan lainnya.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-report",
    route: "/finance",
    selectorDesktop: '[data-tour="menu-report"]',
    selectorMobile: '[data-tour="menu-report"]',
    title: "14. Report",
    description: "Klik Report untuk mengevaluasi pemasukan, pengeluaran, aset, dan arus kas.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-goals",
    route: "/goals",
    selectorDesktop: '[data-tour="menu-goals"]',
    selectorMobile: '[data-tour="menu-goals"]',
    title: "15. Goals",
    description: "Klik Goals untuk membuat dan memantau target keuanganmu.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-protection",
    route: "/protection",
    selectorDesktop: '[data-tour="menu-protection"]',
    selectorMobile: '[data-tour="menu-protection"]',
    title: "16. Protection",
    description: "Klik Protection untuk melihat kebutuhan perlindungan finansial dan gap proteksimu.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-ai-assistant",
    route: "/ai-assistant",
    selectorDesktop: '[data-tour="menu-ai-assistant"]',
    selectorMobile: '[data-tour="menu-ai-assistant"]',
    title: "17. AI Assistant",
    description: "Klik AI Assistant untuk bertanya dan menganalisis kondisi keuangan berdasarkan data Wealthplanner.",
    advanceOnTargetClick: true
  },
];
export function getTourSteps(type: "main" | "page" | "usage", route: string): TourStep[] {
  if (type === "main") return mainTourSteps;
  if (type === "usage") return usageTourSteps;
  return pageTourSteps[route] || [];
}
