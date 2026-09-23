export type ReceiptPaperSize = "a4" | "58mm" | "80mm";

export function getReceiptPrintPage(
  paperSize: ReceiptPaperSize,
  itemCount: number,
  options: { hasDiscount?: boolean; isVoided?: boolean } = {},
) {
  const safeItemCount = Math.max(1, Math.min(itemCount, 100));
  if (paperSize === "a4") {
    return {
      pageWidthMm: 210,
      pageHeightMm: 297,
      receiptWidthMm: 104,
      pageSizeCss: "A4 portrait",
      pageMarginCss: "12mm",
      receiptPaddingCss: "7mm",
    };
  }

  const widthMm = paperSize === "58mm" ? 58 : 80;
  // Base height memperhitungkan header struk terkini (logo + brand + nama
  // usaha + alamat gerai 2 baris), blok invoice, ringkasan total, pembayaran,
  // dan footer ucapan — plus buffer agar tidak perlu halaman kedua. Ukuran
  // font Tailwind (text-xs/text-sm) tetap saat print, jadi estimasi memakai
  // tinggi baris aktual, bukan font-size struk.
  const minimumHeightMm = paperSize === "58mm" ? 152 : 142;
  const baseHeightMm = paperSize === "58mm" ? 128 : 120;
  const itemHeightMm = paperSize === "58mm" ? 12 : 10;
  const optionalHeightMm =
    (options.hasDiscount ? 6 : 0) + (options.isVoided ? 18 : 0);

  return {
    pageWidthMm: widthMm,
    pageHeightMm: Math.max(
      minimumHeightMm,
      baseHeightMm + safeItemCount * itemHeightMm + optionalHeightMm,
    ),
    receiptWidthMm: widthMm,
    pageSizeCss: `${widthMm}mm ${Math.max(
      minimumHeightMm,
      baseHeightMm + safeItemCount * itemHeightMm + optionalHeightMm,
    )}mm`,
    pageMarginCss: "0",
    receiptPaddingCss: paperSize === "58mm" ? "3mm" : "4mm",
  };
}
