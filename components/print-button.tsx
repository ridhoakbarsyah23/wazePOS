"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { getReceiptPrintPage, type ReceiptPaperSize } from "@/lib/receipt-print";

export type PaperSize = ReceiptPaperSize;

export function PrintButton({
  itemCount,
  hasDiscount = false,
  isVoided = false,
}: {
  itemCount: number;
  hasDiscount?: boolean;
  isVoided?: boolean;
}) {
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wazepos_receipt_layout_v2");
      if (saved === "a4" || saved === "58mm" || saved === "80mm") return saved;
    }
    return "a4";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-receipt-paper", paperSize);
  }, [paperSize]);

  function changePaperSize(size: PaperSize) {
    setPaperSize(size);
    localStorage.setItem("wazepos_receipt_layout_v2", size);
  }

  function handlePrint() {
    window.print();
  }

  const printPage = getReceiptPrintPage(paperSize, itemCount, {
    hasDiscount,
    isVoided,
  });
  const isA4Print = paperSize === "a4";

  return (
    <>
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
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Samakan latar halaman agar tidak menambah area cetak ekstra */
          html {
            background: #ffffff !important;
          }
          main {
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          /* Batasi konten yang dicetak hanya pada struk */
          body > main > div > .print\\:hidden {
            display: none !important;
          }
          .thermal-receipt {
            box-sizing: border-box !important;
            width: ${printPage.receiptWidthMm}mm !important;
            max-width: none !important;
            margin: ${isA4Print ? "0 auto" : "0"} !important;
            padding: ${printPage.receiptPaddingCss} !important;
            border: ${isA4Print ? "1px solid #cfe1d8" : "none"} !important;
            border-radius: ${isA4Print ? "5mm" : "0"} !important;
            background: #ffffff !important;
            box-shadow: ${isA4Print ? "0 3mm 12mm rgba(20, 93, 67, 0.12)" : "none"} !important;
          }
        }
      `}</style>
      <div className="flex items-center gap-2 print:hidden">
        <div
          className="flex items-center rounded-xl border border-[#dfe8e3] bg-white p-0.5 text-xs font-bold text-[#627069] shadow-xs"
          title="Pilih format cetak struk"
        >
          <button
            type="button"
            onClick={() => changePaperSize("a4")}
            className={`rounded-lg px-2.5 py-1.5 transition ${
              paperSize === "a4"
                ? "bg-[#198760] text-white shadow-xs"
                : "hover:text-[#15211d]"
            }`}
            title="PDF A4 berwarna"
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => changePaperSize("58mm")}
            className={`rounded-lg px-2.5 py-1.5 transition ${
              paperSize === "58mm"
                ? "bg-[#198760] text-white shadow-xs"
                : "hover:text-[#15211d]"
            }`}
            title="Ukuran kertas 58mm (Printer thermal Bluetooth portabel)"
          >
            58mm
          </button>
          <button
            type="button"
            onClick={() => changePaperSize("80mm")}
            className={`rounded-lg px-2.5 py-1.5 transition ${
              paperSize === "80mm"
                ? "bg-[#198760] text-white shadow-xs"
                : "hover:text-[#15211d]"
            }`}
            title="Ukuran kertas 80mm (Printer thermal kasir meja USB / LAN)"
          >
            80mm
          </button>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#198760] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#14714f] active:scale-[0.98]"
        >
          <Printer className="size-3.5" />
          <span>Cetak Struk</span>
        </button>
      </div>
    </>
  );
}
