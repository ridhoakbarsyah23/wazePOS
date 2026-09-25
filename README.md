# Website Promosi wazePOS

Landing page marketing dan lead generation untuk wazePOS, dibuat berdasarkan `PRD_Website_Promosi_wazePOS.docx`. Aplikasi menggunakan Next.js App Router, React, TypeScript, Tailwind CSS, dan CSS responsif untuk komponen lama yang dimigrasikan secara bertahap.

## Fitur

- Landing page conversion-oriented dengan Hero, Problem, Benefits, Feature, Business Type, How It Works, Product Showcase, Pricing, FAQ, Lead Form, dan Final CTA.
- Navigasi sticky serta hamburger menu pada perangkat mobile.
- CTA trial dan WhatsApp dengan pesan berbeda untuk konteks trial, harga, dan konsultasi umum.
- Tab fitur, tab pratinjau produk, dan FAQ accordion.
- Tiga paket harga: Mulai, Tumbuh, dan Bisnis dengan pilihan pembayaran bulanan atau tahunan.
- Sticky mobile CTA dan floating WhatsApp.
- Lead form dengan validasi client/server, honeypot anti-bot, dan endpoint `POST /api/leads`.
- Hook event analytics melalui `window.dataLayer` dan custom event `wazepos:analytics`.
- Metadata SEO, Open Graph image, favicon, `robots.txt`, dan `sitemap.xml`.
- Dukungan `prefers-reduced-motion` dan navigasi keyboard dasar.

## Menjalankan aplikasi

Persyaratan: Node.js 20.9 atau lebih baru dan npm.

```bash
npm install
copy .env.example .env.local
docker compose up -d postgres
npm run db:migrate
npm run dev
```

Buka `http://localhost:3000`.

## Deploy ke Vercel untuk testing

Gunakan PostgreSQL cloud, misalnya Supabase. Di Supabase buka **Connect**, pilih
connection string **Transaction pooler** (port `6543`) atau **Session pooler**
(port `5432`), lalu salin URL PostgreSQL-nya. Pastikan URL tersebut menyertakan
`sslmode=require`.

File `.env` dan `.env.local` hanya digunakan di komputer lokal dan sengaja tidak
masuk Git. Salin nilai yang diperlukan melalui **Vercel > Project Settings >
Environment Variables**. Tambahkan konfigurasi berikut pada environment
**Production** menggunakan domain produksi final tanpa garis miring di akhir:

```env
DATABASE_URL=postgresql://postgres....?sslmode=require
BETTER_AUTH_SECRET=secret-acak-minimal-32-karakter
BETTER_AUTH_URL=https://waze-pos.vercel.app
NEXT_PUBLIC_SITE_URL=https://waze-pos.vercel.app
GOOGLE_CLIENT_ID=client-id-dari-google
GOOGLE_CLIENT_SECRET=client-secret-dari-google
```

Di Google Cloud Console, OAuth Client harus bertipe **Web application** dengan
konfigurasi berikut:

```text
Authorized JavaScript origin: https://waze-pos.vercel.app
Authorized redirect URI:      https://waze-pos.vercel.app/api/auth/callback/google
```

Ganti `waze-pos.vercel.app` jika domain produksi aktual berbeda. Google
mewajibkan redirect URI yang sama persis. Untuk Preview Deployment, gunakan URL
preview/branch yang stabil, daftarkan callback-nya secara terpisah di Google,
dan pasang environment variables khusus **Preview**. Google tidak menerima
wildcard redirect URI. Setelah mengubah `NEXT_PUBLIC_SITE_URL` atau environment
variable lain, lakukan deployment baru agar nilainya ikut masuk ke build.

Migration database tidak dijalankan dari `vercel-build`, karena proses build
Vercel dapat berjalan paralel dan connection pooler mode transaksi tidak cocok
untuk migration yang membutuhkan koneksi stabil. Jalankan migration satu kali
secara manual menggunakan connection string **Session pooler** atau **Direct
connection** dari Supabase:

