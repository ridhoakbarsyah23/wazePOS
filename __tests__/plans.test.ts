import { describe, expect, it } from "vitest";
import { hasPlanFeature } from "@/lib/plans";

describe("hak fitur paket", () => {
  it("mewajibkan manajemen shift hanya untuk Paket Bisnis", () => {
    expect(hasPlanFeature("tumbuh", "shiftManagement")).toBe(false);
    expect(hasPlanFeature("bisnis", "shiftManagement")).toBe(true);
  });

  it("menonaktifkan QRIS sampai integrasi pembayaran resmi tersedia", () => {
    expect(hasPlanFeature("tumbuh", "qrisPayments")).toBe(false);
    expect(hasPlanFeature("bisnis", "qrisPayments")).toBe(false);
  });

  it("mempertahankan metode kartu hanya untuk Paket Bisnis", () => {
    expect(hasPlanFeature("tumbuh", "allPaymentMethods")).toBe(false);
    expect(hasPlanFeature("bisnis", "allPaymentMethods")).toBe(true);
  });
});
