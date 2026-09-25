import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSaleRequestId,
  createSaleRequestFingerprint,
  getOrCreateSaleRequestId,
} from "@/lib/pos/sale-idempotency";

const payload = {
  outletId: "33333333-3333-4333-8333-333333333333",
  paymentMethod: "cash" as const,
  paidAmount: 25_000,
  items: [
    { productId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", quantity: 1 },
    { productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", quantity: 2 },
  ],
};

beforeEach(() => {
  sessionStorage.clear();
});

describe("idempotensi transaksi POS", () => {
  it("menghasilkan fingerprint stabil walaupun urutan item berubah", () => {
    const reversed = { ...payload, items: [...payload.items].reverse() };

    expect(createSaleRequestFingerprint(payload)).toBe(
      createSaleRequestFingerprint(reversed),
    );
  });

  it("menggunakan request id yang sama untuk retry payload yang sama", () => {
    const fingerprint = createSaleRequestFingerprint(payload);
    let generated = 0;
    const generateId = () => `request-${++generated}`;

    const first = getOrCreateSaleRequestId(sessionStorage, fingerprint, generateId);
    const retry = getOrCreateSaleRequestId(sessionStorage, fingerprint, generateId);

    expect(first).toBe("request-1");
    expect(retry).toBe(first);
    expect(generated).toBe(1);
  });

  it("membuat request id baru setelah transaksi berhasil dibersihkan", () => {
    const fingerprint = createSaleRequestFingerprint(payload);
    const first = getOrCreateSaleRequestId(sessionStorage, fingerprint, () => "request-1");

    clearSaleRequestId(sessionStorage, first);

    expect(
      getOrCreateSaleRequestId(sessionStorage, fingerprint, () => "request-2"),
    ).toBe("request-2");
  });
});
