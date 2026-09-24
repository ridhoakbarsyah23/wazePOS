"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlatformAdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh bg-[#f3f7f5] text-[#15211d]">
      <header className="border-b border-[#dfe8e3] bg-white/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 w-[min(1440px,calc(100%-24px))] items-center gap-2 sm:w-[min(1440px,calc(100%-40px))] sm:gap-3">
          <Link href="/admin" className="flex shrink-0 items-center" aria-label="Platform Admin wazePOS">
            <Image src="/logo.png" alt="wazePOS" width={108} height={32} className="h-6 w-auto sm:h-7" />
          </Link>
          <span className="hidden h-7 w-px bg-[#dfe8e3] sm:block" />
          <span className="hidden text-xs font-extrabold text-[#106348] min-[360px]:block">Platform Admin</span>
        </div>
      </header>
      <main id="admin-content" tabIndex={-1} className="grid min-h-[calc(100dvh-4rem)] place-items-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 focus:outline-none">
        <div className="w-full max-w-md rounded-2xl border border-[#f2d4b9] bg-white p-7 text-center shadow-lg sm:p-8" role="alert" aria-live="assertive">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#fff0e5] text-[#a35f12]">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold">Data Platform Admin belum dapat dimuat</h1>
          <p className="mt-2 text-sm leading-6 text-[#627069]">
            Terjadi kendala saat mengambil data. Silakan coba lagi atau muat ulang halaman.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => reset()}>
              <RefreshCw className="size-4" /> Coba Lagi
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">Muat Ulang Halaman</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
