import { describe, expect, it } from "vitest";

import {
  buildSaleFilterQuery,
  parsePageParam,
  parseSaleFilterParams,
} from "@/lib/pos/sale-filters";

describe("parsePageParam", () => {
  it("mengembalikan 1 untuk input tidak valid atau negatif", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-3")).toBe(1);
  });

  it("mengembalikan nomor halaman yang valid", () => {
    expect(parsePageParam("4")).toBe(4);
    expect(parsePageParam("01")).toBe(1);
  });
});

describe("parseSaleFilterParams", () => {
  const now = new Date("2026-09-23T10:00:00+07:00");

  it("memakai 30 hari terakhir (zona Jakarta) sebagai default", () => {
    const parsed = parseSaleFilterParams({}, now);
    expect(parsed.fromKey).toBe("2026-08-25");
    expect(parsed.toKey).toBe("2026-09-23");
    expect(parsed.paymentMethod).toBeNull();
    expect(parsed.transactionStatus).toBeNull();
    expect(parsed.invoiceQuery).toBe("");
    expect(parsed.currentPage).toBe(1);
  });

  it("memvalidasi payment & status yang dikenal, mengabaikan yang tidak dikenal", () => {
    const parsed = parseSaleFilterParams({ payment: "qris", status: "voided" }, now);
    expect(parsed.paymentMethod).toBe("qris");
    expect(parsed.transactionStatus).toBe("voided");

    const invalid = parseSaleFilterParams({ payment: "crypto", status: "hacked" }, now);
    expect(invalid.paymentMethod).toBeNull();
    expect(invalid.transactionStatus).toBeNull();
  });

  it("memotong dan membersihkan query invoice maksimal 80 karakter", () => {
    const parsed = parseSaleFilterParams({ q: "  INV-2026  " }, now);
    expect(parsed.invoiceQuery).toBe("INV-2026");
    expect(parseSaleFilterParams({ q: "x".repeat(120) }, now).invoiceQuery).toHaveLength(80);
  });

  it("mendukung param legacy `date` (satu hari) dari laporan lama", () => {
    const parsed = parseSaleFilterParams({ date: "2026-09-01" }, now);
    expect(parsed.fromKey).toBe("2026-09-01");
    expect(parsed.toKey).toBe("2026-09-01");
  });

  it("rentang start/end konsisten dengan fromKey/toKey (hari Jakarta penuh)", () => {
    const parsed = parseSaleFilterParams({ from: "2026-09-01", to: "2026-09-03" }, now);
    expect(parsed.start.toISOString()).toBe("2026-08-31T17:00:00.000Z"); // 2026-09-01 00:00 WIB
    expect(parsed.end.toISOString()).toBe("2026-09-03T17:00:00.000Z"); // 2026-09-04 00:00 WIB (eksklusif)
  });
});

describe("buildSaleFilterQuery", () => {
  const parsed = parseSaleFilterParams({
    from: "2026-09-01",
    to: "2026-09-07",
    payment: "cash",
    status: "completed",
    q: "INV-1",
  });

  it("mempertahankan seluruh filter aktif termasuk to", () => {
    const search = buildSaleFilterQuery(parsed, { outletId: "outlet-1" });
    expect(search.get("from")).toBe("2026-09-01");
    expect(search.get("to")).toBe("2026-09-07");
    expect(search.get("payment")).toBe("cash");
    expect(search.get("status")).toBe("completed");
    expect(search.get("q")).toBe("INV-1");
    expect(search.get("outlet")).toBe("outlet-1");
  });

  it("menghilangkan param yang tidak aktif", () => {
    const empty = parseSaleFilterParams({});
    const search = buildSaleFilterQuery(empty);
    expect(search.has("payment")).toBe(false);
    expect(search.has("status")).toBe(false);
    expect(search.has("q")).toBe(false);
    expect(search.has("outlet")).toBe(false);
    // from & to selalu ada (dibutuhkan route ekspor)
    expect(search.has("from")).toBe(true);
    expect(search.has("to")).toBe(true);
  });
});
