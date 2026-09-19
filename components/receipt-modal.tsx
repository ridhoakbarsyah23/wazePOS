"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, MessageSquareShare, Printer, Send, PlusCircle, ArrowRight, X } from "lucide-react";
import { buildReceiptWhatsAppMessage, ReceiptShareData } from "./whatsapp-share-button";

export type PaperSize = "58mm" | "80mm";

export function ReceiptModal({
  isOpen,
  onClose,
  receipt,
}: {
  isOpen: boolean;
  onClose: () => void;
  receipt: (ReceiptShareData & { cashierName?: string }) | null;
}) {
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wazepos_receipt_paper_size");
      if (saved === "58mm" || saved === "80mm") return saved as PaperSize;
    }
    return "58mm";
  });

  const [customerPhone, setCustomerPhone] = useState("");
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.documentElement.setAttribute("data-receipt-paper", paperSize);
    }
  }, [isOpen, paperSize]);

  function changePaperSize(size: PaperSize) {
    setPaperSize(size);
    localStorage.setItem("wazepos_receipt_paper_size", size);
  }

  function handlePrint() {
    window.print();
  }

  function handleSendWhatsApp() {
    if (!receipt) return;
    let cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (cleanPhone.length > 0 && !cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }

    const text = buildReceiptWhatsAppMessage(receipt, window.location.origin);
    const encodedText = encodeURIComponent(text);

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  // Keyboard shortcut inside modal
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isInputActive = activeEl?.tagName === "INPUT";

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if ((e.key === "p" || e.key === "P") && !isInputActive && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlePrint();
        return;
      }

      if ((e.key === "Enter" || e.key === " ") && !isInputActive) {
        e.preventDefault();
        onClose();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !receipt) return null;

  const money = (val: number) => `Rp ${Number(val).toLocaleString("id-ID")}`;

  // Portal ke document.body agar #pos-print-root menjadi anak langsung <body>.
  // CSS print menyembunyikan semua anak body selain #pos-print-root — jika modal
  // dirender nested di dalam layout, ia ikut ter-hide dan hasil cetak kosong.
  return createPortal(
    <>
      {/* Printable CSS style specifically for POS print */}
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Hide everything outside modal receipt when printing */
          body > *:not(#pos-print-root) {
            display: none !important;
          }
          /* Reset wrapper overlay & kartu modal agar struk tercetak penuh */
          #pos-print-root {
            position: static !important;
            display: block !important;
            background: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            z-index: auto !important;
            animation: none !important;
          }
          #receipt-print-card,
          #receipt-print-area {
            position: static !important;
            max-width: none !important;
            max-height: none !important;
            width: auto !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .thermal-receipt-printable {
            display: block !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 4px 6px !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          }
          html[data-receipt-paper="58mm"] .thermal-receipt-printable {
            max-width: 58mm !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
          html[data-receipt-paper="80mm"] .thermal-receipt-printable {
            max-width: 80mm !important;
            font-size: 13px !important;
            line-height: 1.35 !important;
          }
          .print-hidden-element {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Backdrop & Modal */}
      <div
        id="pos-print-root"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-xs animate-fade-in overflow-y-auto"
      >
        <div
          id="receipt-print-card"
          className="relative my-auto w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-[#dfe8e3] overflow-hidden"
        >
          {/* Tombol tutup — tidak ikut tercetak */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup struk"
            title="Tutup (Esc)"
            className="print-hidden-element absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-[#627069] shadow-sm border border-[#dfe8e3] backdrop-blur-xs transition hover:bg-[#f0f4f1] hover:text-[#15211d] active:scale-95"
          >
            <X className="size-4.5" />
          </button>

          {/* Success Banner */}
          <div className="bg-gradient-to-b from-[#eaf7f0] to-[#f4faf7] p-5 text-center border-b border-[#cae8d9] print-hidden-element">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#198760] text-white shadow-md">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="mt-2 text-lg font-black text-[#15211d]">Transaksi Berhasil Disimpan</h3>
            <p className="text-xs text-[#627069] mt-0.5">Invoice #{receipt.invoiceNumber}</p>

            {/* Big Change Display */}
            <div className="mt-3 inline-block rounded-2xl bg-white px-5 py-2.5 shadow-xs border border-[#cae8d9]">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#627069]">
                {receipt.paymentMethod === "cash"
                  ? receipt.changeAmount > 0
                    ? "Kembalian Kasir"
                    : "Uang Pas (Lunas)"
                  : `Lunas via ${receipt.paymentMethod.toUpperCase()}`}
              </span>
              <span className="text-2xl font-black text-[#198760]">
                {receipt.paymentMethod === "cash"
                  ? money(receipt.changeAmount)
                  : money(receipt.total)}
              </span>
            </div>
          </div>

          <div id="receipt-print-area" className="p-5 max-h-[60vh] overflow-y-auto">
            {/* Paper Size selector */}
            <div className="flex items-center justify-between gap-2 mb-3 print-hidden-element">
              <span className="text-xs font-bold text-[#627069]">Pratinjau Kertas Printer:</span>
              <div className="flex rounded-lg border border-[#dfe8e3] bg-[#f7faf8] p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => changePaperSize("58mm")}
                  className={`rounded-md px-2.5 py-1 transition ${
                    paperSize === "58mm" ? "bg-[#198760] text-white shadow-2xs" : "text-[#627069]"
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => changePaperSize("80mm")}
                  className={`rounded-md px-2.5 py-1 transition ${
                    paperSize === "80mm" ? "bg-[#198760] text-white shadow-2xs" : "text-[#627069]"
                  }`}
                >
                  80mm
                </button>
              </div>
            </div>

            {/* Receipt Preview (Also used for direct printing) */}
            <div
              className={`thermal-receipt-printable mx-auto rounded-xl border border-dashed border-[#cddbd3] bg-[#fafcfb] p-4 text-[#15211d] shadow-inner transition-all ${
                paperSize === "58mm" ? "max-w-[280px] text-xs" : "max-w-[360px] text-sm"
              }`}
            >
              <div className="border-b border-dashed border-[#cddbd3] pb-3 text-center">
                <h4 className="text-base font-black tracking-tight">
                  waze<span className="text-[#198760]">POS</span>
                </h4>
                <p className="font-bold text-xs mt-0.5">{receipt.businessName}</p>
                <p className="text-[11px] text-[#627069]">{receipt.outletName}</p>
              </div>

              <div className="flex justify-between border-b border-dashed border-[#cddbd3] py-2 text-[11px] text-[#627069]">
                <div>
                  <p className="m-0 font-bold text-[#15211d]">{receipt.invoiceNumber}</p>
                  <p className="m-0 text-[10px]">
                    {new Date(receipt.createdAt).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="m-0">Kasir</p>
                  <p className="m-0 font-bold text-[#15211d]">{receipt.cashierName || "Kasir Toko"}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 py-2.5">
                {receipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-2 text-xs">
                    <div>
                      <p className="m-0 font-semibold">{item.name}</p>
                      <p className="m-0 text-[10px] text-[#627069]">
                        {item.quantity} × {money(item.unitPrice)}
                      </p>
                    </div>
                    <strong className="text-right">{money(item.subtotal)}</strong>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 border-t border-dashed border-[#cddbd3] pt-2 text-xs">
                <div className="flex justify-between text-[#627069]">
                  <span>Subtotal</span>
                  <strong>{money(receipt.subtotal)}</strong>
                </div>
                {receipt.discount && receipt.discount > 0 ? (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon</span>
                    <strong>-{money(receipt.discount)}</strong>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm font-extrabold text-[#15211d] pt-1">
                  <span>TOTAL</span>
                  <span className="text-[#198760]">{money(receipt.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#627069] pt-1">
                  <span className="uppercase">{receipt.paymentMethod}</span>
                  <span>Bayar {money(receipt.paidAmount)}</span>
                </div>
                {receipt.paymentMethod === "cash" && (
                  <div className="flex justify-between text-xs font-bold text-[#198760]">
                    <span>Kembalian</span>
                    <span>{money(receipt.changeAmount)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-[#cddbd3] mt-3 pt-2 text-center text-[10px] text-[#627069]">
                <p className="m-0">Terima kasih atas kunjungan Anda!</p>
                <p className="m-0 text-[9px] text-[#8b9991]">Simpan struk ini sebagai bukti pembayaran sah.</p>
              </div>
            </div>

            {/* Send to WhatsApp Form */}
            <div className="mt-4 rounded-2xl border border-[#dfe8e3] bg-[#fbfdfc] p-3.5 print-hidden-element">
              <label className="grid gap-1 text-xs font-bold text-[#15211d]">
                <span className="flex items-center gap-1 text-[#1a8e48]">
                  <MessageSquareShare className="size-3.5" />
                  Kirim Struk ke WhatsApp Pelanggan:
                </span>
                <div className="flex gap-2 mt-1">
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08123456789 (bisa dikosongkan)"
                    className="h-10 flex-1 rounded-xl border border-[#dbe5df] px-3 text-xs focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/20"
                  />
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-[#20ba59] transition active:scale-[0.98]"
                  >
                    <Send className="size-3.5" />
                    <span>Kirim WA</span>
                  </button>
                </div>
              </label>
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dfe8e3] bg-[#f8faf9] px-5 py-3.5 print-hidden-element">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-[#198760] bg-white px-4 py-2.5 text-xs font-bold text-[#198760] shadow-xs hover:bg-[#eaf7f0] transition active:scale-[0.98]"
            >
              <Printer className="size-4" />
              <span>Cetak Struk [P]</span>
            </button>

            <div className="flex items-center gap-2">
              <a
                href={`/sales/${receipt.saleId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#627069] hover:text-[#198760]"
              >
                <span>Halaman Nota</span>
                <ArrowRight className="size-3" />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl bg-[#198760] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#14714f] transition active:scale-[0.98]"
              >
                <PlusCircle className="size-4" />
                <span>Transaksi Baru [Space]</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}
