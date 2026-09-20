import { describe, expect, it } from "vitest";
import { calculateCartTotal, calculatePayment, getQuickCashOptions } from "@/lib/pos-calculations";

describe("perhitungan POS", () => {
  it("menghitung subtotal berdasarkan harga dan jumlah barang", () => {
    expect(
      calculateCartTotal([
        { sellingPrice: 12_500, quantity: 2 },
        { sellingPrice: 8_000, quantity: 3 },
      ]),
    ).toBe(49_000);
  });

  it("menghitung pembayaran tunai, kembalian, dan kekurangan", () => {
    expect(calculatePayment(49_000, "cash", "50000")).toEqual({
      paid: 50_000,
      change: 1_000,
      shortfall: 0,
    });
    expect(calculatePayment(49_000, "cash", "40000")).toEqual({
      paid: 40_000,
      change: 0,
      shortfall: 9_000,
    });
  });

  it("menganggap pembayaran nontunai sudah dibayar sesuai total", () => {
    expect(calculatePayment(49_000, "qris", "")).toEqual({
      paid: 49_000,
      change: 0,
      shortfall: 0,
    });
  });

  it("menyediakan maksimal empat pilihan tunai terurut termasuk uang pas", () => {
    expect(getQuickCashOptions(12_500)).toEqual([12_500, 20_000, 50_000, 100_000]);
    expect(getQuickCashOptions(0)).toEqual([]);
  });
});
