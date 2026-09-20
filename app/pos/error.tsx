"use client";

import { RouteError } from "@/components/route-error";

export default function PosError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      error={error}
      retry={retry}
      pageName="Kasir POS"
      description="Katalog atau data gerai gagal dimuat. Periksa koneksi Anda, lalu coba lagi tanpa perlu keluar dari aplikasi."
    />
  );
}
