"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ban, CheckCircle2, Loader2, X } from "lucide-react";

type VoidSaleButtonProps = {
  saleId: string;
  invoiceNumber: string;
  isVoided: boolean;
  canVoid: boolean;
};

export function VoidSaleButton({
  saleId,
  invoiceNumber,
  isVoided,
  canVoid,
}: VoidSaleButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (isVoided) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-extrabold text-rose-700 shadow-sm print:hidden">
        <Ban className="size-4 text-rose-600" />
        <span>STATUS: TRANSAKSI DIBATALKAN (VOID)</span>
      </div>
    );
  }

  if (!canVoid) {
    return null;
  }

  async function handleVoid() {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/sales/${saleId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
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
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] print:hidden"
      >
        <Ban className="size-3.5" />
        <span>Void / Batalkan Transaksi</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#e7efea] pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base">
                <Ban className="size-5" />
                <span>Konfirmasi Pembatalan (Void)</span>
              </div>
              <button
                type="button"
                onClick={() => !isLoading && setIsOpen(false)}
                className="rounded-lg p-1 text-[#627069] hover:bg-[#f0f4f1]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs leading-relaxed text-[#627069]">
                Anda akan membatalkan invoice <strong className="text-[#15211d]">{invoiceNumber}</strong>.
                Tindakan ini akan mengembalikan seluruh kuantitas produk ke stok gerai dan transaksi tidak akan lagi dihitung dalam total omzet harian.
              </p>

              <div>
                <label htmlFor="void-reason" className="block text-xs font-bold text-[#15211d] mb-1.5">
                  Alasan Pembatalan:
                </label>
                <textarea
                  id="void-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Salah input pesanan, Pelanggan retur barang, dll."
                  className="w-full rounded-xl border border-[#cddbd3] p-3 text-xs text-[#15211d] placeholder:text-[#8b9991] focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
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
                className="rounded-xl border border-[#cddbd3] bg-white px-4 py-2.5 text-xs font-bold text-[#627069] transition hover:bg-[#f4faf7] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleVoid}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Memproses Void...</span>
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
