"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#f4faf7] p-6 text-center text-[#15211d]">
      <div className="mx-auto max-w-md rounded-2xl border border-[#f2d4b9] bg-white p-8 shadow-lg">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#fff0e5] text-[#a35f12]">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-xl font-bold">Terjadi Kendala pada Dashboard</h2>
        <p className="mt-2 text-sm text-[#627069]">
          Data dashboard belum dapat dimuat. Silakan coba lagi atau muat ulang halaman.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => reset()} variant="default">
            <RefreshCw className="size-4" /> Coba Lagi
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Muat Ulang Halaman</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
