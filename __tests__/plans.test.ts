import { describe, expect, it } from "vitest";
import {
  formatPlanAnnualPrice,
  getMarketingPlanCards,
  getPlanFeatureComparison,
  hasPlanFeature,
  plans,
} from "@/lib/plans";

describe("hak fitur paket", () => {
  it("QRIS hanya untuk Paket Bisnis, Tumbuh tetap tunai saja", () => {
    expect(hasPlanFeature("tumbuh", "qrisPayments")).toBe(false);
    expect(hasPlanFeature("bisnis", "qrisPayments")).toBe(true);
  });

  it("mempertahankan metode kartu hanya untuk Paket Bisnis", () => {
    expect(hasPlanFeature("tumbuh", "allPaymentMethods")).toBe(false);
    expect(hasPlanFeature("bisnis", "allPaymentMethods")).toBe(true);
  });

  it("membentuk harga dan kapasitas pemasaran dari konfigurasi paket", () => {
    const cards = Object.fromEntries(getMarketingPlanCards().map((plan) => [plan.id, plan]));

    expect(cards.tumbuh.price).toBe(formatPlanAnnualPrice("tumbuh"));
    expect(cards.bisnis.price).toBe(formatPlanAnnualPrice("bisnis"));
    expect(cards.tumbuh.features).toContain(`Maksimal ${plans.tumbuh.limits.maxOutlets} gerai aktif`);
    expect(cards.tumbuh.features).toContain(`Hingga ${plans.tumbuh.limits.maxProducts} produk aktif`);
    expect(cards.bisnis.features).toContain(`Hingga ${plans.bisnis.limits.maxOutlets} gerai / multi-cabang`);
  });

  it("menyamakan tabel perbandingan dengan hak fitur paket", () => {
    const items = getPlanFeatureComparison().flatMap((group) => group.items);
    const qris = items.find((item) => item.name === "Pembayaran QRIS");
    const cardPayments = items.find((item) => item.name === "Seluruh metode pembayaran (Kartu EDC)");
    const reportExport = items.find((item) => item.name === "Ekspor laporan Excel");

    expect(qris?.availability).toEqual({ tumbuh: false, bisnis: true });
    expect(cardPayments?.availability).toEqual({ tumbuh: false, bisnis: true });
    expect(reportExport?.availability).toEqual({ tumbuh: false, bisnis: true });
  });
});
