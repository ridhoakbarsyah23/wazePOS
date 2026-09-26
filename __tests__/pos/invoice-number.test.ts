import { describe, expect, it } from "vitest";

import { formatInvoiceNumber, invoiceCounterDateKey } from "@/server/pos/invoice-number";

describe("formatInvoiceNumber", () => {
  it("membentuk format INV-YYYYMMDD-NNNN dengan nomor antrian 4 digit", () => {
    expect(formatInvoiceNumber("20260924", 1)).toBe("INV-20260924-0001");
    expect(formatInvoiceNumber("20260924", 7)).toBe("INV-20260924-0007");
    expect(formatInvoiceNumber("20260924", 128)).toBe("INV-20260924-0128");
  });

  it("tetap memuat nomor antrian lebih dari 4 digit tanpa dipotong", () => {
    expect(formatInvoiceNumber("20260924", 12_345)).toBe("INV-20260924-12345");
  });
});

describe("invoiceCounterDateKey", () => {
  it("mengembalikan kunci YYYYMMDD zona Asia/Jakarta", () => {
    // 2026-09-24T22:00:00Z = 2026-09-25 05:00 WIB → kunci tanggal berikutnya.
    expect(invoiceCounterDateKey(new Date("2026-09-24T22:00:00.000Z"))).toBe("20260925");
    // 2026-09-24T16:59:59Z = 2026-09-24 23:59 WIB.
    expect(invoiceCounterDateKey(new Date("2026-09-24T16:59:59.000Z"))).toBe("20260924");
  });
});
