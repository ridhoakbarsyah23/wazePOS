import { describe, expect, it } from "vitest";
import {
  formatPlanAnnualPrice,
  getMarketingPlanCards,
  getPlanFeatureComparison,
  hasPlanFeature,
  plans,
} from "@/shared/billing/plans";

describe("hak fitur paket", () => {
  it("menampilkan nama paket sesuai slug URL registrasi", () => {
    expect(plans.tumbuh.name).toBe("wazePOS Tumbuh");
    expect(plans.bisnis.name).toBe("wazePOS Bisnis");
  });

  it("menonaktifkan QRIS untuk seluruh paket sampai integrasi resmi tersedia", () => {
    expect(hasPlanFeature("tumbuh", "qrisPayments")).toBe(false);
    expect(hasPlanFeature("bisnis", "qrisPayments")).toBe(false);

    const cards = getMarketingPlanCards();
    expect(cards.every((plan) => plan.features.every((feature) => !feature.includes("QRIS")))).toBe(true);
  });

  it("mode gelap hanya tersedia untuk Paket Bisnis", () => {
    expect(hasPlanFeature("tumbuh", "darkMode")).toBe(false);
    expect(hasPlanFeature("bisnis", "darkMode")).toBe(true);

    const darkMode = getPlanFeatureComparison()
      .flatMap((group) => group.items)
      .find((item) => item.name === "Mode gelap dashboard");

    expect(darkMode?.availability).toEqual({ tumbuh: false, bisnis: true });
  });

  it("membatasi pengaturan struk kustom dan multi-gerai ke Paket Bisnis", () => {
    expect(hasPlanFeature("tumbuh", "receiptSettings")).toBe(false);
    expect(hasPlanFeature("bisnis", "receiptSettings")).toBe(true);
    expect(hasPlanFeature("tumbuh", "multiOutlet")).toBe(false);
    expect(hasPlanFeature("bisnis", "multiOutlet")).toBe(true);
    expect(hasPlanFeature("tumbuh", "onscreenReports")).toBe(false);
    expect(hasPlanFeature("tumbuh", "inventoryStock")).toBe(false);
    expect(hasPlanFeature("tumbuh", "staffManagement")).toBe(true);
    expect(hasPlanFeature("bisnis", "staffManagement")).toBe(true);
    expect(hasPlanFeature("tumbuh", "roleBasedAccess")).toBe(true);

    const items = getPlanFeatureComparison().flatMap((group) => group.items);
    expect(items.find((item) => item.name === "Pengaturan struk kustom")?.availability).toEqual({
      tumbuh: false,
      bisnis: true,
    });
  });

  it("mempertahankan metode kartu hanya untuk Paket Bisnis", () => {
    expect(hasPlanFeature("tumbuh", "allPaymentMethods")).toBe(false);
    expect(hasPlanFeature("bisnis", "allPaymentMethods")).toBe(true);
  });

  it("menyediakan pelanggan dan member kasir untuk Paket Tumbuh", () => {
    expect(plans.tumbuh.limits.maxCustomers).toBe(200);
    expect(hasPlanFeature("tumbuh", "customerLookup")).toBe(true);
    expect(hasPlanFeature("bisnis", "customerLookup")).toBe(true);

    const customerFeature = getPlanFeatureComparison()
      .flatMap((group) => group.items)
      .find((item) => item.name === "Pelanggan & member kasir");

    expect(customerFeature?.availability).toEqual({ tumbuh: true, bisnis: true });
  });

  it("membentuk harga dan kapasitas pemasaran dari konfigurasi paket", () => {
    const cards = Object.fromEntries(getMarketingPlanCards().map((plan) => [plan.id, plan]));

    expect(cards.tumbuh.price).toBe(formatPlanAnnualPrice("tumbuh"));
    expect(cards.bisnis.price).toBe(formatPlanAnnualPrice("bisnis"));
    expect(cards.tumbuh.features).toContain(`Maksimal ${plans.tumbuh.limits.maxOutlets} gerai aktif`);
    expect(cards.tumbuh.features).toContain(`Hingga ${plans.tumbuh.limits.maxProducts} produk aktif`);
    expect(cards.bisnis.features).toContain(`Hingga ${plans.bisnis.limits.maxOutlets} gerai / multi-cabang`);
    expect(cards.tumbuh.features).toContain("Cetak struk kasir standar 58 mm / 80 mm");
    expect(cards.tumbuh.features).toContain(`Kelola hingga ${plans.tumbuh.limits.maxCustomers} pelanggan`);
    expect(cards.tumbuh.features).toContain("Pencarian & pendaftaran member di kasir");
    expect(cards.tumbuh.features).not.toContain("Laporan penjualan harian di layar");
    expect(cards.bisnis.features).toContain("Kustomisasi pengaturan struk");
    expect(cards.tumbuh.features).not.toContain("Stok otomatis & peringatan stok menipis");
    expect(cards.tumbuh.features).not.toContain("Manajemen stok & peringatan stok menipis");
    expect(cards.bisnis.features).toContain("Manajemen stok & peringatan stok menipis");
  });

  it("mengunci arus kas hanya untuk Paket Bisnis", () => {
    expect(hasPlanFeature("tumbuh", "cashflow")).toBe(false);
    expect(hasPlanFeature("bisnis", "cashflow")).toBe(true);

    const cards = Object.fromEntries(getMarketingPlanCards().map((plan) => [plan.id, plan]));
    expect(cards.bisnis.features).toContain("Arus kas: uang masuk & keluar warung");
    expect(cards.tumbuh.features).not.toContain("Arus kas: uang masuk & keluar warung");

    const cashflow = getPlanFeatureComparison()
      .flatMap((group) => group.items)
      .find((item) => item.name === "Arus kas uang masuk & keluar");

    expect(cashflow?.availability).toEqual({ tumbuh: false, bisnis: true });
  });

  it("menyamakan tabel perbandingan dengan hak fitur paket", () => {
    const items = getPlanFeatureComparison().flatMap((group) => group.items);
    const qris = items.find((item) => item.name === "Pembayaran QRIS");
    const cardPayments = items.find((item) => item.name === "Seluruh metode pembayaran (Kartu EDC)");
    const reportExport = items.find((item) => item.name === "Ekspor laporan Excel");

    expect(qris).toBeUndefined();
    expect(cardPayments?.availability).toEqual({ tumbuh: false, bisnis: true });
    expect(reportExport?.availability).toEqual({ tumbuh: false, bisnis: true });
  });

  it("menyediakan manajemen staf untuk Paket Tumbuh dan menandai stok sebagai fitur Bisnis", () => {
    const items = getPlanFeatureComparison().flatMap((group) => group.items);
    const cutoffIndex = items.findIndex((item) => item.name === "Peran hak akses terpisah");
    const stockItem = items.find((item) => item.name === "Stok otomatis & peringatan stok");
    const staffItem = items.find((item) => item.name === "Manajemen staf & tim kasir");

    const stockIndex = items.findIndex((item) => item.name === "Stok otomatis & peringatan stok");

    expect(cutoffIndex).toBeGreaterThanOrEqual(0);
    expect(stockIndex).toBeGreaterThanOrEqual(0);
    expect(items.slice(0, stockIndex).every((item) => item.availability.tumbuh)).toBe(true);
    expect(items[cutoffIndex].availability.tumbuh).toBe(true);
    expect(stockItem?.availability).toEqual({ tumbuh: false, bisnis: true });
    expect(staffItem?.availability).toEqual({ tumbuh: true, bisnis: true });
    expect(items.slice(cutoffIndex + 1).every((item) => !item.availability.tumbuh)).toBe(true);
  });
});
