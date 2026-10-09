# wazePOS

Aplikasi Point of Sale (POS) berbasis web untuk UMKM, lengkap dengan:

- **Website promosi** — landing page marketing dan lead generation.
- **Aplikasi POS** — dashboard pemilik, kasir, produk, stok, pelanggan, laporan, dan struk.
- **Billing subscription** — paket Tumbuh dan Bisnis dengan pembayaran transfer bank manual.
- **Dashboard Admin** — dashboard internal untuk memantau pelanggan dan subscription.

Dibangun dengan Next.js App Router, React 19, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Better Auth, dan Resend.

## 🚀 Live URL
Aplikasi ini sudah dideploy dan dapat diakses publik melalui:
**[https://waze-pos.vercel.app](https://waze-pos.vercel.app)**
![Halaman utama wazePOS](docs/images/landing-hero.webp)

*Tampilan halaman utama (landing page) wazePOS.*

![Dashboard wazePOS](docs/images/dashboard.webp)

*Dashboard pemilik wazePOS setelah masuk.*

![Kasir POS wazePOS](docs/images/pos.webp)

*Halaman kasir (POS) wazePOS untuk mencatat transaksi.*

---

## Daftar isi

- [Live URL](#-live-url)
- [Ikhtisar fitur](#ikhtisar-fitur)
- [Teknologi](#teknologi)
- [Menjalankan di komputer lokal](#menjalankan-di-komputer-lokal)
- [Script npm](#script-npm)
- [Environment variables](#environment-variables)
- [Database dan migrasi](#database-dan-migrasi)
- [Docker](#docker)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Autentikasi dan onboarding](#autentikasi-dan-onboarding)
- [Paket dan pembayaran subscription](#paket-dan-pembayaran-subscription)
- [Dashboard Admin](#platform-admin)
- [Penyimpanan lead dan event analytics](#penyimpanan-lead-dan-event-analytics)
- [Pengujian dan pengecekan kualitas](#pengujian-dan-pengecekan-kualitas)
- [Struktur proyek](#struktur-proyek)
- [Checklist sebelum production](#checklist-sebelum-production)

---

## Ikhtisar fitur

### Website promosi (halaman publik)

- Landing page conversion-oriented: Hero, Problem, Benefits, Feature, Business Type, How It Works, Product Showcase, Pricing, FAQ, Lead Form, dan Final CTA.
- Navigasi sticky dengan hamburger menu di perangkat mobile.
- CTA trial dan WhatsApp dengan pesan berbeda untuk konteks trial, harga, dan konsultasi umum.
- Tab fitur, tab pratinjau produk, dan FAQ accordion.
- Dua paket harga: **Tumbuh** dan **Bisnis** dengan penagihan tahunan.
- Sticky mobile CTA dan tombol WhatsApp melayang.
- Lead form dengan validasi client/server, honeypot anti-bot, dan endpoint `POST /api/leads`.
- Event analytics via `window.dataLayer` dan custom event `wazepos:analytics`.
- Metadata SEO, Open Graph image, favicon, `robots.txt`, dan `sitemap.xml`.
- Dukungan `prefers-reduced-motion` dan navigasi keyboard dasar.

### Aplikasi POS (setelah login)

- Dashboard pemilik dengan pengelolaan kategori, gerai, produk, harga jual, harga modal, dan SKU; stok awal tersedia pada Paket Bisnis.
- Halaman `/products` untuk memperbarui produk tanpa menghapus histori transaksi.
- Halaman `/inventory` untuk stok per gerai dan riwayat perubahan stok (khusus Paket Bisnis).
- Paket **Tumbuh**: transaksi tunai, maksimal 1 gerai. Paket **Bisnis**: hingga 5 gerai, pembayaran kartu debit/kredit EDC, stok, laporan lanjutan, dan struk kustom.
- Setiap transaksi menyimpan snapshot nama, harga jual, dan harga modal produk; produk yang dilacak di Paket Bisnis mengurangi stok secara atomik.
- Void transaksi mewajibkan alasan serta mencatat waktu dan pengguna yang membatalkan untuk audit.
- Pembayaran QRIS POS dinonaktifkan sampai integrasi penyedia pembayaran resmi, verifikasi status, dan webhook tersedia. QRIS tidak boleh dikonfirmasi lunas secara manual.
- Halaman `/reports` menampilkan ringkasan penjualan harian, produk terlaris, dan distribusi metode pembayaran.
- Pengelolaan produk, stok, dan laporan dibatasi untuk role `owner` atau `admin`; role `cashier` diarahkan ke halaman kasir.
- Batasan paket (entitlement) didefinisikan terpusat di `shared/billing/plans.ts` dan diverifikasi ulang oleh API untuk fitur khusus Paket Bisnis.
- Pemilik usaha dapat membandingkan dan mengganti paket selama trial melalui `/subscription`; perubahan subscription aktif tetap dikunci sampai alur pembayaran tersedia.

### Dashboard Admin (internal)

- Dashboard internal read-only di `/admin` untuk memantau data pelanggan dan subscription.
- Filter status subscription, jenis usaha, paket, onboarding, dan rentang tanggal pendaftaran.
- Sorting berdasarkan tanggal, nama, akhir trial/periode, atau aktivitas transaksi terakhir.
- Pagination 10 usaha per halaman dan export CSV untuk seluruh hasil filter (bukan hanya halaman yang terlihat).
- Detail usaha berbasis tab: subscription, pembayaran, tim, outlet, aktivitas transaksi, dan audit admin.
- Ringkasan subscription, estimasi MRR aktif, trial yang akan berakhir, dan trial conversion.
- Audit log untuk akses detail usaha dan export daftar usaha.

---

## Teknologi

| Teknologi | Peran |
| --- | --- |
| Next.js (App Router) | Framework fullstack: routing, Server Components, Route Handlers |
| React 19 + TypeScript | UI dan tipe yang aman |
| Tailwind CSS | Styling |
| Drizzle ORM + PostgreSQL | Database dan migrasi |
| Better Auth | Register, login, session, Google OAuth, rate limiting |
| Transfer bank manual | Pembayaran subscription |
| Resend | Email transaksional (reset password, pengingat trial) |
| Vitest + Testing Library | Pengujian |
| Docker | PostgreSQL lokal dan build production |

---

## Menjalankan di komputer lokal

### Persyaratan

- Node.js **22.12 atau lebih baru** (CI memakai Node.js 22).
- npm
- Docker (untuk PostgreSQL lokal)

### Langkah

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Siapkan file environment**

   ```bash
   cp .env.example .env.local
   ```

   (Pada Windows CMD: `copy .env.example .env.local`.)

   Nilai default sudah cukup untuk development. Lihat [Environment variables](#environment-variables) untuk penjelasan lengkap.

3. **Nyalakan PostgreSQL lewat Docker**

   ```bash
   docker compose up -d postgres
   ```

   Database bawaan berjalan di port **5434** (bukan 5432) agar tidak berbenturan dengan instalasi PostgreSQL lain.

4. **Buat secret autentikasi**

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Salin hasilnya ke `BETTER_AUTH_SECRET` di `.env.local` (minimal 32 karakter).

5. **Jalankan migrasi database**

   ```bash
   npm run db:migrate
   ```

6. **Jalankan aplikasi**

   ```bash
   npm run dev
   ```

   Buka `http://localhost:3000`.

---

## Script npm

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan server development |
| `npm run build` | Build production (juga dipakai `vercel-build`) |
| `npm start` | Menjalankan hasil build production |
| `npm run lint` | ESLint tanpa warning |
| `npm run typecheck` | Pengecekan TypeScript tanpa menghasilkan file |
| `npm test` | Menjalankan semua test (Vitest, sekali jalan) |
| `npm run test:watch` | Test dalam mode watch |
| `npm run db:generate` | Membuat file migrasi Drizzle dari schema |
| `npm run db:migrate` | Menjalankan migrasi ke database lokal |
| `npm run db:migrate:production` | Menjalankan migrasi ke database remote (dengan guard khusus) |
| `npm run db:studio` | Membuka Drizzle Studio untuk melihat data |
| `npm run admin:seed` | Membuat akun Dashboard Admin lokal (lihat [Dashboard Admin](#platform-admin)) |
| `npm run admin:reset` | Reset password akun Dashboard Admin |
| `npm run security:secrets` | Memeriksa tidak ada secret yang masuk kode |

---

## Environment variables

Semua konfigurasi ada di `.env.local` (lokal) atau environment variables deployment (Vercel). File `.env`/`.env.local` sengaja **tidak masuk Git**. Lihat `.env.example` sebagai template.

### Umum

| Variabel | Wajib? | Penjelasan |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Ya | Origin website untuk metadata, sitemap, dan Open Graph. Gunakan domain produksi HTTPS yang persis, tanpa garis miring di akhir. |
| `NEXT_PUBLIC_TRIAL_URL` | Tidak | URL registrasi/trial resmi. Jika kosong, CTA diarahkan ke form lead. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Tidak | Nomor WhatsApp resmi dalam format internasional tanpa tanda `+`, contoh: `6281234567890`. Jika kosong, CTA diarahkan ke form lead. |

### Database

| Variabel | Wajib? | Penjelasan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | Koneksi PostgreSQL untuk autentikasi dan data bisnis. Lokal: `postgresql://wazepos:wazepos@127.0.0.1:5434/wazepos` (Docker compose). Deployment: gunakan pooler dengan `sslmode=require`. |

> Penting: jangan isi URL database produksi di file `.env` lokal, agar migrasi lokal tidak pernah menyentuh database produksi.

### Autentikasi

| Variabel | Wajib? | Penjelasan |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Ya | Secret acak minimal 32 karakter untuk keamanan session. Wajib di setiap environment. |
| `BETTER_AUTH_URL` | Tidak | Origin aplikasi untuk Better Auth. Kosongkan agar mengikuti `NEXT_PUBLIC_SITE_URL`; isi eksplisit hanya bila origin auth berbeda. |

### Google OAuth (login SSO)

| Variabel | Wajib? | Penjelasan |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Untuk login Google | OAuth Client ID dari Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Untuk login Google | OAuth Client Secret — hanya server, tidak boleh masuk Git atau berawalan `NEXT_PUBLIC_`. |

### Email (reset password, pengingat trial, & verifikasi pembayaran)

| Variabel | Wajib? | Penjelasan |
| --- | --- | --- |
| `RESEND_API_KEY` | Untuk OTP verifikasi, reset password, pengingat trial, dan email approve/reject pembayaran | API key Resend. Nilai kosong membuat email verifikasi pembayaran di-skip (verifikasi tetap tersimpan). |
| `RESEND_FROM_EMAIL` | Untuk OTP verifikasi, reset password, pengingat trial, dan email approve/reject pembayaran | Alamat pengirim. Selama memakai `onboarding@resend.dev` (domain testing), Resend hanya mengantar ke alamat email pemilik akun Resend; untuk mengirim ke semua owner, verifikasi domain sendiri di resend.com/domains lalu ganti pengirim ke domain tersebut. |
| `CRON_SECRET` | Untuk pengingat trial | Secret acak untuk melindungi endpoint cron `/api/billing/trial-reminders`. Vercel mengirimkannya otomatis sebagai header `Authorization: Bearer` pada Vercel Cron. |

### Cron pengingat trial

Pengingat dikirim ke email owner saat status masih `trialing`, trial belum berakhir, dan tersisa maksimal 24 jam. Email mencantumkan waktu berakhir dalam WIB dan tautan `/subscription`. Penanda `trial_reminder_sent_at` disimpan setelah transaksi pengiriman berhasil; kegagalan menggulung balik penanda agar bisa dicoba ulang. Kunci idempotensi Resend membantu mencegah duplikasi ketika respons pengiriman terputus (berlaku 24 jam).

Endpoint: `GET /api/billing/trial-reminders`. Jadwal `vercel.json` adalah `0 17 * * *`, yaitu pukul 00:00 WIB karena Vercel Cron memakai UTC. Pada **Vercel Hobby**, cron hanya dapat berjalan sekali sehari dan dapat dieksekusi kapan saja antara 00:00-00:59 WIB. Pengingat mengikuti pemeriksaan ini, **bukan tepat 24 jam sebelum kedaluwarsa**. Pergeseran jadwal, downtime, atau kegagalan pengiriman dapat membuat pengingat terlewat; cron Vercel tidak otomatis mengulang permintaan yang gagal. Untuk pemeriksaan setiap jam, gunakan scheduler eksternal dengan header otorisasi yang sama atau Vercel Pro dengan jadwal `0 * * * *`.

Aktivasi produksi:

1. Di Vercel → Project → Settings → Environment Variables, isi untuk **Production**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL` (URL HTTPS produksi), dan `CRON_SECRET`.
2. Buat secret acak secara lokal: `node -p "require('node:crypto').randomBytes(32).toString('hex')"`. Simpan hasilnya sebagai `CRON_SECRET`; jangan masukkan ke Git atau variabel `NEXT_PUBLIC_`.
3. Dengan `DATABASE_URL` yang menunjuk ke database produksi, jalankan `npm run db:migrate:production` **sebelum** men-deploy kode yang memakai kolom baru. Migration `0024` menambah `subscription.trial_reminder_sent_at` tanpa menghapus data.
4. Deploy ke production dan periksa Vercel → Project → Cron Jobs. Cron tidak berjalan otomatis lewat `npm run dev` atau preview deployment.
5. Jalankan cron secara manual dari dashboard Vercel untuk memeriksa hasil. Ini benar-benar mengirim email ke owner yang memenuhi syarat. Respons sukses berisi `ok`, `sent`, `failed`, dan `skipped`; `sent: 0` dapat berarti belum ada trial yang jatuh tempo atau sudah dikirimi pengingat.
6. Periksa log Resend untuk status delivery dan inbox/spam penerima. `sent` berarti API Resend menerima permintaan, bukan bukti email sudah masuk inbox. Jika respons `502`, periksa Resend lalu ulangi saat trial masih aktif; `503` berarti konfigurasi belum lengkap, dan `500` berarti pemrosesan/database gagal.

Referensi: [batas cron Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing), [pengelolaan cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [idempotensi Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

### Transfer bank (pembayaran)

| Variabel | Wajib? | Penjelasan |
| --- | --- | --- |
| `BANK_TRANSFER_BANK` | Untuk checkout | Nama bank rekening tujuan, contoh: `BCA`. |
| `BANK_TRANSFER_ACCOUNT_NUMBER` | Untuk checkout | Nomor rekening tujuan. Ganti contoh dengan rekening resmi sebelum production. |
| `BANK_TRANSFER_ACCOUNT_NAME` | Untuk checkout | Nama pemilik rekening tujuan. |

### Dashboard Admin

| Variabel | Wajib? | Penjelasan |
| --- | --- | --- |
| `PLATFORM_ADMIN_EMAILS` | Ya untuk `/admin` | Allowlist email akun internal yang sudah terverifikasi dan boleh membuka `/admin`. Pisahkan beberapa email dengan koma. Jangan gunakan awalan `NEXT_PUBLIC_`. Akun dari signup publik tidak otomatis mendapat akses. |
| `PLATFORM_ADMIN_NAME` | Tidak | Nama akun yang dibuat seeder Dashboard Admin lokal. |
| `PLATFORM_ADMIN_SEED_PASSWORD` | Tidak | Password sementara untuk seeder. Simpan hanya di environment lokal/secret store dan hapus setelah akun selesai dibuat. |

### Lead webhook

| Variabel | Wajib? | Penjelasan |
| --- | --- | --- |
| `LEAD_WEBHOOK_URL` | Tidak | Endpoint backend/CRM opsional yang menerima salinan JSON lead setelah lead tersimpan di database. Harus HTTPS bila diisi. |
| `LEAD_WEBHOOK_SECRET` | Tidak | Bearer token opsional untuk webhook. |

> Catatan: nilai `NEXT_PUBLIC_*` dimasukkan ke bundle JavaScript saat build. Setelah mengubahnya, jalankan ulang `npm run build` atau lakukan deployment baru agar nilainya ikut terpakai.

---

## Database dan migrasi

Skema dikelola dengan Drizzle. Perintah utama:

```bash
npm run db:generate   # generate file migrasi dari schema
npm run db:migrate    # jalankan migrasi ke database lokal
npm run db:studio     # lihat dan edit data lewat Drizzle Studio
```

Panduan penting:

- Jalankan `npm run db:migrate` setelah menarik perubahan yang menambah tabel (termasuk tabel audit Dashboard Admin).
- Migrasi ke database remote **tidak** dijalankan otomatis dari build (`vercel-build`), karena proses build bisa berjalan paralel dan connection pooler mode transaksi tidak cocok untuk migrasi yang butuh koneksi stabil. Lihat [Deploy ke Vercel](#deploy-ke-vercel).
- Script migrasi menolak database remote secara default sebagai pengaman, kecuali diizinkan eksplisit (`MIGRATE_ALLOW_REMOTE=1` di Docker, atau flag `--remote` pada `db:migrate:production`).

---

## Docker

### Development: PostgreSQL saja

```bash
docker compose up -d postgres
```

Service `postgres` tersedia di port `5434`. Alur dev tidak ikut menyalakan container aplikasi karena service `app` memakai profil `prod`.

### Production lokal

```bash
docker compose --profile prod up -d --build
```

Entrypoint akan otomatis: menunggu postgres siap → menjalankan migrasi Drizzle (`RUN_MIGRATIONS=1`) → menyalakan server standalone.

Pemeriksaan kesehatan:

```bash
curl http://localhost:3000/api/live    # liveness ringan, dipakai HEALTHCHECK
curl http://localhost:3000/api/health  # kesiapan bisnis + database
```

Catatan penting:

- Isi `BETTER_AUTH_SECRET` (min. 32 karakter) sebelum menyalakan profil `prod`.
- `NEXT_PUBLIC_*` di-bake saat build; build ulang setelah nilainya berubah.
- Compose membaca file `.env` lokal bila ada. `DATABASE_URL` di `.env` menunjuk ke `127.0.0.1:5434` (valid dari host) tetapi **tidak valid dari dalam container**. Karena itu service `app` memakai `APP_DATABASE_URL` yang default-nya menunjuk ke host `postgres:5432`. **Jangan isi `APP_DATABASE_URL` di `.env` lokal.**
- Password database dengan karakter `@:/?#` harus percent-encode bila diisi eksplisit lewat `APP_DATABASE_URL`.
- Kosongkan `BETTER_AUTH_URL` agar mengikuti `NEXT_PUBLIC_SITE_URL`.
- Image di-pin ke `node:22.23.2-alpine` dan `postgres:17.11-alpine` agar build reproducible.

---

## Deploy ke Vercel

### 1. Siapkan PostgreSQL cloud

Gunakan PostgreSQL cloud, misalnya Supabase. Di Supabase buka **Connect**, pilih connection string:

- **Transaction pooler** (port `6543`) untuk runtime aplikasi, atau
- **Session pooler** (port `5432`) untuk menjalankan migrasi.

Pastikan URL menyertakan `sslmode=require`.

### 2. Isi environment variables di Vercel

File `.env` dan `.env.local` tidak masuk Git, jadi salin nilainya melalui **Vercel → Project Settings → Environment Variables**. Tambahkan pada environment **Production** menggunakan domain produksi final tanpa garis miring di akhir:

```env
DATABASE_URL=postgresql://postgres....?sslmode=require
BETTER_AUTH_SECRET=secret-acak-minimal-32-karakter
BETTER_AUTH_URL=https://waze-pos.vercel.app
NEXT_PUBLIC_SITE_URL=https://waze-pos.vercel.app
GOOGLE_CLIENT_ID=client-id-dari-google
GOOGLE_CLIENT_SECRET=client-secret-dari-google
```

### 3. Konfigurasi Google OAuth

Di Google Cloud Console, OAuth Client harus bertipe **Web application** dengan konfigurasi:

```text
Authorized JavaScript origin: https://waze-pos.vercel.app
Authorized redirect URI:      https://waze-pos.vercel.app/api/auth/callback/google
```

- Ganti `waze-pos.vercel.app` jika domain produksi aktual berbeda. Google mewajibkan redirect URI yang sama persis (tanpa wildcard).
- Untuk Preview Deployment: gunakan URL preview/branch yang stabil, daftarkan callback-nya secara terpisah di Google, dan pasang environment variables khusus environment **Preview**.
- Setelah mengubah `NEXT_PUBLIC_SITE_URL` atau environment variable lain, lakukan deployment baru agar nilainya ikut masuk ke build.

### 4. Jalankan migrasi database (manual, satu kali)

Migrasi tidak dijalankan dari `vercel-build` (lihat [Database dan migrasi](#database-dan-migrasi)). Jalankan manual menggunakan connection string **Session pooler** atau **Direct connection** dari Supabase:

```powershell
$env:DATABASE_URL="postgresql://...:5432/postgres?sslmode=require"
npm run db:migrate:production
```

Setelah migration berhasil, lakukan **Redeploy tanpa build cache**. Untuk runtime Vercel, `DATABASE_URL` boleh memakai Transaction pooler port `6543` setelah schema selesai dibuat.

### 5. Verifikasi deployment

Tanpa membuka secret, cek:

```text
https://waze-pos.vercel.app/api/health
```

Response yang sehat memiliki `"ok": true`, database terhubung, tabel auth/bisnis/lead tersedia, dan schema terbaru. Pada production, endpoint ini juga mensyaratkan konfigurasi operasional utama sudah lengkap: `NEXT_PUBLIC_SITE_URL` HTTPS, email Resend, `CRON_SECRET`, rekening transfer resmi, dan `PLATFORM_ADMIN_EMAILS`. Detail konfigurasi hanya ditampilkan di non-production agar endpoint publik tidak membocorkan status secret. Lalu tes halaman `/register` dan `/login`.

---

## Autentikasi dan onboarding

- Better Auth menangani register, login, logout, password hashing, session cookie, rate limiting dasar, dan reset password via email.
- Pengguna memilih Paket Tumbuh atau Bisnis pada halaman harga atau formulir registrasi. Pilihan tervalidasi diteruskan ke `/onboarding` (via `/verify-email` untuk pendaftar manual).
- Tombol **Buat akun** dan **Lanjutkan dengan Google** di `/register` aktif hanya setelah user mencentang persetujuan Kebijakan Privasi (`/privacy`, dibuka di tab baru). Persetujuan tervalidasi via `privacyAccepted: z.literal(true)` di client dan server.
- Pendaftar manual (nama, email, kata sandi + konfirmasi) menerima kode OTP 6 digit via email (plugin `emailOTP` better-auth, tabel `verification` existing, berlaku 10 menit) dan wajib verifikasi di `/verify-email` sebelum onboarding. Waktu persetujuan privasi dicatat di `user.privacy_accepted_at` (migrasi `0028`).
- Pendaftar Google melewati OTP (email sudah diverifikasi Google) tetapi tetap wajib mencentang privasi — di form register untuk mengaktifkan tombol SSO, dan di form onboarding yang mencatat `privacy_accepted_at` dalam transaksi yang sama dengan pembuatan usaha.
- Login email yang belum verifikasi ditolak server (`403 EMAIL_NOT_VERIFIED`) dan diarahkan ke `/verify-email`; guard `emailVerified` juga ada di halaman `/onboarding`, `POST /api/onboarding`, `/auth/continue`, dan `requireDashboardAccess`.
- Onboarding membuat bisnis, membership dengan role `owner`, gerai pertama, dan subscription trial 7 hari (`TRIAL_DURATION_DAYS` di `shared/billing/plans.ts`) untuk paket yang dipilih — semuanya dalam satu transaksi database.
- Pengguna yang belum menyelesaikan onboarding diarahkan dari `/dashboard` ke `/onboarding`.
- `proxy.ts` melakukan pemeriksaan cookie awal, sedangkan session dan membership tetap diverifikasi ulang di server sebelum data dashboard dibaca.

---

## Paket dan pembayaran subscription

- Checkout paket dibuat oleh server via transfer bank manual menggunakan harga di `shared/billing/plans.ts`; nominal dari browser tidak pernah dipercaya.
- Owner mentransfer ke rekening `BANK_TRANSFER_*` lalu mengunggah bukti JPG/PNG/WebP maksimal 4 MB.
- Paket baru aktif hanya setelah Dashboard Admin menyetujui bukti transfer di `/admin/payments`.
- `provider_order_id` unik dan pembaruan pembayaran bersifat idempotent untuk mencegah aktivasi ganda.

---

## Dashboard Admin

Halaman `/admin` adalah dashboard internal untuk memantau pelanggan dan subscription (fitur lengkap di [Ikhtisar fitur](#platform-admin-internal)).

### Proteksi akses

`/admin` dilindungi dua lapis:

1. `proxy.ts` melakukan redirect cepat ke `/login` bila cookie session tidak ada.
2. `app/admin/layout.tsx` memvalidasi di server: session Better Auth, email terverifikasi, dan allowlist `PLATFORM_ADMIN_EMAILS` — sebelum halaman dirender.

Halaman dan endpoint admin juga memakai header `Cache-Control: private, no-store`; endpoint detail/export memverifikasi allowlist di server. Pastikan `PLATFORM_ADMIN_EMAILS` hanya berisi email akun internal yang sudah diprovisioning dan terverifikasi.

### Seeder akun admin (lokal)

Pastikan PostgreSQL lokal aktif dan `PLATFORM_ADMIN_EMAILS` sudah diisi di `.env.local`, lalu:

```powershell
docker compose up -d
npm.cmd run admin:seed
```

Cara kerja seeder:

- Memakai email pertama dari `PLATFORM_ADMIN_EMAILS`.
- Membuat akun credential bila email belum terdaftar, atau menambahkan login password ke akun Google yang belum memiliki credential.
- Akun yang dibuat seeder ditandai `email_verified=true`; signup publik tidak otomatis mendapat status tersebut.
- Jika `PLATFORM_ADMIN_SEED_PASSWORD` dikosongkan, password kuat dibuat otomatis dan ditampilkan sekali di terminal.
- Tidak pernah mengganti password akun yang sudah ada. Untuk akun lama yang passwordnya tidak diketahui, jalankan `npm.cmd run admin:reset`.
- Menolak database remote secara default.

Setelah berhasil, hapus `PLATFORM_ADMIN_SEED_PASSWORD` dari environment jika sebelumnya diisi. Login dengan email dan password seeder (atau Google dengan email yang sama) akan otomatis diarahkan ke `/admin`.

---

## Penyimpanan lead dan event analytics

### Penyimpanan lead

- **Development:** lead disimpan ke database lokal. Jika database lokal belum menyala, endpoint memakai fallback `data/leads.ndjson` agar alur bisa diuji. File ini diabaikan Git.
- **Production:** lead wajib tersimpan di database PostgreSQL. Jika `LEAD_WEBHOOK_URL` diisi, API juga mengirim salinan lead ke CRM/backend eksternal secara best-effort; kegagalan webhook tidak menggagalkan form selama lead sudah tersimpan di database.

Payload webhook lead:

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

### Event analytics

Event yang tersedia: `click_try_free`, `click_whatsapp`, `click_pricing`, `click_demo`, `click_feature`, `submit_lead_form`.

Event dimasukkan ke `window.dataLayer` jika analytics manager digunakan. Integrasi Google Tag Manager atau penyedia analytics lain tetap perlu dikonfigurasi saat deployment.

---

## Pengujian dan pengecekan kualitas

```bash
npm run lint        # ESLint (max-warnings=0)
npm run typecheck   # TypeScript, tanpa emit
npm test            # Vitest, seluruh test suite
npm run build       # Build production
npm run test:e2e    # Playwright: smoke test desktop dan mobile
npm run security:dependencies # Blok advisori high/critical dependency runtime
```

Test unit/integration dikelompokkan mengikuti domain di `__tests__/<domain>/` (admin, auth, billing, dashboard, marketing, operations, pos, dll). Smoke test browser berada di `e2e/` dan secara default menjalankan build production lokal di Chromium desktop serta mobile. Suite lokal/CI menyertakan alur seeded untuk POS owner/kasir, checkout transfer owner, upload bukti pembayaran, dan verifikasi pembayaran Platform Admin; saat `PLAYWRIGHT_BASE_URL=https://domain.example` dipakai untuk deployment, skenario mutasi data tersebut dilewati dan hanya smoke test read-only yang berjalan. Jalankan seluruh perintah di atas sebelum membuat pull request.

Checklist UAT, bukti aktivasi production, dan kriteria go/no-go tersedia di [`docs/production-readiness.md`](docs/production-readiness.md).

---

## Struktur proyek

Struktur folder dipisahkan berdasarkan domain agar mudah dipelihara:

| Folder | Isi |
| --- | --- |
| `app/` | Routing Next.js: route group `(marketing)` halaman publik, `(auth)` login/register, `(app)` aplikasi inti, `admin/` platform admin, dan `api/` route handlers |
| `components/` | Komponen UI dikelompokkan per domain; `components/ui/` khusus primitive reusable |
| `server/` | Kode server-only: akses database, session/auth, entitlement, audit, transfer bank, email — tidak boleh masuk bundle klien |
| `shared/` | Kode isomorphic (aman klien dan server): schema validasi Zod, plan/entitlement, kalkulasi POS, util murni |
| `db/` | Satu-satunya tempat schema dan koneksi database (Drizzle) |
| `__tests__/` | Test, dikelompokkan per domain |
| `e2e/` | Smoke test browser Playwright untuk desktop dan mobile |

Aturan utama: kode di `shared/` tidak boleh meng-import `server/` atau `db/`; komponen klien tidak boleh meng-import `server/`. Panduan lengkap tersedia di [`docs/architecture.md`](docs/architecture.md).

---

## Checklist sebelum production

- [x] Nomor WhatsApp resmi (`NEXT_PUBLIC_WHATSAPP_NUMBER`).
- [x] URL registrasi/trial resmi (`NEXT_PUBLIC_TRIAL_URL`).
- [x] Konfirmasi final harga peluncuran, ketentuan pajak, batas pemakaian, dan fitur setiap paket.
- [x] Screenshot produk final untuk menggantikan pratinjau konsep (bisa menyusul).
- [x] Testimoni pelanggan asli beserta izin publikasi (bisa menyusul).
- [x] Penyimpanan lead persisten di PostgreSQL; webhook CRM (`LEAD_WEBHOOK_URL`) opsional.
- [x] Kebijakan privasi dan detail klaim keamanan produk yang telah disetujui.
- [x] Rekening resmi `BANK_TRANSFER_*` sudah terisi dan bukti transfer terverifikasi end-to-end.
- [x] `PLATFORM_ADMIN_EMAILS` hanya berisi email internal yang terverifikasi.
