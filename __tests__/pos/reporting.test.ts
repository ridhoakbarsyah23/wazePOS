import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { hasPlanFeature } from "@/lib/billing/plans";
import {
  createSalesReportCsv,
  createSalesReportWorkbook,
  formatReportRange,
  getReportDateRange,
  getReportDayRange,
} from "@/lib/pos/reporting";

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

  it("membuat rentang tanggal Jakarta yang inklusif", () => {
    const range = getReportDateRange("2026-09-01", "2026-09-19");

    expect(range.start.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-09-19T17:00:00.000Z");
    expect(formatReportRange(range.fromKey, range.toKey)).toContain("September 2026");
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

  it("membuat workbook Excel dengan ringkasan dan detail transaksi", async () => {
    const buffer = await createSalesReportWorkbook({
      rows: [
        {
          invoiceNumber: "=CMD()",
          outletName: "Gerai Pusat",
          paymentMethod: "cash",
          status: "completed",
          subtotal: 25_000,
          discount: 2_000,
          total: 23_000,
          paidAmount: 25_000,
          changeAmount: 2_000,
          createdAt: "2026-09-19T03:15:30.000Z",
        },
      ],
      businessName: "Antigravity Coffee",
      periodLabel: "19 September 2026",
      outletLabel: "Semua Gerai",
      paymentFilter: "Semua metode",
      statusFilter: "Semua status",
    });
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    expect(buffer.byteLength).toBeGreaterThan(1_000);

    const archive = unzipSync(buffer);
    const workbookXml = strFromU8(archive["xl/workbook.xml"]);
    const detailXml = strFromU8(archive["xl/worksheets/sheet2.xml"]);
    expect(workbookXml).toContain('name="Ringkasan"');
    expect(workbookXml).toContain('name="Detail Transaksi"');
    expect(detailXml).not.toContain("<f>");
  });
});
