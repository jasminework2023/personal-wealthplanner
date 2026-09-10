# Personal Wealthplanner — Dashboard

Website dashboard keuangan personal, dibangun dari brief "Personal Finance
Dashboard" — mempertahankan logika & data dari sistem Google Sheets/bot
Telegram, dengan UI baru yang modern.

## Isi

- **Home** — overview cepat: 4 stat card, cash flow chart, spending by
  category (donut), financial goal, transaksi terbaru
- **Dashboard Finance** *(halaman paling lengkap)* — ringkasan bulanan,
  income overview, savings overview, expense overview (dengan peringatan
  over-budget), asset tracker, dan stock portfolio
- **Transaction Report** — tabel transaksi dengan search & filter
- **Monthly Budgeting** — budget per kategori dengan status Healthy/Near
  Limit/Over Budget
- **Kalkulator Finansial** & **Proteksi Finansial** — link keluar ke
  wealthplanner.id (bukan halaman duplikat)
- **Tambah Transaksi** (manual) dan **Catat dengan AI** (mock parser —
  siap disambungkan ke bot Telegram beneran nanti)

Semua data ada di `src/data/` (bukan hardcode di komponen), jadi gampang
diganti API/database asli nanti.

## Cara jalanin di komputer sendiri

```
npm install
npm run dev
```

Buka `http://localhost:5173` di browser.

## Cara deploy ke Vercel

1. Bikin repo GitHub baru, upload semua isi folder ini (kecuali
   `node_modules` dan `dist`, sudah di-exclude lewat `.gitignore`)
2. Di Vercel, klik "Add New Project", pilih repo itu
3. Vercel otomatis kenal ini project Vite — nggak perlu setting apa-apa,
   langsung klik Deploy

## Cara sambungin ke data asli (Supabase + Google Sheets bot)

Dashboard ini otomatis pakai **data contoh** kalau belum ada token, dan
otomatis pindah ke **data asli** begitu ketemu token dari bot Telegram.

1. Tambah 3 environment variable di Vercel (Project Settings →
   Environment Variables) — lihat `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GOOGLE_CREDENTIALS` (JSON service account, sama persis dengan yang
     dipakai bot di Railway)

2. Setelah deploy, update link yang dikirim command `/dashboard` di
   `bot.py` supaya mengarah ke domain project ini, misal:
   ```
   https://nama-project-kamu.vercel.app/?token={token}
   ```

3. User buka link itu dari Telegram → dashboard otomatis fetch data
   asli lewat `api/dashboard.ts`, dan token tersimpan di browser
   (localStorage) biar nggak perlu klik link lagi tiap buka dashboard.

4. Ada juga jalur manual: buka dashboard tanpa token, nanti muncul
   banner kuning dengan kotak buat tempel token manual — berguna kalau
   mau ngetes tanpa Telegram.

### Yang sudah konek ke data asli

- Home: total income/expense/saving, cash flow, recent transactions
- Dashboard Finance: Income/Expense/Saving Overview per kategori
- Transaction Report: seluruh tabel & filter

### Yang masih data contoh (belum ada sumbernya di bot)

- Budget allocation per kategori (bot belum pernah nyatet budget,
  cuma realisasi) — makanya progress bar budget disembunyikan kalau
  lagi pakai data asli, cuma tampil angka realisasi polos
- Asset Tracker & Stock Net Worth — bot nggak pernah nyatet data aset/
  saham sama sekali, ini masih 100% mock sampai ada keputusan gimana
  cara nyatetnya (command baru di bot? input manual di website?)



## Belum ada di build ini

Screenshot referensi yang disebut di brief belum ke-attach saat dibangun,
jadi struktur kategori & angka diambil murni dari teks brief. Kalau ada
kategori/kolom yang ternyata beda di screenshot asli, kabari aja buat
disesuaikan.

## Google Sheets write integration

The dashboard now treats the Google Spreadsheet as the source of truth.

### Required Vercel environment variables
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_CREDENTIALS` (service-account JSON)

The Google service account must have **Editor** access to each user's spreadsheet. The API uses the Sheets read/write scope when saving transactions or budgets.

### Supported write flows
- Add transaction → appends to `Transaction!B:G`.
- Edit budget → updates the matching category/month cell in `Budgeting`.
- Dashboard → reads computed values from `Dashboard!B2:L39`, so the website follows the spreadsheet formulas.
- Categories → read from active categories in `SET UP`.

Do not write into the `Dashboard` formula cells directly; update the underlying input sheets instead.
