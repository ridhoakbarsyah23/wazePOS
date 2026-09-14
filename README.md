# Website Promosi wazePOS

Landing page marketing dan lead generation untuk wazePOS, dibuat berdasarkan `PRD_Website_Promosi_wazePOS.docx`. Aplikasi menggunakan Next.js App Router, React, TypeScript, dan CSS responsif tanpa library UI eksternal.

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
npm run dev
```

Buka `http://localhost:3000`.

## Konfigurasi environment

Isi `.env.local` dengan data resmi sebelum production:

```env
NEXT_PUBLIC_TRIAL_URL=https://contoh-domain-resmi/daftar
NEXT_PUBLIC_WHATSAPP_NUMBER=6281234567890
NEXT_PUBLIC_SITE_URL=https://contoh-domain-resmi
LEAD_WEBHOOK_URL=https://endpoint-backend-atau-crm/leads
LEAD_WEBHOOK_SECRET=secret-opsional
```

- `NEXT_PUBLIC_TRIAL_URL`: URL registrasi/trial resmi. Jika kosong, CTA diarahkan ke form lead.
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: nomor resmi dalam format internasional tanpa tanda `+`. Jika kosong, CTA diarahkan ke form lead.
- `NEXT_PUBLIC_SITE_URL`: origin website untuk metadata dan sitemap.
- `LEAD_WEBHOOK_URL`: endpoint backend/CRM yang menerima JSON lead. Wajib untuk form di production.
- `LEAD_WEBHOOK_SECRET`: Bearer token opsional untuk webhook.

Nilai `NEXT_PUBLIC_*` dimasukkan ke bundle ketika proses build. Jalankan ulang `npm run build` setelah nilainya berubah.

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
