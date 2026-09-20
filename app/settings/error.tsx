"use client";

import { RouteError } from "@/components/route-error";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      retry={reset}
      pageName="Pengaturan"
      description="Profil usaha dan data gerai belum berhasil dimuat. Periksa koneksi, lalu coba kembali."
    />
  );
}
