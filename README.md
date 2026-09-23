# Paket perbaikan personal-wealthplanner

4 file ini SUDAH lengkap (bukan potongan) — tinggal upload/replace file yang namanya sama persis di GitHub repo kamu, tempatnya sesuai struktur folder di dalam ZIP ini.

## Apa yang diperbaiki di tiap file

1. vercel.json
   - includeFiles sekarang mencakup server/lib/** juga (sebelumnya cuma server/api/**)
   - Ini yang bikin webhook selalu 500 "Cannot find module"

2. server/api/create-payment.ts
   - Sekarang beneran bikin Xendit Invoice (sebelumnya kirim link Lynk statis)
   - Insert user sekarang isi user_id (sebelumnya kosong -> gagal karena kolom NOT NULL)
   - is_active dikirim sebagai 0 (integer), bukan false (boolean)

3. server/api/create-wealth-tracker-payment.ts
   - Insert user sekarang isi user_id
   - is_active dikirim sebagai 0 (integer)
   - Sisanya (flow Xendit Payment Session) tidak diubah, sudah benar

4. server/api/lynk-webhook.ts
   - is_active saat aktivasi sekarang dikirim sebagai 1 (integer), bukan true (boolean)

CATATAN: server/api/xendit-webhook.ts TIDAK termasuk di paket ini -- file itu di repo kamu
sekarang sudah benar (sudah pakai is_active 0/1 dan sudah ada recovery logic). Tidak perlu diganti.

## Cara pakai
Di GitHub, buka tiap file yang namanya sama, klik pensil (Edit), hapus semua isi lama,
paste isi baru dari file yang sama di ZIP ini, lalu commit ke main.
