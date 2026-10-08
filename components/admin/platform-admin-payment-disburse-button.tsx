"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlatformAdminPaymentItem } from "@/shared/admin/platform-admin-types";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlatformAdminPaymentDisburseButton({ payment }: { payment: PlatformAdminPaymentItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (payment.status !== "paid") return null;

  if (payment.disbursedAt) {
    return (
      <span className="block text-xs text-[#627069] dark:text-[#a3a3a3]">
        Dicairkan {formatDateTime(payment.disbursedAt)}
        {payment.disbursedBy ? ` oleh ${payment.disbursedBy}` : ""}
        {payment.disbursementReference ? ` · Ref: ${payment.disbursementReference}` : ""}
      </span>
    );
  }

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setReference("");
    setNote("");
    setMessage(null);
  }

  async function submit() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/payments/disburse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.id,
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage({ type: "error", text: payload.message ?? "Pencairan belum berhasil ditandai." });
        return;
      }
      setMessage({ type: "success", text: payload.message ?? "Pembayaran ditandai sudah dicairkan." });
      router.refresh();
      window.setTimeout(() => setOpen(false), 1200);
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => setOpen(true)}>
        Tandai dicairkan
      </Button>

      {open && (
        <div data-admin-portal className="fixed inset-0 z-[300] flex items-center justify-center bg-[#09271d]/60 p-4 backdrop-blur-[3px]" role="alertdialog" aria-modal="true" aria-label={`Tandai pencairan ${payment.providerOrderId}`}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white shadow-[0_30px_90px_rgba(4,42,29,.32)] dark:border-[#303030] dark:bg-[#0d0d0d] dark:text-white">
            <div className="border-b border-[#e8efeb] p-4 dark:border-[#303030] sm:p-5">
              <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#718078] dark:text-[#a3a3a3]">Pencairan ke rekening pribadi</p>
              <h2 className="m-0 mt-1 text-base font-black text-[#15211d] dark:text-white">{payment.businessName}</h2>
              <p className="m-0 mt-1 font-mono text-xs text-[#627069] dark:text-[#a3a3a3]">{payment.providerOrderId} · {formatRupiah(payment.amount)}</p>
              <p className="m-0 mt-2 text-xs leading-5 text-[#627069] dark:text-[#a3a3a3]">
                Transfer dana via mobile banking ke rekening pribadi Anda terlebih dahulu, lalu tandai di sini sebagai bukti pencatatan.
              </p>
            </div>

            <div className="max-h-[50dvh] overflow-y-auto p-4 sm:p-5">
              {message && (
                <p role={message.type === "error" ? "alert" : "status"} className={`mb-3 rounded-xl border px-3 py-2 text-xs font-bold ${message.type === "success" ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348] dark:border-[#245f42] dark:bg-[#16362a] dark:text-[#62d6a5]" : "border-[#f3c8c4] bg-[#fff2f1] text-[#a4382f] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"}`}>
                  {message.text}
                </p>
              )}

              <label className="block text-xs font-bold text-[#34443d] dark:text-[#d4d4d4]" htmlFor={`disburse-ref-${payment.id}`}>
                Referensi pencairan (opsional)
              </label>
              <input
                id={`disburse-ref-${payment.id}`}
                value={reference}
                maxLength={120}
                placeholder="Contoh: mutasi BCA 29/09 / FT12345"
                onChange={(event) => setReference(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3 py-2 text-sm text-[#15211d] outline-none placeholder:text-[#82928a] focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white dark:placeholder:text-[#737373] dark:focus:border-[#62d6a5] dark:focus:ring-[#62d6a5]/25"
              />

              <label className="mt-4 block text-xs font-bold text-[#34443d] dark:text-[#d4d4d4]" htmlFor={`disburse-note-${payment.id}`}>
                Catatan pencairan (opsional)
              </label>
              <textarea
                id={`disburse-note-${payment.id}`}
                value={note}
                maxLength={500}
                rows={3}
                placeholder="Contoh: dicairkan ke BCA pribadi setelah cek mutasi"
                onChange={(event) => setNote(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3 py-2 text-sm text-[#15211d] outline-none placeholder:text-[#82928a] focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white dark:placeholder:text-[#737373] dark:focus:border-[#62d6a5] dark:focus:ring-[#62d6a5]/25"
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-[#e8efeb] p-4 dark:border-[#303030] sm:flex-row sm:justify-end sm:p-5">
              <Button type="button" variant="outline" size="sm" onClick={closeDialog} disabled={pending}>
                Batal
              </Button>
              <Button type="button" size="sm" disabled={pending} onClick={() => void submit()}>
                {pending ? "Menyimpan..." : "Tandai sudah dicairkan"}
              </Button>
            </div>

            <p className="flex items-center gap-1.5 px-4 pb-4 text-[11px] text-[#82928a] dark:text-[#a3a3a3] sm:px-5">
              <Badge variant="secondary">Manual via m-banking</Badge>
              Status pembayaran tetap Berhasil; hanya penanda pencairan yang dicatat.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
