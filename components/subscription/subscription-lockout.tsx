"use client";

import Link from "next/link";
import { CreditCard, Lock, RefreshCw } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

type SubscriptionLockoutProps = {
  businessName: string;
  role: "owner" | "admin" | "cashier";
  reason?: string;
};

export function SubscriptionLockout({
  businessName,
  role,
  reason,
}: SubscriptionLockoutProps) {
  const isOwner = role === "owner";

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center p-4">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[#fed7aa] bg-white p-8 text-center shadow-[0_12px_32px_rgba(234,88,12,.08)]">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-600 shadow-xs ring-8 ring-amber-50/50">
          <Lock className="size-8" />
        </div>

        <span className="mt-6 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-800">
          Layanan Dinonaktifkan Sementara
        </span>

        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-[#15211d] sm:text-2xl">
          Masa Langganan Telah Berakhir
        </h1>

        <p className="mt-3 text-xs leading-relaxed text-[#627069]">
          {reason ||
            `Masa uji coba gratis 14 hari atau langganan aktif untuk ${businessName} telah berakhir. Operasional kasir dan manajemen data saat ini dikunci.`}
        </p>

        <div className="mt-6 rounded-2xl border border-[#fed7aa]/60 bg-[#fffbf6] p-4 text-left text-xs text-[#8c5b24]">
          <p className="m-0 font-bold mb-1">Cara Mengaktifkan Kembali:</p>
          {isOwner ? (
            <p className="m-0 leading-5">
              Sebagai <strong>Pemilik Usaha</strong>, Anda dapat memilih paket langganan (Tumbuh atau Bisnis) dan melakukan pembayaran langsung via Midtrans.
            </p>
          ) : (
            <p className="m-0 leading-5">
              Silakan hubungi <strong>Pemilik Usaha</strong> Anda agar melakukan pembayaran perpanjangan paket melalui menu <em>Subscription</em>.
            </p>
          )}
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
          {isOwner ? (
            <Link
              href="/subscription"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#198760] text-xs font-bold text-white shadow-md transition hover:bg-[#14714f] active:scale-[0.98]"
            >
              <CreditCard className="size-4" />
              <span>Buka Menu Subscription & Bayar</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dfe8e3] bg-[#f7faf8] text-xs font-bold text-[#15211d] transition hover:bg-[#eef5f1]"
            >
              <RefreshCw className="size-3.5" />
              <span>Cek Status Terbaru (Muat Ulang)</span>
            </button>
          )}

          <div className="pt-2">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
