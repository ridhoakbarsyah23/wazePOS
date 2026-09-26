"use client";

import { RouteError } from "@/components/shared/route-error";

export default function InventoryError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      error={error}
      retry={retry}
      pageName="Inventory"
      description="Posisi stok dan riwayat pergerakan belum berhasil dimuat. Periksa koneksi sebelum melakukan penyesuaian stok."
    />
  );
}
