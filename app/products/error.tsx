"use client";

import { RouteError } from "@/components/route-error";

export default function ProductsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      error={error}
      retry={retry}
      pageName="Produk"
      description="Katalog produk belum berhasil dimuat. Data yang sudah tersimpan tetap aman dan dapat dicoba kembali."
    />
  );
}
