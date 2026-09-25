"use client";

import { RouteError } from "@/components/shared/route-error";

export default function CategoriesError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <RouteError
      error={error}
      retry={retry}
      pageName="Kategori"
      description="Kategori belum berhasil dimuat. Data yang sudah tersimpan tetap aman dan dapat dicoba kembali."
    />
  );
}
