export type TourStep = {
  id: string;
  route: string;
  selectorDesktop: string;
  selectorMobile: string;
  title: string;
  description: string;
};

export const mainTourSteps: TourStep[] = [
  { id: "home-assets", route: "/", selectorDesktop: '[data-tour="home-assets"]', selectorMobile: '[data-tour="home-assets"]', title: "Asset Tracker", description: "Total seluruh asetmu dan progres menuju target." },
  { id: "home-eye", route: "/", selectorDesktop: '[data-tour="home-eye"]', selectorMobile: '[data-tour="home-eye"]', title: "Sembunyikan nominal", description: "Sembunyikan semua nominal kalau ada orang di dekatmu." },
  { id: "home-budget", route: "/", selectorDesktop: '[data-tour="home-budget"]', selectorMobile: '[data-tour="home-budget"]', title: "Budget Tracker", description: "Sisa anggaran bulan ini, plus penghasilan dan pengeluaran." },
  { id: "main-menu", route: "/", selectorDesktop: '[data-tour="main-menu"]', selectorMobile: '[data-tour="main-menu"]', title: "Menu Utama", description: "Pintasan ke semua fitur." },
  { id: "home-fab", route: "/", selectorDesktop: '[data-tour="home-fab"]', selectorMobile: '[data-tour="home-fab"]', title: "Tambah transaksi", description: "Catat pemasukan, pengeluaran, atau tabungan di sini. Makin rutin dicatat, makin akurat laporannya." },
  { id: "main-navigation", route: "/", selectorDesktop: '[data-tour="desktop-sidebar"]', selectorMobile: '[data-tour="mobile-bottom-nav"]', title: "Navigasi", description: "Pindah antar Beranda, Transaksi, Target, dan Profil." },
  { id: "report-menu", route: "/finance", selectorDesktop: '[data-tour="menu-report"]', selectorMobile: '[data-tour="report-summary"]', title: "Laporan", description: "Income statement, cashflow, dan Asset Tracker (termasuk Stock Portfolio)." },
  { id: "budget-menu", route: "/budgeting", selectorDesktop: '[data-tour="menu-budget"]', selectorMobile: '[data-tour="budget-summary"]', title: "Anggaran", description: "Atur batas per kategori dan pantau statusnya." },
  { id: "calculator-menu", route: "/calculator", selectorDesktop: '[data-tour="menu-calculator"]', selectorMobile: '[data-tour="calculator-header"]', title: "Kalkulator", description: "Hitung dana haji, pendidikan, pensiun, dan lainnya." },
  { id: "protection-menu", route: "/protection", selectorDesktop: '[data-tour="menu-protection"]', selectorMobile: '[data-tour="protection-hero"]', title: "Proteksi", description: "Cek kecukupan perlindungan keluarga dan rekomendasi produk." },
];

export const pageTourSteps: Record<string, TourStep[]> = {
  "/finance": [
    { id: "report-summary", route: "/finance", selectorDesktop: '[data-tour="report-summary"]', selectorMobile: '[data-tour="report-summary"]', title: "Ringkasan Laporan", description: "Lihat gambaran pemasukan, pengeluaran, dan posisi keuanganmu." },
    { id: "report-assets", route: "/finance", selectorDesktop: '[data-tour="report-assets"]', selectorMobile: '[data-tour="report-assets"]', title: "Asset Tracker", description: "Pantau liquid asset, investment asset, dan aset lainnya." },
    { id: "report-stock", route: "/finance", selectorDesktop: '[data-tour="report-stock"]', selectorMobile: '[data-tour="report-stock"]', title: "Stock Portfolio", description: "Pantau saham Indonesia dan US beserta nilai pasar dan unrealized P/L." },
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

export function getTourSteps(type: "main" | "page", route: string): TourStep[] {
  return type === "main" ? mainTourSteps : (pageTourSteps[route] || []);
}
