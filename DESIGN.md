# DESIGN.md — Redesign wealthplanner.id (Dark + Light, hijau)

Referensi visual: https://claude.ai/artifact/6bps7TW4mnpXx9ModvCgxm (baris atas = Dark, baris bawah = Light).
Tujuan: tampilan elegan seperti Stockbit/Gotrade. Satu warna brand (hijau), bukan pink. Kartu utama tiap layar punya gradien hijau sendiri.

## Aturan utama
1. Hijau = identitas. **Tidak ada pink/rose/lilac di UI** (rose hanya untuk "turun/pengeluaran" dalam merah, lihat Semantik).
2. Hijau dan merah hanya berarti naik/turun. Jangan dipakai dekoratif di luar kartu hero.
3. Kuning (#FFC815) dan merah hanya untuk status kecil: Near Limit, Over Budget, dan seri tabungan di grafik.
4. Teks di atas hero terang (neon, mint) = gelap. Teks di atas hero gelap (emerald, forest) = putih. Jangan tertukar (kontras).
5. Angka pakai `tabular-nums` (kelas `.num` sudah ada).

## Token warna
| Token | Dark | Light |
|---|---|---|
| bg (halaman) | #0A0A0C | #F4F5F6 |
| surface (kartu) | #131316 | #FFFFFF |
| border | #25252C | #E4E6E8 |
| text | #F2F2F4 | #0F1A14 |
| muted | #9A9AA5 | #6B7280 |
| accent (fill: tombol, chip aktif, FAB) | #00E08A | #00B86E |
| accent-ink (teks di atas accent) | #04130C | #04130C |
| accent-text (teks hijau di atas surface) | #5CF0B0 | #007A4A |
| up / income | #00E08A | #007A4A |
| down / expense | #FF5C7A | #D6334F |
| warn (Near Limit, tabungan) | #FFC815 | #F2A900 |

Grafik: income `#00C27A`, expense `#FF5C7A`, saving `#F2A900`. Donut komposisi aset: `#0F9D6B`, `#FFC815`, `#6EE7B7`, `#9CA3AF`, `#4B5563`.

## Kartu hero (kartu utama tiap layar)
Semua: tanpa border, radius 20, padding 16, shadow berwarna (blur 40, y 10).
| Nama | Gradien | Teks | Dipakai di |
|---|---|---|---|
| neon | `linear-gradient(150deg,#2BFFA6,#00B86E 60%,#009A5C)` | #03140C | Home (Total Aset), Asset Tracker, Goals #1, Kalkulator (hasil), Profil (header kategori) |
| emerald | `linear-gradient(150deg,#0A8A5B,#066847 55%,#033B28)` | #FFFFFF | Anggaran (target), Goals #2 |
| forest | `radial-gradient(circle at 92% 0%,rgba(0,224,138,.42),transparent 55%),linear-gradient(150deg,#0F3B2B,#0A2A20 55%,#06180F)` + ring `inset 0 0 0 1px rgba(0,224,138,.4)` | #FFFFFF | Laporan (Income/Expense), Proteksi |
| mint | `linear-gradient(150deg,#D2FCE7,#8EF0C2 60%,#5FE3A5)` | #03140C | Transaksi (ringkasan), Cashflow |

Di dalam hero: teks sekunder = teks hero dengan opacity ~.75; kotak kecil (`.in`) = overlay `rgba(teks,.14)`; progress bar = track overlay + fill warna teks hero (bukan hijau/merah). Warna angka naik/turun di dalam hero ikut warna teks hero.

## Komponen
- **Kartu biasa**: surface, border 1px, radius 20, padding 16. Dark: tanpa shadow. Light: `0 6px 24px rgba(0,0,0,.06)`.
- **Nav bawah** (mobile): melayang 16px dari tepi, bottom 20, tinggi 64, radius 22, surface + border, shadow lembut. Item: Beranda, Laporan, [FAB], Target, Profil. Aktif = warna accent-text. **FAB**: 52px, bulat, fill accent, ink gelap, glow `0 0 24px rgba(0,224,138,.7)` (Light: `0 4px 16px rgba(0,184,110,.45)`).
- **Chip / segmented tabs**: pill (radius 999). Aktif = fill accent + ink gelap. Tidak aktif = surface + border.
- **Pill status**: Healthy = hijau (tint 12%), Over Budget = merah (tint 14%), Near Limit = kuning.
- **Tombol**: primary = accent + ink gelap, radius 14, bold 13. Secondary = transparan + border.
- **Slider kalkulator**: track 6px (warna border), fill accent, knob 18px putih dengan ring accent.
- **Checkbox**: 22px, radius 7; aktif = fill accent + centang gelap.
- **Donut**: stroke 22, 5 segmen palet di atas, legend di kanan.
- **Ikon**: lucide-react (sudah dipakai), stroke 1.8.
- Tipografi: Inter. Judul halaman 26/800 tracking -0.03em. Body 14. Kecil 12. Label 11 uppercase tracking .08em.

## Peta layar → file di repo
| Layar | File | Hero |
|---|---|---|
| Home | `src/pages/Home.tsx` | neon |
| Anggaran | `src/pages/MonthlyBudgeting.tsx` | emerald |
| Laporan (Income Statement / Asset Tracker / Cashflow, 3 tab) | `src/pages/DashboardFinance.tsx` | forest / neon / mint |
| Transaksi | `src/pages/Transaction.tsx` | mint |
| Goals | `src/pages/Goals.tsx` | neon + emerald |
| Proteksi | `src/pages/FinancialProtection.tsx` | forest |
| Profil & Pengaturan | `src/pages/Settings.tsx` | neon (header kategori) |
| Kalkulator | `src/pages/FinancialCalculator.tsx` | neon (hasil) |
Belum didesain: Guidance, DashboardWelcome, daftar kalkulator, modal tambah transaksi.

## Rencana implementasi (kerjakan per tahap, commit per tahap, branch baru)
1. **Tema**: ganti variabel di `src/index.css` (`:root` = Light, `html.dark` = Dark) dan `tailwind.config.js`. Petakan `forest-*` ke ramp hijau baru, hapus/ganti `rose`, `lilac`, `butter`, dan `shadow-pop` (pink). Tambah token hero sebagai variabel/utility (`hero-neon`, `hero-emerald`, `hero-forest`, `hero-mint`).
2. **Bersihkan dark mode**: ganti tumpukan aturan `html.dark ... !important` (override `bg-white`, `[class*="text-forest-900"]`, dst.) dengan token yang benar, supaya `bg-surface`, `text-ink`, `border-line` otomatis ganti di dark/light. Lakukan bertahap; jangan hapus semuanya sekaligus.
3. **AppShell**: nav bawah dan FAB sesuai spesifikasi (hapus `bg-[#F59BB8]` dan `text-[#F59BB8]` yang ditulis langsung). Cek `Sidebar` desktop.
4. **Komponen bersama**: `Card`, `StatCard`, `ProgressBar`, `TransactionBadge`, `Topbar`.
5. **Halaman utama** satu per satu, urutan: Home, Anggaran, Laporan, Transaksi, Goals, Proteksi, Profil.
6. **Kalkulator** (paling besar): satukan `Button`, `Card`, `Tag`, `NumberInput`, `Slider`, `ResultTile` di `FinancialCalculator.tsx` ke token tema (hapus `--calc-*` dan style inline yang menggandakan), ganti `COLORS` grafik ke palet hijau, buang `// @ts-nocheck` bila memungkinkan, dan tambahkan layout responsif (kolom tunggal di mobile). Lalu cek 9 kalkulator satu per satu.

## Catatan keamanan saat bekerja dengan Claude Code
- Jangan taruh nilai asli `SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `GOOGLE_CREDENTIALS`, dan sejenisnya di folder kerja. Pakai project/test key, atau biarkan kosong untuk pekerjaan UI.
- Pastikan `.env` ada di `.gitignore` dan tidak pernah ter-commit.
- Kerja di branch baru; jangan merge/deploy ke production sebelum dicek.
- Verifikasi tiap tahap: `npm run build`, lalu cek Dark dan Light di lebar HP (~390px) dan desktop.
