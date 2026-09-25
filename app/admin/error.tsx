"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlatformAdminError({
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  const handleRetry = retry ?? reset ?? (() => window.location.reload());

  return (
    <div className="grid place-items-center px-2 py-10 sm:py-14">
      <div className="w-full max-w-md rounded-2xl border border-[#f2d4b9] bg-white p-7 text-center shadow-lg sm:p-8" role="alert" aria-live="assertive">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#fff0e5] text-[#a35f12]">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold">Data Platform Admin belum dapat dimuat</h1>
        <p className="mt-2 text-sm leading-6 text-[#627069]">
          Terjadi kendala saat mengambil data. Silakan coba lagi atau muat ulang halaman.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => handleRetry()}>
            <RefreshCw className="size-4" /> Coba Lagi
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin">Kembali ke ringkasan</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
