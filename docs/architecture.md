# Arsitektur Project wazePOS

Dokumen ini menjadi acuan untuk menambah dan memindahkan kode tanpa membuat dependensi antar-domain sulit dilacak.

## Prinsip utama

- `app/` hanya berisi routing Next.js, Server Components route, Route Handlers, metadata, dan konfigurasi runtime.
- `components/` dikelompokkan berdasarkan domain. `components/ui/` hanya untuk primitive presentational yang reusable.
- `lib/` berisi domain logic, access control, validasi, dan konfigurasi. Module server-only tetap berada di server boundary.
- `db/` adalah satu-satunya tempat untuk schema dan akses database. Drizzle migrations tidak dipindahkan.
- `__tests__/` mengikuti domain agar test mudah ditemukan di dekat feature-nya.
- Import antar domain menggunakan alias `@/`; hindari deep import langsung antar file internal.

## Struktur target

```text
app/
  (tetap route-centric sesuai Next.js App Router)
components/
  account/       Profil dan pengaturan akun
  admin/         Platform Admin
  auth/          Login, register, reset password
  catalog/       Produk dan kategori
  customers/     Customer
  dashboard/     Komponen dashboard
  inventory/     Stok dan adjustment
  marketing/     Halaman marketing dan SEO
  onboarding/    Form onboarding
  pos/           POS, receipt, print, dan sales action
  settings/      Pengaturan usaha
  shared/        App shell, route state, dan komponen lintas domain
  staff/         Staff management
  subscription/  Subscription UI
  ui/            Primitive UI
lib/
  access/        Route guards untuk workspace
  admin/         Platform Admin DAL, types, dan audit
  auth/          Better Auth, session, dan social auth
  billing/       Plans, payment, Midtrans
  config/        Site configuration
  email/         Email delivery
  marketing/     Content, analytics, dan SEO
  pos/           Perhitungan, reporting, sales, dan receipt logic
  shared/        Utility dan constraint yang reusable
  validation/    Zod schemas
__tests__/
  admin/ auth/ billing/ dashboard/ db/ marketing/ operations/ pos/ shared/ ui/
```

## Aturan import

- `@/components/ui/*` tidak boleh meng-import domain bisnis.
- `@/lib/shared/*` tidak boleh meng-import `@/lib/auth/*`, `@/lib/billing/*`, atau `@/lib/pos/*`.
- `@/lib/auth/*`, `@/lib/admin/*`, dan DAL server lainnya harus mempertahankan `server-only` bila digunakan di server.
- `@/db/schema` adalah boundary data; query domain sebaiknya berada di `lib/<domain>` atau service layer.
- Route Handler harus tipis: validasi request, panggil domain service/DAL, lalu bentuk response.

## Checklist fitur baru

1. Tambahkan route di `app/` bila ada URL baru.
2. Letakkan komponen domain di folder yang sesuai.
3. Letakkan schema validasi di `lib/validation` atau folder domain bila cukup spesifik.
4. Letakkan query/access logic di `lib/<domain>`.
5. Tambahkan test di `__tests__/<domain>`.
6. Jalankan `npm run typecheck`, `npm run lint`, dan `npm test`.
7. Untuk perubahan schema, generate migration lewat `npm run db:generate` dan jalankan migration sesuai environment.

## Tahapan lanjutan (opsional)

- Route groups Next.js dapat ditambahkan ketika jumlah domain aplikasi bertambah, tetapi URL publik tidak boleh berubah.
- `db/schema.ts` dapat dipecah per domain setelah migration dan adapter boundary dirancang ulang.
- Service layer dapat ditambahkan untuk domain yang sudah memiliki banyak query atau aturan bisnis.
