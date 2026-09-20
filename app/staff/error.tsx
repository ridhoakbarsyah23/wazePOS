"use client";

import { RouteError } from "@/components/route-error";

export default function StaffError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      error={error}
      retry={retry}
      pageName="Karyawan"
      description="Daftar karyawan dan hak akses belum berhasil dimuat. Coba lagi sebelum melakukan perubahan akun."
    />
  );
}
