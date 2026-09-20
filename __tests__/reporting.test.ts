import { describe, expect, it } from "vitest";
import { hasPlanFeature } from "@/lib/plans";
import { createSalesReportCsv, getReportDayRange } from "@/lib/reporting";

describe("laporan penjualan", () => {
  it("mengubah tanggal Jakarta menjadi batas waktu UTC yang tepat", () => {
    const range = getReportDayRange("2026-09-19");

    expect(range.start.toISOString()).toBe("2026-09-18T17:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-19T17:00:00.000Z");
  });

  it("kembali ke tanggal Jakarta saat parameter tanggal tidak valid", () => {
    const range = getReportDayRange("2026-02-31", new Date("2026-09-19T02:00:00.000Z"));

    expect(range.dateKey).toBe("2026-09-19");
  });

  it("membuat CSV UTF-8 dan melindungi nilai dari formula spreadsheet", () => {
    const csv = createSalesReportCsv([
      {
        invoiceNumber: "=CMD()",
        outletName: 'Gerai "Pusat"',
        paymentMethod: "cash",
        status: "completed",
        subtotal: 25_000,
        discount: 0,
        total: 25_000,
        paidAmount: 30_000,
        changeAmount: 5_000,
        createdAt: "2026-09-19T03:15:30.000Z",
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"\'=CMD()"');
    expect(csv).toContain('"Gerai ""Pusat"""');
    expect(csv).toContain('"Tunai";"Selesai";"25000"');
  });

  it("membatasi ekspor ke Paket Bisnis", () => {
    expect(hasPlanFeature("bisnis", "exportReports")).toBe(true);
    expect(hasPlanFeature("tumbuh", "exportReports")).toBe(false);
  });
});
