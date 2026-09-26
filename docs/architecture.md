# Arsitektur Project wazePOS

Dokumen ini menjadi acuan untuk menambah dan memindahkan kode tanpa membuat dependensi antar-domain sulit dilacak.

## Prinsip utama

- `app/` hanya berisi routing Next.js, Server Components route, Route Handlers, metadata, dan konfigurasi runtime. URL publik didefinisikan route group `(marketing)`, `(auth)`, dan `(app)` tanpa mengubah path.
- `components/` dikelompokkan berdasarkan domain. `components/ui/` hanya untuk primitive presentational yang reusable.
- `server/` berisi kode yang **tidak boleh masuk bundle klien**: akses database, session/auth, entitlement server, audit, Midtrans, email, dan state server (rate limit). Modul di sini memakai `server-only` atau `@/db`/`node:*`.
- `shared/` berisi kode **isomorphic** yang aman dipakai klien maupun server: schema validasi, plan/entitlement, label, kalkulasi POS, util murni, dan tipe/UI helper admin.
- `db/` adalah satu-satunya tempat untuk schema dan koneksi database. Drizzle migrations tidak dipindahkan.
- `__tests__/` mengikuti domain agar test mudah ditemukan di dekat feature-nya.
- Import antar domain menggunakan alias `@/`; hindari deep import langsung antar file internal.

## Struktur target

```text
app/
  (marketing)/   Halaman publik (landing, privacy)
  (auth)/        Login, register, reset password, /auth/continue
  (app)/         Aplikasi inti setelah login (dashboard, pos, products, ...)
  admin/         Platform Admin (layout + guard sendiri)
  api/           Route Handlers
components/
  account/ admin/ auth/ catalog/ customers/ dashboard/ inventory/
  marketing/ onboarding/ pos/ settings/ shared/ staff/ subscription/ ui/
server/
  access/        Route guards untuk workspace
  admin/         Platform Admin DAL, audit, dan dashboard query
  auth/          Better Auth dan session
  billing/       Midtrans (Snap + signature)
  email/         Email delivery
  pos/           Invoice number, reporting, sale filters (query DB)
  rate-limit.ts  Rate limiter in-memory
shared/
  admin/         Types, UI meta, CSV helper, tema, access predicate
  auth/          Social auth helper dan auth client
  billing/       Plans dan label pembayaran
  config/        Site configuration
  marketing/     Content, analytics, dan SEO
  pos/           Perhitungan, product search, receipt, idempotency
  validation/    Zod schemas
  outlet-slug.ts pagination.ts product-errors.ts utils.ts
__tests__/
  admin/ auth/ billing/ dashboard/ db/ marketing/ operations/ pos/ shared/ ui/
```

## Aturan import

- `@/components/ui/*` tidak boleh meng-import domain bisnis.
- `@/shared/*` **tidak boleh** meng-import `@/server/*` atau `@/db/*`. Arah dependensi selalu: `app`/`components` → `server`/`shared`; `server` → `shared`/`db`.
- `@/server/*` tidak boleh di-import dari komponen klien (`"use client"`) atau file yang masuk bundle klien.
- `@/server/admin/*`, `@/server/auth/*`, dan DAL server lainnya harus mempertahankan `server-only`.
- `@/db/schema` adalah boundary data; query domain sebaiknya berada di `server/<domain>` atau service layer.
- Route Handler harus tipis: validasi request, panggil domain service/DAL, lalu bentuk response.

## Checklist fitur baru

1. Tambahkan route di `app/` bila ada URL baru (pilih route group yang sesuai).
2. Letakkan komponen domain di `components/<domain>/`.
3. Letakkan schema validasi di `shared/validation`.
4. Letakkan query/access logic di `server/<domain>`; util murni di `shared/<domain>`.
5. Tambahkan test di `__tests__/<domain>`.
6. Jalankan `npm run typecheck`, `npm run lint`, dan `npm test`.
7. Untuk perubahan schema, generate migration lewat `npm run db:generate` dan jalankan migration sesuai environment.

## Tahapan lanjutan (opsional)

- `db/schema.ts` dapat dipecah per domain setelah migration dan adapter boundary dirancang ulang.
- Service layer dapat ditambahkan untuk domain yang sudah memiliki banyak query atau aturan bisnis.
- Aturan batas server/klien dapat ditegakkan otomatis dengan `eslint-plugin-boundaries` atau aturan `no-restricted-imports`.
