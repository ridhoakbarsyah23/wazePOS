"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

export type PaperSize = "58mm" | "80mm";

export function PrintButton() {
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wazepos_receipt_paper_size");
      if (saved === "58mm" || saved === "80mm") return saved as PaperSize;
    }
    return "58mm";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-receipt-paper", paperSize);
  }, [paperSize]);

  function changePaperSize(size: PaperSize) {
    setPaperSize(size);
    localStorage.setItem("wazepos_receipt_paper_size", size);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <div
        className="flex items-center rounded-xl border border-[#dfe8e3] bg-white p-0.5 text-xs font-bold text-[#627069] shadow-xs"
        title="Pilih ukuran kertas printer kasir"
      >
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
  );
}
