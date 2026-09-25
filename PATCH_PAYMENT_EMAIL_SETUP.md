# Wealthplanner — Payment → Email → Dashboard → Make a Copy → Connect Sheet

Patch ini **tidak menghapus Google Sheet** dan **tidak mengubah sistem Telegram / transaksi / budgeting / asset**.

## Flow setelah patch

1. Customer membayar Rp149.000 / Rp139.000.
2. Xendit atau Lynk menerima webhook pembayaran.
3. Sistem mencari customer menggunakan `dashboard_token` yang sudah ada (atau recovery membuat token hanya jika customer record memang belum ada).
4. Akun diaktifkan (`is_active = 1`).
5. Resend mengirim email personal.
6. Tombol **Buka Dashboard Saya** membuka `/dashboard/welcome?token=...`.
7. Customer di halaman Setup:
   - klik **Buat Wealth Tracker Saya** → Google Sheets `/copy`;
   - membuat salinan di Google Drive miliknya;
   - share salinan tersebut ke email service account sebagai **Editor**;
   - paste URL Sheet;
   - klik **Hubungkan**.
8. `spreadsheet_id` disimpan ke row customer di Supabase.
9. Customer bisa masuk ke dashboard utama. Dashboard tetap memakai Sheet customer tersebut sebagai sumber data.

## Yang sengaja TIDAK dilakukan

- Tidak ada server-side `Google Drive files.copy` saat payment.
- Tidak ada pembuatan Sheet otomatis oleh service account.
- Tidak menghapus `spreadsheet_id`.
- Tidak mengubah endpoint transaksi, budgeting, asset, atau Telegram.
- Tidak membuat token baru untuk customer yang sudah punya token.

## File patch

- `server/api/xendit-webhook.ts`
- `server/api/lynk-webhook.ts`
- `server/lib/email.ts`
- `server/api/access.ts`
- `server/api/connect-sheet.ts`
- `src/pages/DashboardWelcome.tsx`

## Environment variable

Pastikan Vercel masih memiliki:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (opsional jika memakai default)
- `XENDIT_WEBHOOK_TOKEN`
- `LYNK_MERCHANT_KEY`
- `GOOGLE_CREDENTIALS`
- `GOOGLE_TEMPLATE_URL`

`GOOGLE_TEMPLATE_URL` boleh berupa URL Google Sheet biasa; endpoint akan mengubahnya menjadi `/copy`.

## Penting sebelum test

Template Google Sheet harus bisa dicopy oleh customer dan setelah dicopy customer harus share **copy miliknya** ke email `client_email` yang terdapat di `GOOGLE_CREDENTIALS`.

Jangan menghapus service account atau mengganti permission Google Sheets API yang sekarang dipakai endpoint dashboard.

## Test yang disarankan

1. Test payment sandbox / nominal test sesuai setup provider.
2. Pastikan webhook mendapatkan response `200`.
3. Pastikan email berisi tombol dashboard.
4. Buka link email → harus masuk ke halaman `/dashboard/welcome`.
5. Klik Make a Copy.
6. Share copy ke service account sebagai Editor.
7. Paste URL → Hubungkan.
8. Pastikan `users.spreadsheet_id` terisi.
9. Masuk Dashboard → transaksi/dashboard real data muncul.
10. Test satu pencatatan transaksi dari Telegram dan pastikan tetap muncul di dashboard.

## Catatan

Build project sebelumnya belum berhasil dijalankan di environment kerja karena dependency `vite` belum terpasang. Jadi patch ini tidak boleh dianggap sebagai build-verified sampai dependency project di-install dan `npm run build` dijalankan di environment project.
