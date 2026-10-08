"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ban, CheckCircle2, Loader2, X } from "lucide-react";

type VoidSaleButtonProps = {
  saleId: string;
  invoiceNumber: string;
  isVoided: boolean;
  canVoid: boolean;
  disabledReason?: string | null;
};

export function VoidSaleButton({
  saleId,
  invoiceNumber,
  isVoided,
  canVoid,
  disabledReason,
}: VoidSaleButtonProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const reasonHelpId = useId();
  const errorId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoadingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const trimmedReason = reason.trim();
  const reasonIsValid = trimmedReason.length >= 5 && trimmedReason.length <= 200;

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 50);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoadingRef.current) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen]);

  if (isVoided) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-extrabold text-rose-700 shadow-sm print:hidden">
        <Ban className="size-4 text-rose-600" />
        <span>STATUS: TRANSAKSI DIBATALKAN</span>
      </div>
    );
  }

  if (!canVoid) {
    return disabledReason ? (
      <span className="inline-flex max-w-xs items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 print:hidden">
        <AlertCircle className="size-4 shrink-0" />
        {disabledReason}
      </span>
    ) : null;
  }

  function openDialog() {
    setReason("");
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsOpen(true);
  }

  async function handleVoid() {
    if (!reasonIsValid || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/sales/${saleId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmedReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Gagal membatalkan transaksi.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage(data.message || "Transaksi berhasil dibatalkan.");
      setTimeout(() => {
        setIsOpen(false);
        setIsLoading(false);
        router.refresh();
      }, 1200);
    } catch {
      setErrorMessage("Terjadi gangguan koneksi. Silakan coba lagi.");
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/15 active:scale-[0.98] print:hidden"
      >
        <Ban className="size-3.5" />
        <span>Batalkan Transaksi</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isLoading) setIsOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="w-full max-w-md rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-[#e7efea] pb-3">
              <div id={titleId} className="flex items-center gap-2 text-base font-extrabold text-rose-600">
                <Ban className="size-5" />
                <span>Konfirmasi Pembatalan</span>
              </div>
              <button
                type="button"
                onClick={() => !isLoading && setIsOpen(false)}
                aria-label="Tutup dialog pembatalan transaksi"
                className="grid size-10 place-items-center rounded-lg text-[#627069] hover:bg-[#f0f4f1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p id={descriptionId} className="text-xs leading-relaxed text-[#627069]">
                Anda akan membatalkan invoice <strong className="text-[#15211d]">{invoiceNumber}</strong>.
                Tindakan ini akan mengembalikan seluruh kuantitas produk ke stok gerai dan transaksi tidak akan lagi dihitung dalam total omzet harian.
              </p>

              <div>
                <label htmlFor="void-reason" className="block text-xs font-bold text-[#15211d] mb-1.5">
                  Alasan Pembatalan:
                </label>
                <textarea
                  ref={textareaRef}
                  id="void-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minLength={5}
                  maxLength={200}
                  required
                  disabled={isLoading || Boolean(successMessage)}
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={`${reasonHelpId}${errorMessage ? ` ${errorId}` : ""}`}
                  placeholder="Contoh: Salah input pesanan, Pelanggan retur barang, dll."
                  className="w-full rounded-xl border border-[#cddbd3] p-3 text-xs text-[#15211d] placeholder:text-[#8b9991] focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500 disabled:bg-[#f6f8f7] disabled:text-[#8b9991]"
                />
                <div id={reasonHelpId} className="mt-1.5 flex justify-between gap-3 text-[10px] text-[#78857f]">
                  <span>Minimal 5 karakter, maksimal 200 karakter.</span>
                  <span>{trimmedReason.length}/200</span>
                </div>
              </div>

              {errorMessage && (
                <div id={errorId} role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setIsOpen(false)}
                className="min-h-11 rounded-xl border border-[#cddbd3] bg-white px-4 py-2.5 text-xs font-bold text-[#627069] transition hover:bg-[#f4faf7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isLoading || !reasonIsValid}
                onClick={handleVoid}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Memproses pembatalan...</span>
                  </>
                ) : (
                  <>
                    <Ban className="size-3.5" />
                    <span>Ya, Batalkan Transaksi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
