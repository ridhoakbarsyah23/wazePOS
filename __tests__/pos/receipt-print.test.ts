import { describe, expect, it } from "vitest";
import { getReceiptPrintPage } from "@/lib/pos/receipt-print";

describe("ukuran halaman cetak struk", () => {
  it("menggunakan lebar printer yang dipilih", () => {
    expect(getReceiptPrintPage("58mm", 2).pageWidthMm).toBe(58);
    expect(getReceiptPrintPage("80mm", 2).pageWidthMm).toBe(80);
    expect(getReceiptPrintPage("a4", 2).pageSizeCss).toBe("A4 portrait");
  });

  it("menambah tinggi halaman sesuai jumlah item", () => {
    expect(getReceiptPrintPage("58mm", 12).pageHeightMm).toBeGreaterThan(
      getReceiptPrintPage("58mm", 2).pageHeightMm,
    );
  });

  it("menyediakan ruang tambahan untuk diskon dan status void", () => {
    const normal = getReceiptPrintPage("80mm", 4);
    const detailed = getReceiptPrintPage("80mm", 4, {
      hasDiscount: true,
      isVoided: true,
    });

    expect(detailed.pageHeightMm).toBeGreaterThan(normal.pageHeightMm);
  });
});
