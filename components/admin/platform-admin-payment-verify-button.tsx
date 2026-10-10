"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlatformAdminPaymentItem } from "@/shared/admin/platform-admin-types";

type ProofDetail = {
  id: string;
  businessId: string;
  plan: string;
  amount: number;
  status: string;
  senderBank: string | null;
  senderAccountName: string | null;
  proofDataUrl: string;
  transferProofUploadedAt: string | null;
  verificationNote: string | null;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function PlatformAdminPaymentVerifyButton({ payment }: { payment: PlatformAdminPaymentItem }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState<ProofDetail | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canVerify = payment.status === "pending";

  useEffect(() => {
    if (!open) return;

    window.setTimeout(() => {
      noteRef.current?.focus();
    }, 0);

    return () => {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [open]);

  async function openDialog() {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
    setMessage(null);
    if (!payment.proofUploaded) {
      setProof(null);
      return;
    }
    setLoadingProof(true);
    try {
      const response = await fetch(`/api/admin/payments/proof?paymentId=${encodeURIComponent(payment.id)}`, {
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json()) as ProofDetail & { message?: string };
      if (!response.ok) {
        setMessage({ type: "error", text: payload.message ?? "Bukti transfer belum dapat dimuat." });
        setProof(null);
        return;
      }
      setProof(payload);
    } catch {
      setMessage({ type: "error", text: "Tidak dapat memuat bukti transfer." });
    } finally {
      setLoadingProof(false);
    }
  }

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    setProof(null);
    setNote("");
    setMessage(null);
  }

  function keepFocusInDialog(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function verify(decision: "approve" | "reject") {
    if (!canVerify || pending) return;
    if (decision === "reject" && note.trim().length < 3) {
      setMessage({ type: "error", text: "Tulis alasan penolakan minimal 3 karakter." });
      return;
    }
    setPending(decision);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, decision, note: note.trim() || undefined }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setMessage({ type: "error", text: payload.message ?? "Verifikasi belum berhasil." });
        return;
      }
      setMessage({ type: "success", text: payload.message ?? "Verifikasi berhasil disimpan." });
      router.refresh();
      window.setTimeout(() => setOpen(false), 1200);
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setPending(null);
    }
  }

  if (!canVerify) {
    if (payment.verifiedBy) {
      return (
        <span className="block text-xs text-[#627069] dark:text-[#a3a3a3]">
          Diverifikasi oleh {payment.verifiedBy}
          {payment.verificationNote ? ` — ${payment.verificationNote}` : ""}
        </span>
      );
    }
    return null;
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => void openDialog()}>
        <Eye className="size-3.5" aria-hidden="true" />
        Verifikasi
        {payment.proofUploaded ? null : <Badge variant="warning" className="ml-1">Tanpa bukti</Badge>}
      </Button>

      {open && (
        <div data-admin-portal className="fixed inset-0 z-[300] flex items-center justify-center bg-[#09271d]/60 p-4 backdrop-blur-[3px]" role="alertdialog" aria-modal="true" aria-label={`Verifikasi pembayaran ${payment.providerOrderId}`} onKeyDown={keepFocusInDialog}>
          <div ref={dialogRef} className="w-full max-w-lg overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white shadow-[0_30px_90px_rgba(4,42,29,.32)] dark:border-[#303030] dark:bg-[#0d0d0d] dark:text-white">
            <div className="border-b border-[#e8efeb] p-4 dark:border-[#303030] sm:p-5">
              <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#718078] dark:text-[#a3a3a3]">Verifikasi transfer bank</p>
              <h2 className="m-0 mt-1 text-base font-black text-[#15211d] dark:text-white">{payment.businessName}</h2>
              <p className="m-0 mt-1 font-mono text-xs text-[#627069] dark:text-[#a3a3a3]">{payment.providerOrderId} · {formatRupiah(payment.amount)}</p>
              <p className="m-0 mt-1 text-xs text-[#627069] dark:text-[#a3a3a3]">
                Pengirim: {payment.senderBank ?? "-"} · {payment.senderAccountName ?? "-"}
              </p>
            </div>

            <div className="max-h-[50dvh] overflow-y-auto p-4 sm:p-5">
              {message && (
                <p role={message.type === "error" ? "alert" : "status"} className={`mb-3 rounded-xl border px-3 py-2 text-xs font-bold ${message.type === "success" ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348] dark:border-[#245f42] dark:bg-[#16362a] dark:text-[#62d6a5]" : "border-[#f3c8c4] bg-[#fff2f1] text-[#a4382f] dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"}`}>
                  {message.text}
                </p>
              )}

              {loadingProof && <p className="m-0 text-xs text-[#627069] dark:text-[#a3a3a3]">Memuat bukti transfer…</p>}
              {!loadingProof && !proof && (
                <p className="m-0 rounded-xl bg-[#fff8ef] px-3 py-2 text-xs text-[#8c5b24] dark:bg-amber-400/10 dark:text-amber-200">
                  {payment.proofUploaded ? "Bukti belum dapat dimuat. Coba lagi." : "Owner belum mengunggah bukti transfer. Verifikasi approve membutuhkan bukti."}
                </p>
              )}
              {proof && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proof.proofDataUrl} alt={`Bukti transfer ${payment.providerOrderId}`} className="max-h-80 w-full rounded-xl border border-[#dfe8e3] object-contain dark:border-[#303030]" />
              )}

              <label className="mt-4 block text-xs font-bold text-[#34443d] dark:text-[#d4d4d4]" htmlFor={`verify-note-${payment.id}`}>
                Catatan verifikasi (wajib bila menolak)
              </label>
              <textarea
                ref={noteRef}
                id={`verify-note-${payment.id}`}
                value={note}
                maxLength={500}
                rows={3}
                placeholder="Contoh: nominal tidak sesuai / bukti tidak terbaca"
                onChange={(event) => setNote(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3 py-2 text-sm text-[#15211d] outline-none placeholder:text-[#82928a] focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10 dark:border-[#303030] dark:bg-[#101010] dark:text-white dark:placeholder:text-[#737373] dark:focus:border-[#62d6a5] dark:focus:ring-[#62d6a5]/25"
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-[#e8efeb] p-4 dark:border-[#303030] sm:flex-row sm:justify-end sm:p-5">
              <Button type="button" variant="outline" size="sm" onClick={closeDialog} disabled={Boolean(pending)}>
                Tutup
              </Button>
              <Button type="button" variant="destructive" size="sm" disabled={Boolean(pending)} onClick={() => void verify("reject")}>
                {pending === "reject" ? <LoaderCircle className="animate-spin" /> : <XCircle />}
                Tolak
              </Button>
              <Button type="button" size="sm" disabled={Boolean(pending) || !payment.proofUploaded} onClick={() => void verify("approve")}>
                {pending === "approve" ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
                Setujui & Aktifkan
              </Button>
            </div>

            <p className="flex items-center gap-1.5 px-4 pb-4 text-[11px] text-[#82928a] dark:text-[#a3a3a3] sm:px-5">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Menyetujui mengaktifkan paket 1 tahun untuk usaha ini.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
