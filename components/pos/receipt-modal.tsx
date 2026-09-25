"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CheckCircle2, ChevronDown, MessageSquareShare, PlusCircle, Printer, ReceiptText, Send, X } from "lucide-react";
import { getReceiptPrintPage, type ReceiptPaperSize } from "@/lib/pos/receipt-print";
import { normalizeReceiptSettings, type ReceiptSettings } from "@/lib/validation/receipt-settings";
import { DEFAULT_RECEIPT_DISCLAIMER, DEFAULT_RECEIPT_FOOTER } from "@/lib/validation/receipt-settings";
import { paymentLabel } from "@/lib/billing/payment";
import { buildReceiptWhatsAppMessage, type ReceiptShareData } from "@/components/marketing/whatsapp-share-button";

export type PaperSize = ReceiptPaperSize;

export function ReceiptModal({
  isOpen,
  onClose,
  receipt,
  receiptSettings,
}: {
  isOpen: boolean;
  onClose: () => void;
  receipt: (ReceiptShareData & { cashierName?: string }) | null;
  receiptSettings?: ReceiptSettings | null;
}) {
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wazepos_receipt_layout_v2");
      if (saved === "a4" || saved === "58mm" || saved === "80mm") return saved;
    }
    return "a4";
  });

  const settings = normalizeReceiptSettings(receiptSettings);
  const [customerPhone, setCustomerPhone] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.documentElement.setAttribute("data-receipt-paper", paperSize);
    }
  }, [isOpen, paperSize]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => primaryActionRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  function changePaperSize(size: PaperSize) {
    setPaperSize(size);
    localStorage.setItem("wazepos_receipt_layout_v2", size);
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
      const isActionActive = activeEl?.tagName === "BUTTON" || activeEl?.tagName === "A";

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

      if ((e.key === "Enter" || e.key === " ") && !isInputActive && !isActionActive) {
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
  const printPage = getReceiptPrintPage(paperSize, receipt.items.length, {
    hasDiscount: Boolean(receipt.discount),
  });
  const isA4Print = paperSize === "a4";

  // Portal ke document.body agar #pos-print-root menjadi anak langsung <body>.
  // CSS print menyembunyikan semua anak body selain #pos-print-root — jika modal
  // dirender nested di dalam layout, ia ikut ter-hide dan hasil cetak kosong.
  return createPortal(
    <>
      {/* Printable CSS style specifically for POS print */}
      <style>{`
        @media print {
          @page {
            size: ${printPage.pageSizeCss};
            margin: ${printPage.pageMarginCss};
          }
          html,
          body {
            ${isA4Print
              ? "width: auto !important; min-width: 0 !important;"
              : `width: ${printPage.pageWidthMm}mm !important; min-width: ${printPage.pageWidthMm}mm !important;`}
            min-height: 0 !important;
          }
          body {
            background-color: ${isA4Print ? "#f2f8f5" : "#ffffff"} !important;
            color: #15211d !important;
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
            background: ${isA4Print ? "#f2f8f5" : "none"} !important;
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
            box-sizing: border-box !important;
            width: ${printPage.receiptWidthMm}mm !important;
            max-width: none !important;
            margin: ${isA4Print ? "0 auto" : "0"} !important;
            padding: ${printPage.receiptPaddingCss} !important;
            box-shadow: ${isA4Print ? "0 3mm 12mm rgba(20, 93, 67, 0.12)" : "none"} !important;
            border: ${isA4Print ? "1px solid #cfe1d8" : "none"} !important;
            border-radius: ${isA4Print ? "5mm" : "0"} !important;
            background: #ffffff !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          }
          html[data-receipt-paper="a4"] .thermal-receipt-printable {
            font-size: 12px !important;
            line-height: 1.45 !important;
          }
          html[data-receipt-paper="58mm"] .thermal-receipt-printable {
            font-size: 10px !important;
            line-height: 1.3 !important;
          }
          html[data-receipt-paper="80mm"] .thermal-receipt-printable {
            font-size: 12px !important;
            line-height: 1.4 !important;
          }
          .thermal-receipt-printable > div,
          .thermal-receipt-printable .flex {
            break-inside: avoid !important;
          }
          .receipt-brand-block {
            background: #eaf7f0 !important;
            border: 1px solid #bcdcca !important;
            border-radius: 3mm !important;
            padding: 4mm 3mm !important;
          }
          .receipt-brand-accent,
          .receipt-grand-total span:last-child,
          .receipt-change-row {
            color: #137a55 !important;
          }
          .receipt-meta-block {
            border-color: #cfe1d8 !important;
          }
          .receipt-grand-total {
            margin-top: 2mm !important;
            border-radius: 2mm !important;
            background: #eaf7f0 !important;
            padding: 2.5mm !important;
          }
          .receipt-footer-block {
            border-color: #cfe1d8 !important;
            border-radius: 2mm !important;
            background: #f7faf8 !important;
            padding: 3mm !important;
          }
          .print-hidden-element {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Backdrop & Modal */}
      <div
        id="pos-print-root"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-xs animate-fade-in sm:p-4"
      >
        <div
          id="receipt-print-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-success-title"
          className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl border border-[#d9e3de] bg-white shadow-[0_24px_70px_rgba(5,35,25,.28)]"
        >
          {/* Tombol tutup — tidak ikut tercetak */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup struk"
            title="Tutup (Esc)"
            className="print-hidden-element absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full border border-[#d9e2dd] bg-white text-[#627069] transition hover:bg-[#f3f6f4] hover:text-[#15211d] active:scale-95"
          >
            <X className="size-4.5" />
          </button>

          <header className="border-b border-[#dfe7e3] bg-[#f3faf6] p-4 pr-14 print-hidden-element sm:p-5 sm:pr-14">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#187c59] text-white">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 id="receipt-success-title" className="text-base font-bold text-[#17211d]">Transaksi berhasil</h3>
                <p className="mt-0.5 truncate text-xs text-[#68766f]">{receipt.invoiceNumber}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 divide-x divide-[#dbe7e0] border border-[#cfe1d8] bg-white">
              <div className="px-3 py-2.5">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#78857f]">Total</span>
                <strong className="mt-0.5 block text-base text-[#17211d]">{money(receipt.total)}</strong>
              </div>
              <div className="px-3 py-2.5">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#78857f]">
                  {receipt.paymentMethod === "cash"
                    ? receipt.changeAmount > 0
                      ? "Kembalian"
                      : "Pembayaran"
                    : "Pembayaran"}
                </span>
                <strong className="mt-0.5 block text-base text-[#187c59]">
                  {receipt.paymentMethod === "cash"
                    ? receipt.changeAmount > 0
                      ? money(receipt.changeAmount)
                      : "Uang pas"
                    : paymentLabel(receipt.paymentMethod)}
                </strong>
              </div>
            </div>
          </header>

          <div id="receipt-print-area" className="max-h-[55vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between gap-3 print-hidden-element">
              <button
                type="button"
                aria-expanded={previewOpen}
                onClick={() => setPreviewOpen((current) => !current)}
                className="inline-flex h-9 items-center gap-2 text-xs font-semibold text-[#44534c] hover:text-[#187c59]"
              >
                <ReceiptText className="size-4 text-[#187c59]" />
                {previewOpen ? "Tutup rincian" : "Lihat rincian struk"}
                <ChevronDown className={`size-3.5 transition-transform ${previewOpen ? "rotate-180" : ""}`} />
              </button>
              <div className="flex rounded-lg border border-[#d9e2dd] bg-[#f7f9f8] p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => changePaperSize("a4")}
                  aria-pressed={paperSize === "a4"}
                  className={`rounded-md px-2.5 py-1 transition ${
                    paperSize === "a4" ? "bg-[#187c59] text-white" : "text-[#68766f]"
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => changePaperSize("58mm")}
                  aria-pressed={paperSize === "58mm"}
                  className={`rounded-md px-2.5 py-1 transition ${
                    paperSize === "58mm" ? "bg-[#187c59] text-white" : "text-[#68766f]"
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => changePaperSize("80mm")}
                  aria-pressed={paperSize === "80mm"}
                  className={`rounded-md px-2.5 py-1 transition ${
                    paperSize === "80mm" ? "bg-[#187c59] text-white" : "text-[#68766f]"
                  }`}
                >
                  80mm
                </button>
              </div>
            </div>

            {/* Receipt Preview (Also used for direct printing) */}
            <div
              className={`thermal-receipt-printable mx-auto border border-dashed border-[#cddbd3] bg-[#fafcfb] p-4 text-[#15211d] transition-all ${previewOpen ? "mt-3 block" : "hidden"} ${
                paperSize === "58mm" ? "max-w-[280px] text-xs" : "max-w-[360px] text-sm"
              }`}
            >
              <div className="receipt-brand-block rounded-xl border border-[#d5e9df] bg-[#edf8f2] px-3 py-3 text-center">
                {settings.showLogo && (
                  <h4 className="text-base font-black tracking-tight">
                    waze<span className="receipt-brand-accent text-[#198760]">POS</span>
                  </h4>
                )}
                <p className="font-bold text-xs mt-0.5">{receipt.businessName}</p>
                {receipt.outletName !== receipt.businessName && (
                  <p className="text-[11px] text-[#627069]">{receipt.outletName}</p>
                )}
                {settings.headerNote && <p className="m-0 mt-1 text-[10px] text-[#627069]">{settings.headerNote}</p>}
              </div>

              <div className="receipt-meta-block flex justify-between border-b border-dashed border-[#cddbd3] py-2 text-[11px] text-[#627069]">
                <div>
                  <p className="m-0 font-bold text-[#15211d]">{receipt.invoiceNumber}</p>
                  {settings.showDateTime && (
                    <p className="m-0 text-[10px]">
                      {new Date(receipt.createdAt).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                </div>
                {settings.showCashier && (
                  <div className="text-right">
                    <p className="m-0">Kasir</p>
                    <p className="m-0 font-bold text-[#15211d]">{receipt.cashierName || "Kasir Toko"}</p>
                  </div>
                )}
              </div>

              {receipt.customerName && (
                <div className="flex items-center justify-between border-b border-dashed border-[#cddbd3] py-2 text-[11px] text-[#627069]">
                  <span>Member</span>
                  <strong className="text-[#15211d]">{receipt.customerName}</strong>
                </div>
              )}

              {/* Items List */}
              <div className="receipt-items-block space-y-1.5 py-2.5">
                {receipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between gap-2 text-xs">
                    <div>
                      <p className="m-0 font-semibold">{item.name}</p>
                      {settings.showUnitPrice && (
                        <p className="m-0 text-[10px] text-[#627069]">
                          {item.quantity} × {money(item.unitPrice)}
                        </p>
                      )}
                    </div>
                    <strong className="text-right">{money(item.subtotal)}</strong>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="receipt-totals-block space-y-1 border-t border-dashed border-[#cddbd3] pt-2 text-xs">
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
                <div className="receipt-grand-total flex justify-between bg-[#edf8f2] px-2.5 py-2 text-sm font-extrabold text-[#15211d]">
                  <span>TOTAL</span>
                  <span className="text-[#198760]">{money(receipt.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#627069] pt-1">
                  <span>{paymentLabel(receipt.paymentMethod)}</span>
                  <span>Dibayar {money(receipt.paidAmount)}</span>
                </div>
                {receipt.paymentMethod === "cash" && (
                  <div className="receipt-change-row flex justify-between text-xs font-bold text-[#198760]">
                    <span>Kembalian</span>
                    <span>{money(receipt.changeAmount)}</span>
                  </div>
                )}
              </div>

              {(settings.footerMessage === "thankYou" || settings.footerNote) && (
                <div className="receipt-footer-block mt-3 rounded-lg border-t border-dashed border-[#cddbd3] bg-[#f7faf8] px-2 py-2.5 text-center text-[10px] text-[#627069]">
                  {settings.footerMessage === "thankYou" && (
                    <>
                      <p className="m-0">{DEFAULT_RECEIPT_FOOTER}</p>
                      <p className="m-0 text-[9px] text-[#8b9991]">{DEFAULT_RECEIPT_DISCLAIMER}</p>
                    </>
                  )}
                  {settings.footerNote && <p className="m-0 mt-0.5">{settings.footerNote}</p>}
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-[#e5ebe8] pt-4 print-hidden-element">
              <label htmlFor="receipt-customer-phone" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#44534c]">
                <MessageSquareShare className="size-3.5 text-[#1a8e48]" />
                Kirim struk melalui WhatsApp
              </label>
              <div className="flex gap-2">
                <input
                  id="receipt-customer-phone"
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Nomor WhatsApp (opsional)"
                  className="h-10 min-w-0 flex-1 border border-[#cfd9d4] px-3 text-xs outline-none focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
                />
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 bg-[#1fa855] px-3.5 text-xs font-bold text-white transition hover:bg-[#198d48] active:scale-[0.98]"
                >
                  <Send className="size-3.5" />
                  <span>Kirim</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[#dfe8e3] bg-[#f8faf9] p-4 print-hidden-element">
            <button
              type="button"
              onClick={handlePrint}
              title="Cetak struk (P)"
              className="inline-flex h-10 items-center justify-center gap-1.5 border border-[#b9cbc2] bg-white px-3 text-xs font-semibold text-[#187c59] transition hover:bg-[#edf7f2] active:scale-[0.98]"
            >
              <Printer className="size-4" />
              <span>Cetak</span>
            </button>

            <button
              ref={primaryActionRef}
              type="button"
              onClick={onClose}
              title="Mulai transaksi baru (Enter atau Space)"
              className="inline-flex h-10 items-center justify-center gap-1.5 bg-[#187c59] px-3 text-xs font-bold text-white transition hover:bg-[#126a4b] focus:outline-none focus:ring-2 focus:ring-[#187c59]/25 focus:ring-offset-2 active:scale-[0.98]"
            >
              <PlusCircle className="size-4" />
              <span>Transaksi baru</span>
            </button>

            <a
              href={`/sales/${receipt.saleId}`}
              className="col-span-2 inline-flex items-center justify-center gap-1 py-1 text-xs font-medium text-[#68766f] hover:text-[#187c59]"
            >
              Lihat nota lengkap <ArrowRight className="size-3" />
            </a>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}
