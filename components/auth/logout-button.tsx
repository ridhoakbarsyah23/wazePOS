"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LoaderCircle, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setIsPending(true);
    setError("");

    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Sesi belum berhasil diakhiri. Silakan coba sekali lagi.");
      setIsPending(false);
    }
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isPending) {
          setIsOpen(open);
          setError("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={isPending}
          className="group h-9 gap-2 rounded-xl border-[#dbe5df] bg-white px-3.5 text-xs font-bold text-[#4d5e57] shadow-sm transition-all duration-200 hover:border-rose-200 hover:bg-rose-50/70 hover:text-rose-600 active:scale-95"
        >
          <LogOut className="size-3.5 transition-transform duration-200 group-hover:scale-110" />
          <span>Keluar</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-[420px] overflow-hidden p-0 border-0 shadow-[0_25px_70px_rgba(0,0,0,0.2)]">
        {/* Top Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-b from-rose-50/80 via-white to-white px-6 pt-8 pb-6 text-center sm:px-8">
          {/* Subtle Ambient Glows */}
          <div
            className="pointer-events-none absolute -top-12 -right-8 size-36 rounded-full bg-rose-200/35 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -top-8 -left-8 size-32 rounded-full bg-emerald-100/35 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative flex flex-col items-center">
            {/* Elegant Icon Badge */}
            <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_10px_25px_rgba(239,68,68,0.28)] ring-8 ring-rose-50">
              <LogOut className="size-7 stroke-[2.2]" />
            </div>

            {/* Pill Tag */}
            <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700">
              <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
              Konfirmasi Sesi
            </span>

            <AlertDialogHeader className="items-center text-center">
              <AlertDialogTitle className="text-xl font-extrabold tracking-[-0.6px] text-[#15211d]">
                Keluar dari wazePOS?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1.5 text-xs leading-relaxed text-[#627069]">
                Sesi Anda di perangkat ini akan ditutup. Anda dapat masuk kembali dengan aman kapan saja untuk melanjutkan transaksi.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Reassurance Info Pill */}
            <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#d2edd9] bg-[#f0faf4] px-3.5 py-2 text-xs font-semibold text-[#147554]">
              <CheckCircle2 className="size-4 shrink-0 text-[#198760]" />
              <span>Data transaksi & stok tersimpan otomatis di cloud</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer Section */}
        <div className="border-t border-[#edf3f0] bg-[#fbfdfc] px-6 py-4.5 sm:px-8">
          {error && (
            <div
              role="alert"
              className="mb-3.5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <AlertDialogCancel
              disabled={isPending}
              className="h-11 rounded-xl border border-[#dbe5df] bg-white px-5 text-xs font-bold text-[#4d5e57] hover:bg-[#f1f7f4] hover:text-[#15211d] transition-all active:scale-95"
            >
              Tetap di Sini
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleLogout();
              }}
              className="h-11 gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-6 text-xs font-bold text-white shadow-[0_8px_20px_rgba(225,29,72,0.25)] hover:from-rose-700 hover:to-red-700 active:scale-95 transition-all disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  <span>Mengakhiri sesi...</span>
                </>
              ) : (
                <>
                  <LogOut className="size-4" />
                  <span>Ya, Keluar Akun</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