```powershell
$env:DATABASE_URL="postgresql://...:5432/postgres?sslmode=require"
npm run db:migrate:production
```

Setelah migration berhasil, lakukan **Redeploy** tanpa build cache, lalu tes
`/register` dan `/login`. Untuk runtime Vercel, `DATABASE_URL` boleh memakai
Transaction pooler port `6543` setelah schema selesai dibuat.

Untuk memeriksa deployment tanpa membuka secret, akses:

```text
https://waze-pos.vercel.app/api/health
```

Response yang sehat memiliki `"ok": true`, `"connected": true`, dan
`"authTables": true`.

Sebelum menjalankan migration, nyalakan PostgreSQL lokal dan isi secret autentikasi:

```bash
docker compose up -d postgres
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Salin hasil perintah kedua ke `BETTER_AUTH_SECRET` di `.env.local`. Database Docker bawaan tersedia di port `5434` agar tidak mudah berbenturan dengan instalasi PostgreSQL lain.

## Struktur dan arsitektur

Struktur folder dipisahkan berdasarkan domain agar lebih mudah dipelihara. Rute Next.js tetap berada di `app/`, komponen di `components/<domain>/`, logic domain di `lib/<domain>/`, dan test di `__tests__/<domain>/`. Panduan lengkap tersedia di [`docs/architecture.md`](docs/architecture.md).

## Autentikasi dan onboarding

- Better Auth menangani register, login, logout, password hashing, session cookie, dan rate limiting dasar.
- Pengguna memilih Paket Tumbuh atau Bisnis pada halaman harga atau formulir registrasi. Pilihan tervalidasi diteruskan ke `/onboarding`.
- Setelah register berhasil, session dibuat otomatis dan pengguna diarahkan ke `/onboarding` dengan paket pilihannya.
- Onboarding membuat bisnis, membership dengan role `owner`, gerai pertama, dan subscription trial 14 hari untuk paket yang dipilih dalam satu transaksi database.
- Pengguna yang belum menyelesaikan onboarding diarahkan dari `/dashboard` ke `/onboarding`.
- `proxy.ts` melakukan pemeriksaan cookie awal, sedangkan session dan membership tetap diverifikasi kembali di server sebelum data dashboard dibaca.

## Fondasi operasional POS

- Dashboard pemilik menyediakan kategori, gerai, produk, harga jual, harga modal, SKU, dan stok awal.
- Halaman `/products` digunakan untuk memperbarui produk tanpa menghapus histori transaksi.
- Halaman `/inventory` menyimpan stok per gerai dan riwayat perubahan dalam bentuk selisih stok.
- Paket Tumbuh mendukung transaksi tunai, sedangkan Paket Bisnis menambahkan pembayaran kartu debit dan kredit EDC.
- Setiap transaksi baru menyimpan snapshot nama, harga jual, dan harga modal produk serta mengurangi stok secara atomik.
- Void transaksi mewajibkan alasan serta menyimpan waktu dan pengguna yang membatalkan untuk kebutuhan audit.
- Pembayaran QRIS POS dinonaktifkan sampai integrasi penyedia pembayaran resmi, verifikasi status, dan webhook tersedia. QRIS tidak boleh dikonfirmasi lunas secara manual.
- Halaman `/reports` menampilkan ringkasan penjualan harian, produk terlaris, dan distribusi metode pembayaran.
- Pengelolaan produk, stok, dan laporan dibatasi untuk role `owner` atau `admin`; role `cashier` diarahkan ke kasir.
- Entitlement paket didefinisikan terpusat di `lib/billing/plans.ts` dan diverifikasi kembali oleh API untuk fitur khusus Paket Bisnis.
- Pemilik usaha dapat membandingkan dan mengganti paket selama trial melalui `/subscription`; perubahan subscription aktif tetap dikunci sampai alur pembayaran tersedia.

Perintah database:

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Konfigurasi environment

Isi `.env.local` dengan data resmi sebelum production:

```env
NEXT_PUBLIC_TRIAL_URL=https://contoh-domain-resmi/daftar
NEXT_PUBLIC_WHATSAPP_NUMBER=6281234567890
NEXT_PUBLIC_SITE_URL=https://contoh-domain-resmi
MIDTRANS_SERVER_KEY=server-key-dari-midtrans
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_NOTIFICATION_URL=https://contoh-domain-resmi/api/payments/midtrans/webhook
PLATFORM_ADMIN_EMAILS=owner@contoh-domain-resmi.com
PLATFORM_ADMIN_NAME=Platform Admin
PLATFORM_ADMIN_SEED_PASSWORD=
LEAD_WEBHOOK_URL=https://endpoint-backend-atau-crm/leads
LEAD_WEBHOOK_SECRET=secret-opsional
```

- `NEXT_PUBLIC_TRIAL_URL`: URL registrasi/trial resmi. Jika kosong, CTA diarahkan ke form lead.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: nomor resmi dalam format internasional tanpa tanda `+`. Jika kosong, CTA diarahkan ke form lead.
- `NEXT_PUBLIC_SITE_URL`: origin website untuk metadata dan sitemap.
- `DATABASE_URL`: koneksi PostgreSQL untuk autentikasi dan data bisnis.
- `BETTER_AUTH_SECRET`: secret acak minimal 32 karakter untuk keamanan session; wajib di setiap environment.
- `BETTER_AUTH_URL`: origin aplikasi yang digunakan Better Auth.
- `MIDTRANS_SERVER_KEY`: Server Key Midtrans yang hanya boleh tersedia di server.
- `MIDTRANS_IS_PRODUCTION`: gunakan `false` untuk sandbox dan ubah ke `true` hanya setelah pengujian serta konfigurasi production selesai.
- `MIDTRANS_NOTIFICATION_URL`: URL publik `POST /api/payments/midtrans/webhook` untuk notifikasi pembayaran.
- `PLATFORM_ADMIN_EMAILS`: allowlist email akun internal yang sudah terverifikasi dan boleh membuka `/admin`; pisahkan beberapa email dengan koma dan jangan menggunakan awalan `NEXT_PUBLIC_`. Akun dibuat melalui signup publik belum otomatis mendapat akses.
- `PLATFORM_ADMIN_NAME`: nama akun yang dibuat oleh seeder Platform Admin lokal.
- `PLATFORM_ADMIN_SEED_PASSWORD`: password sementara untuk seeder; simpan hanya di environment lokal/secret store dan hapus setelah akun selesai dibuat.
- `LEAD_WEBHOOK_URL`: endpoint backend/CRM yang menerima JSON lead. Wajib untuk form di production.
- `LEAD_WEBHOOK_SECRET`: Bearer token opsional untuk webhook.

Nilai `NEXT_PUBLIC_*` dimasukkan ke bundle ketika proses build. Jalankan ulang `npm run build` setelah nilainya berubah.

### Seeder Platform Admin

Pastikan PostgreSQL lokal aktif dan isi `PLATFORM_ADMIN_EMAILS` di `.env.local`, lalu jalankan:

```powershell
docker compose up -d
npm.cmd run admin:seed
```

Seeder memakai email pertama dari `PLATFORM_ADMIN_EMAILS`. Seeder membuat akun credential bila email belum terdaftar, atau menambahkan login password ke akun Google yang belum memiliki credential. Akun yang dibuat seeder ditandai `email_verified=true`; signup publik tidak otomatis mendapat status tersebut. Jika `PLATFORM_ADMIN_SEED_PASSWORD` dikosongkan, password kuat akan dibuat dan ditampilkan sekali di terminal.

Seeder tidak mengganti password akun yang sudah ada. Untuk akun lama yang passwordnya tidak diketahui, jalankan:

```powershell
npm.cmd run admin:reset
```

Seeder menolak database remote secara default. Setelah berhasil, hapus `PLATFORM_ADMIN_SEED_PASSWORD` dari environment jika sebelumnya diisi, lalu jalankan aplikasi. Login menggunakan email dan password seeder (atau Google dengan email yang sama) akan otomatis diarahkan ke `/admin`.

## Platform Admin

Halaman `/admin` adalah dashboard internal read-only untuk memantau data pelanggan dan subscription. Fitur saat ini mencakup:

- Filter status subscription, jenis usaha, paket, onboarding, dan rentang tanggal pendaftaran.
- Sorting berdasarkan tanggal, nama, akhir trial/periode, atau aktivitas transaksi terakhir.
- Pagination 10 usaha per halaman.
- Detail usaha berbasis tab: subscription, pembayaran, tim, outlet, aktivitas transaksi, dan audit admin.
- Ringkasan subscription, estimasi MRR aktif, trial yang akan berakhir, dan trial conversion.
- Export CSV untuk seluruh hasil filter, bukan hanya halaman yang sedang terlihat.
- Audit log untuk akses detail usaha dan export daftar usaha.

Jalankan `npm run db:migrate` setelah pulling perubahan yang menambah tabel audit Platform Admin. `/admin` dilindungi dua lapis: `proxy.ts` melakukan redirect cepat ke `/login` bila cookie session tidak ada, lalu `app/admin/layout.tsx` memvalidasi session Better Auth, email terverifikasi, dan allowlist `PLATFORM_ADMIN_EMAILS` di server sebelum halaman dirender. Halaman dan endpoint admin juga memakai `Cache-Control: private, no-store`; endpoint detail/export memverifikasi allowlist di server. Pastikan `PLATFORM_ADMIN_EMAILS` berisi hanya email akun internal yang sudah diprovisioning dan terverifikasi.

## Pembayaran subscription

- Checkout paket dibuat oleh server melalui Midtrans Snap menggunakan harga di `lib/billing/plans.ts`; nominal dari browser tidak digunakan.
- Midtrans mengarahkan pelanggan ke halaman pembayaran yang di-host Midtrans.
- Paket baru aktif hanya setelah webhook memiliki signature SHA-512, nominal, mata uang, status transaksi, dan fraud status yang valid.
- `provider_order_id` unik dan pembaruan pembayaran bersifat idempotent untuk mencegah aktivasi ganda.
- Gunakan kredensial sandbox sampai alur checkout, webhook, redirect, dan status subscription selesai diuji.

## Penyimpanan lead

Di development, jika `LEAD_WEBHOOK_URL` kosong, lead disimpan ke `data/leads.ndjson` agar alur bisa diuji lokal. File tersebut diabaikan Git. Di production, API mengembalikan status `503` bila webhook belum dikonfigurasi; ini mencegah website memberi konfirmasi palsu ketika data sebenarnya tidak tersimpan.

Payload webhook:

```json
{
  "id": "uuid",
  "name": "Nama pengguna",
  "whatsapp": "081234567890",
  "businessName": "Nama bisnis",
  "businessType": "Toko & Warung",
  "outlets": "1",
  "message": "Pesan opsional",
  "createdAt": "2026-09-14T00:00:00.000Z"
}
```

## Event analytics

Event yang tersedia:

- `click_try_free`
- `click_whatsapp`
- `click_pricing`
- `click_demo`
- `click_feature`
- `submit_lead_form`

Event dimasukkan ke `window.dataLayer` jika analytics manager digunakan. Integrasi Google Tag Manager atau penyedia analytics lain tetap perlu dikonfigurasi saat deployment.

## Validasi

```bash
npm run lint
npm run typecheck
npm run build
```

## Data yang masih diperlukan sebelum production

- Nomor WhatsApp resmi.
- URL registrasi/trial resmi.
- Konfirmasi final harga peluncuran, ketentuan pajak, batas pemakaian, dan fitur setiap paket.
- Screenshot produk final untuk menggantikan pratinjau konsep.
- Testimoni pelanggan asli beserta izin publikasi.
- URL webhook backend/CRM untuk penyimpanan lead yang persisten.
- Kebijakan privasi dan detail klaim keamanan produk yang telah disetujui.
