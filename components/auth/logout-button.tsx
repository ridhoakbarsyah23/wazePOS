"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, LogOut, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  async function handleLogout() {
    setIsPending(true);
    setError("");

    try {
      await authClient.signOut();
      setIsOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Gagal keluar. Silakan coba lagi.");
      setIsPending(false);
    }
  }

  return (
    <>
      {/* Tombol Pemicu Keluar */}
      <Button
        variant="ghost"
        size="sm"
        type="button"
        disabled={isPending}
        onClick={() => setIsOpen(true)}
        className={
          className ??
          "h-9 gap-2 rounded-xl px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
        }
        title="Keluar dari akun"
      >
        <LogOut className="size-4" />
        <span>Keluar</span>
      </Button>

      {/* Modal Dialog Konfirmasi Custom (Bukan bawaan browser) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          {/* Backdrop click to close */}
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!isPending) setIsOpen(false);
            }}
          />

          {/* Modal Box */}
          <div className="relative w-full max-w-sm rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Tombol Silang (Close) */}
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-[#82928a] hover:text-[#15211d] transition-colors"
              aria-label="Tutup modal"
            >
              <X className="size-4" />
            </button>

            {/* Header Dialog */}
            <div className="flex items-center gap-3.5 mb-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <LogOut className="size-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-base text-[#15211d]">
                  Keluar dari wazePOS?
                </h3>
                <p className="m-0 text-xs text-[#627069]">
                  Konfirmasi pengakhiran sesi akun Anda.
                </p>
              </div>
            </div>

            {/* Deskripsi */}
            <p className="text-xs leading-relaxed text-[#4d5e57] my-3">
              Apakah Anda yakin ingin keluar? Seluruh data transaksi dan stok sudah tersimpan aman di cloud.
            </p>

            {/* Error jika ada */}
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 border border-rose-200">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="h-10 px-4 text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={handleLogout}
                className="h-10 px-4 text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 active:scale-95 shadow-sm"
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" />
                    <span>Keluar...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="size-3.5" />
                    <span>Ya, Keluar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
