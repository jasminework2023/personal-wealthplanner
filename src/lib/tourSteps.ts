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
    id: "quick-access",
    route: "/",
    selectorDesktop: '[data-tour="main-menu"]',
    selectorMobile: '[data-tour="mobile-bottom-nav"]',
    title: "5. Akses Cepat",
    description: "Di mobile, navigasi bawah memberi akses cepat ke Beranda, Transaksi, Target, Profil, dan tombol +. Di desktop, fitur utama bisa diakses dari Menu Utama.",
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
    selectorMobile: '[data-tour="mobile-menu-button"]',
    title: "1. Buka Menu",
    description: "Klik ikon ☰ untuk membuka menu navigasi dan menemukan Profil & Pengaturan.",
    advanceOnTargetClick: true,
  },
  {
    id: "usage-profile-mobile",
    route: "/",
    selectorDesktop: '[data-tour="sidebar-profile"]',
    selectorMobile: '[data-tour="sidebar-profile"]',
    title: "2. Buka Profil",
    description: "Klik Profil & Pengaturan di menu navigasi.",
    advanceOnTargetClick: true,
  },
  {
    id: "usage-profile-settings",
    route: "/",
    selectorDesktop: '[data-tour="profile-settings-link"]',
    selectorMobile: '[data-tour="sidebar-profile"]',
    title: "2. Buka Profil & Pengaturan",
    description: "Klik tombol Profil & Pengaturan untuk membuka pilihan Profil.",
    advanceOnTargetClick: true,
  },
  {
    id: "usage-profile-settings-mobile",
    route: "/",
    selectorDesktop: '[data-tour="profile-settings-link"]',
    selectorMobile: '[data-tour="profile-settings-link"]',
    title: "3. Buka Profil & Pengaturan",
    description: "Klik Buka Profil & Pengaturan untuk masuk ke halaman pengaturan akun.",
    advanceOnTargetClick: true,
    mobileOnly: true,
  },
  {
    id: "usage-setup",
    route: "/settings",
    selectorDesktop: '[data-tour="setup-card"]',
    selectorMobile: '[data-tour="setup-card"]',
    title: "4. Setup Mesin Keuangan",
    description: "Atur Pemasukan, Pengeluaran, Tabungan & Investasi, dan Akun Bank terlebih dahulu. Setup ini menjadi fondasi untuk Transaction dan Budget.",
  },
  {
    id: "usage-ai-membership",
    route: "/settings",
    selectorDesktop: '[data-tour="ai-membership"]',
    selectorMobile: '[data-tour="ai-membership"]',
    title: "5. AI Membership",
    description: "Setelah payment, kamu mendapatkan akses gratis ke fitur AI dengan penggunaan terbatas. Untuk penggunaan lebih lanjut, kamu dapat berlangganan AI PRO+.",
  },
  {
    id: "usage-wallet",
    route: "/wallets",
    selectorDesktop: '[data-tour="menu-wallet"]',
    selectorMobile: '[data-tour="menu-wallet"]',
    title: "6. Wallet",
    description: "Klik ikon Wallet untuk membuka dan mengelola saldo rekeningmu.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-asset",
    route: "/assets",
    selectorDesktop: '[data-tour="menu-asset"]',
    selectorMobile: '[data-tour="menu-asset"]',
    title: "7. Asset",
    description: "Klik ikon Asset untuk membuka dan memantau asetmu.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-budget",
    route: "/budgeting",
    selectorDesktop: '[data-tour="menu-budget"]',
    selectorMobile: '[data-tour="menu-budget"]',
    title: "8. Budget",
    description: "Klik ikon Budget untuk mengatur target dan memantau realisasi pengeluaran.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-transaction",
    route: "/transaction",
    selectorDesktop: '[data-tour="menu-transaction"]',
    selectorMobile: '[data-tour="menu-transaction"]',
    title: "9. Transaksi",
    description: "Klik ikon Transaction untuk mencatat pemasukan, pengeluaran, tabungan, atau transfer.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-calculator",
    route: "/calculator",
    selectorDesktop: '[data-tour="menu-calculator"]',
    selectorMobile: '[data-tour="menu-calculator"]',
    title: "10. Kalkulator",
    description: "Klik ikon Financial Calculator untuk membuka kalkulator kebutuhan finansial.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-report",
    route: "/finance",
    selectorDesktop: '[data-tour="menu-report"]',
    selectorMobile: '[data-tour="menu-report"]',
    title: "11. Report",
    description: "Klik ikon Report untuk melihat hasil dari data keuanganmu.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-goals",
    route: "/goals",
    selectorDesktop: '[data-tour="menu-goals"]',
    selectorMobile: '[data-tour="menu-goals"]',
    title: "12. Goals",
    description: "Klik ikon Goals untuk melihat dan memantau target keuanganmu.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-protection",
    route: "/protection",
    selectorDesktop: '[data-tour="menu-protection"]',
    selectorMobile: '[data-tour="menu-protection"]',
    title: "13. Protection",
    description: "Klik ikon Protection untuk melihat kebutuhan perlindungan finansialmu.",
    advanceOnTargetClick: true
  },
  {
    id: "usage-ai-assistant",
    route: "/ai-assistant",
    selectorDesktop: '[data-tour="menu-ai-assistant"]',
    selectorMobile: '[data-tour="menu-ai-assistant"]',
    title: "14. AI Assistant",
    description: "Klik ikon AI Assistant untuk membuka asisten keuangan berbasis data Wealthplanner.",
    advanceOnTargetClick: true
  },
];

export function getTourSteps(type: "main" | "page" | "usage", route: string): TourStep[] {
  if (type === "main") return mainTourSteps;
  if (type === "usage") return usageTourSteps;
  return pageTourSteps[route] || [];
}
