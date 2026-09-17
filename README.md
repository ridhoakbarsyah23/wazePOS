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
npm run db:migrate
npm run dev
```

Buka `http://localhost:3000`.

## Deploy ke Vercel untuk testing

Gunakan PostgreSQL cloud, misalnya Supabase. Di Supabase buka **Connect**, pilih
connection string **Transaction pooler** (port `6543`) atau **Session pooler**
(port `5432`), lalu salin URL PostgreSQL-nya. Pastikan URL tersebut menyertakan
`sslmode=require`.

Tambahkan environment variables berikut di Vercel pada environment **Production**
dan **Preview**:

```env
DATABASE_URL=postgresql://postgres....?sslmode=require
BETTER_AUTH_SECRET=secret-acak-minimal-32-karakter
BETTER_AUTH_URL=https://waze-pos.vercel.app
NEXT_PUBLIC_SITE_URL=https://waze-pos.vercel.app
```

Script `vercel-build` menjalankan `npm run db:migrate` sebelum build, sehingga
schema database Supabase dibuat atau diperbarui otomatis saat deployment.
Setelah env disimpan, lakukan **Redeploy** tanpa build cache, lalu tes `/register`
dan `/login`.

Sebelum menjalankan migration, nyalakan PostgreSQL lokal dan isi secret autentikasi:

```bash
docker compose up -d postgres
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Salin hasil perintah kedua ke `BETTER_AUTH_SECRET` di `.env.local`. Database Docker bawaan tersedia di port `5434` agar tidak mudah berbenturan dengan instalasi PostgreSQL lain.

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
- Paket Tumbuh mendukung transaksi tunai tanpa shift. Paket Bisnis menambahkan pembayaran non-tunai dan mewajibkan shift kasir pada gerai aktif.
- Setiap transaksi menyimpan snapshot nama dan harga produk, mengurangi stok secara atomik, serta terhubung ke shift kasir ketika fitur shift tersedia.
- Penutupan shift menghitung kas yang diharapkan dari modal awal dan transaksi tunai saja; QRIS, debit, dan kredit tidak menambah kas fisik.
- Halaman `/reports` menampilkan ringkasan penjualan harian, produk terlaris, dan distribusi metode pembayaran.
- Pengelolaan produk, stok, dan laporan dibatasi untuk role `owner` atau `admin`; role `cashier` diarahkan ke kasir.
- Entitlement paket didefinisikan terpusat di `lib/plans.ts` dan diverifikasi kembali oleh API untuk fitur khusus Paket Bisnis.
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
- `LEAD_WEBHOOK_URL`: endpoint backend/CRM yang menerima JSON lead. Wajib untuk form di production.
- `LEAD_WEBHOOK_SECRET`: Bearer token opsional untuk webhook.

Nilai `NEXT_PUBLIC_*` dimasukkan ke bundle ketika proses build. Jalankan ulang `npm run build` setelah nilainya berubah.

## Pembayaran subscription

- Checkout paket dibuat oleh server melalui Midtrans Snap menggunakan harga di `lib/plans.ts`; nominal dari browser tidak digunakan.
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
