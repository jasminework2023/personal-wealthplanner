export type TourStep = {
  id: string;
  route: string;
  selectorDesktop: string;
  selectorMobile: string;
  title: string;
  description: string;
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
    route: "/settings",
    selectorDesktop: '[data-tour="profile-card"]',
    selectorMobile: '[data-tour="profile-card"]',
    title: "1. Lengkapi Profil",
    description: "Masuk ke Profil, lalu scroll ke bagian Profil. Isi Nama dan Bahasa, kemudian simpan. Data ini digunakan untuk personalisasi aplikasi.",
  },
  {
    id: "usage-setup",
    route: "/settings",
    selectorDesktop: '[data-tour="setup-card"]',
    selectorMobile: '[data-tour="setup-card"]',
    title: "2. Setup Mesin Keuangan",
    description: "Atur Pemasukan, Pengeluaran, Tabungan & Investasi, dan Akun Bank terlebih dahulu. Tambahkan kategori dengan + Add Category, centang kategori yang dipakai, lalu nonaktifkan atau hapus yang tidak diperlukan. Setup ini menjadi fondasi untuk Transaction dan Budget.",
  },
  {
    id: "usage-ai-membership",
    route: "/settings",
    selectorDesktop: '[data-tour="ai-membership"]',
    selectorMobile: '[data-tour="ai-membership"]',
    title: "3. AI Membership",
    description: "Setelah payment, kamu mendapatkan akses gratis ke fitur AI dengan penggunaan terbatas. Untuk penggunaan lebih lanjut, kamu dapat berlangganan AI PRO+.",
  },
  {
    id: "usage-wallet",
    route: "/wallets",
    selectorDesktop: '[data-tour="wallet-add"]',
    selectorMobile: '[data-tour="wallet-add"]',
    title: "4. Wallet",
    description: "Tambahkan Wallet untuk mencatat saldo yang benar-benar kamu miliki. Atur nama, tipe, dan saldo awal. Gunakan Transfer untuk memindahkan saldo antar-wallet agar tidak terbaca sebagai pemasukan baru.",
  },
  {
    id: "usage-asset",
    route: "/assets",
    selectorDesktop: '[data-tour="report-assets"]',
    selectorMobile: '[data-tour="report-assets"]',
    title: "5. Asset",
    description: "Masukkan kondisi aset saat ini: Liquid Asset seperti cash dan rekening, Fixed Asset seperti kendaraan atau properti, serta Variable Asset/Investasi seperti saham. Jangan menggandakan saldo Wallet sebagai Liquid Asset.",
  },
  {
    id: "usage-budget",
    route: "/budgeting",
    selectorDesktop: '[data-tour="budget-summary"]',
    selectorMobile: '[data-tour="budget-summary"]',
    title: "6. Budget",
    description: "Atur Budget berdasarkan periode bulanan atau tahunan. Tentukan target untuk setiap pos. Kategori Budget mengikuti Setup Mesin Keuangan yang sudah kamu buat sebelumnya.",
  },
  {
    id: "usage-transaction",
    route: "/transaction",
    selectorDesktop: '[data-tour="transaction-add"]',
    selectorMobile: '[data-tour="transaction-add"]',
    title: "7. Transaksi",
    description: "Catat transaksi secara Manual atau dengan AI. Pastikan tanggal, nominal, kategori, dan Wallet sudah benar sebelum disimpan. Setiap penggunaan AI menggunakan 1 kredit.",
  },
  {
    id: "usage-calculator",
    route: "/calculator",
    selectorDesktop: '[data-tour="calculator-list"]',
    selectorMobile: '[data-tour="calculator-list"]',
    title: "8. Kalkulator",
    description: "Gunakan Kalkulator untuk menghitung berbagai kebutuhan finansial berdasarkan angka dan asumsi financial planning, seperti pendidikan, pensiun, Haji, KPR, dan lainnya.",
  },
  {
    id: "usage-report",
    route: "/finance",
    selectorDesktop: '[data-tour="report-summary"]',
    selectorMobile: '[data-tour="report-summary"]',
    title: "9. Report",
    description: "Pantau kondisi keuangan melalui laporan yang tersedia. Report adalah tempat melihat hasil dari data yang sudah kamu input, bukan tempat utama untuk melakukan pencatatan.",
  },
  {
    id: "usage-goals",
    route: "/goals",
    selectorDesktop: '[data-tour="goals-page"]',
    selectorMobile: '[data-tour="goals-page"]',
    title: "10. Goals",
    description: "Goals membantu kamu membandingkan rencana finansial dari Kalkulator dengan kondisi keuangan saat ini. Kamu dapat mengalokasikan dana yang sudah dimiliki, seperti tabungan, untuk membantu mencapai target dan memantau progress.",
  },
  {
    id: "usage-protection",
    route: "/protection",
    selectorDesktop: '[data-tour="protection-hero"]',
    selectorMobile: '[data-tour="protection-hero"]',
    title: "11. Protection",
    description: "Isi kebutuhan proteksi untuk melihat kebutuhan perlindungan finansialmu. Gunakan hasilnya sebagai dasar diskusi dan konsultasikan kebutuhan proteksi bersama konsultan asuransi manusia.",
  },
  {
    id: "usage-ai-assistant",
    route: "/ai-assistant",
    selectorDesktop: '[data-tour="ai-assistant-page"]',
    selectorMobile: '[data-tour="ai-assistant-page"]',
    title: "12. AI Assistant",
    description: "AI Assistant adalah financial planner berbasis AI yang membantu kamu memahami dan mendiskusikan kondisi keuangan, perencanaan, dan keputusan finansial.",
  },
];

export function getTourSteps(type: "main" | "page" | "usage", route: string): TourStep[] {
  if (type === "main") return mainTourSteps;
  if (type === "usage") return usageTourSteps;
  return pageTourSteps[route] || [];
}
