# Production readiness dan UAT

Dokumen ini menjadi sumber bukti go/no-go. Sebuah item hanya boleh dicentang setelah diuji pada environment production atau staging yang setara; keberadaan kode atau environment variable saja bukan bukti alurnya bekerja.

## Quality gate otomatis

Wajib lulus pada commit release:

```bash
npm run security:secrets
npm run security:dependencies
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

CI juga menjalankan migrasi PostgreSQL dan Docker smoke test. Playwright memeriksa Chromium desktop dan mobile untuk:

- liveness dan kesiapan skema database;
- landing page tanpa overflow horizontal;
- redirect anonymous dari dashboard dan admin;
- dukungan password manager dan validasi keyboard pada login;
- state pemilihan paket, dialog privasi, dan reduced-motion pada registrasi.

Untuk smoke test deployment read-only:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://domain-production.example'
npm.cmd run test:e2e
```

Jangan menjalankan skenario pembuatan akun, transaksi, atau pembayaran terhadap production tanpa data uji dan persetujuan operasional.

## Checklist aktivasi production

| Status | Pemeriksaan | Bukti yang dicatat |
| --- | --- | --- |
| [ ] | SHA alias production sama dengan commit release | SHA + URL deployment |
| [ ] | Seluruh migrasi sudah diterapkan | respons `/api/health` dengan `latestSchema: true` |
| [ ] | Google OAuth aktif | waktu uji + akun uji + redirect berhasil |
| [ ] | OTP dan reset password terkirim | message ID Resend + inbox penerima |
| [ ] | Cron pengingat trial berjalan | invocation Vercel + message ID Resend |
| [ ] | Lead tersimpan persisten | ID lead pada CRM/backend |
| [ ] | Transfer bank end-to-end | ID pembayaran + approve/reject admin + email |
| [ ] | Allowlist admin menolak akun biasa | hasil 401/403 dan akses admin berhasil |
| [ ] | Backup dan restore database diuji | waktu backup + hasil restore staging |
| [ ] | Rollback deployment diuji | SHA awal, SHA rollback, dan hasil health check |

## Skenario UAT pengguna

Gunakan akun dan data khusus uji. Hapus atau anonimisasi data setelah pengujian sesuai kebijakan privasi.

### Pemilik usaha

- [ ] Daftar manual, terima OTP, verifikasi email, lalu selesaikan onboarding.
- [ ] Daftar/login Google dan kembali ke origin yang benar.
- [ ] Buat kategori, produk, gerai, pelanggan, dan staf sesuai hak paket.
- [ ] Lakukan penjualan tunai; pastikan total, stok, laporan, dan struk konsisten.
- [ ] Void transaksi dengan alasan; pastikan audit dan stok kembali benar.
- [ ] Upload bukti transfer; pastikan status dan notifikasi mudah dipahami.
- [ ] Reset kata sandi dan login kembali dengan password manager/paste tetap berfungsi.

### Kasir

- [ ] Akun kasir langsung menuju POS dan tidak dapat membuka menu owner/admin.
- [ ] Cari atau scan SKU, ubah jumlah, tambah catatan, dan selesaikan transaksi.
- [ ] Uji koneksi lambat/offline dan pastikan tidak terjadi transaksi ganda.

### Platform admin

- [ ] Akun tanpa allowlist mendapat 403 pada halaman dan API admin.
- [ ] Filter, pencarian, pagination, export, detail usaha, dan audit log konsisten.
- [ ] Approve/reject pembayaran menghasilkan status, audit, dan email yang benar.

### Perangkat dan aksesibilitas

- [ ] Android kecil sekitar 375 px, Android besar, iPhone, tablet, dan desktop.
- [ ] Portrait dan landscape tanpa overflow atau konten tertutup sticky UI.
- [ ] Navigasi keyboard memiliki fokus terlihat dan urutan yang masuk akal.
- [ ] Zoom 200%, reduced-motion, serta pembaca layar pada auth dan checkout.
- [ ] Kontras teks/status dan target sentuh minimal 44 px diperiksa.

## Kriteria go/no-go

Release untuk pengguna umum hanya **go** bila:

- tidak ada advisori critical/high pada dependency runtime yang dapat dieksploitasi;
- seluruh quality gate pada SHA release hijau;
- health production menunjukkan database dan skema terbaru siap;
- alur auth, transaksi, pembayaran, email, lead, backup, dan rollback memiliki bukti;
- tidak ada defect severity 1/2 yang terbuka dari UAT.

Jika salah satu syarat di atas gagal, pertahankan status beta terbatas dan catat owner serta target perbaikannya.
