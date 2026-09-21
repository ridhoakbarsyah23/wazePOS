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
  const minimumHeightMm = paperSize === "58mm" ? 120 : 110;
  const baseHeightMm = paperSize === "58mm" ? 92 : 84;
  const itemHeightMm = paperSize === "58mm" ? 11 : 9;
  const optionalHeightMm =
    (options.hasDiscount ? 5 : 0) + (options.isVoided ? 16 : 0);

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
