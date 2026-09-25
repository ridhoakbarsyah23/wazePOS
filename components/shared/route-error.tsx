"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
  pageName: string;
  description: string;
};

export function RouteError({ error, retry, pageName, description }: RouteErrorProps) {
  useEffect(() => {
    console.error(`Gagal memuat ${pageName}`, error);
  }, [error, pageName]);

  return (
    <main className="flex min-h-dvh flex-col bg-[#f4faf7] text-[#15211d]">
      <header className="border-b border-[#dfe8e3] bg-white px-5 py-4 shadow-xs">
        <Link href="/dashboard" className="text-lg font-black tracking-[-0.6px] text-[#106348]">
          wazePOS
        </Link>
      </header>
      <div className="grid flex-1 place-items-center p-5 sm:p-8">
        <section className="w-full max-w-lg rounded-3xl border border-[#f0d6bd] bg-white p-7 text-center shadow-[0_18px_50px_rgba(16,65,48,.1)] sm:p-9">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#fff0e5] text-[#a35f12]">
            <AlertTriangle className="size-6" />
          </div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#a35f12]">
            Data belum dapat ditampilkan
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.7px]">Kendala pada {pageName}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#627069]">{description}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" onClick={() => retry()}>
              <RefreshCw className="size-4" /> Coba Lagi
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Kembali ke Dashboard</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
