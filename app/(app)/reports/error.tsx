"use client";

import { RouteError } from "@/components/shared/route-error";

export default function ReportsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      error={error}
      retry={retry}
      pageName="Laporan"
      description="Ringkasan penjualan belum berhasil dimuat. Coba lagi untuk mengambil data laporan terbaru."
    />
  );
}
