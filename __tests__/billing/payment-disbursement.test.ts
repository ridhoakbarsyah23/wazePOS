import { describe, expect, it } from "vitest";
import {
  markPaymentDisbursedSchema,
} from "@/shared/validation/subscription";

describe("validasi pencairan pembayaran", () => {
  it("menerima paymentId saja (referensi dan catatan opsional)", () => {
    const result = markPaymentDisbursedSchema.safeParse({ paymentId: "pay-1" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ paymentId: "pay-1", reference: undefined, note: undefined });
  });

  it("menerima referensi dan catatan yang diisi", () => {
    const result = markPaymentDisbursedSchema.safeParse({
      paymentId: "pay-1",
      reference: "  FT12345  ",
      note: "Dicairkan ke BCA pribadi",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      paymentId: "pay-1",
      reference: "FT12345",
      note: "Dicairkan ke BCA pribadi",
    });
  });

  it("mengubah string kosong menjadi undefined dan menolak paymentId kosong", () => {
    const empty = markPaymentDisbursedSchema.safeParse({ paymentId: "pay-1", reference: "   ", note: "" });
    expect(empty.success).toBe(true);
    expect(empty.data).toEqual({ paymentId: "pay-1", reference: undefined, note: undefined });

    expect(markPaymentDisbursedSchema.safeParse({ paymentId: "" }).success).toBe(false);
  });

  it("menolak referensi dan catatan yang terlalu panjang", () => {
    expect(
      markPaymentDisbursedSchema.safeParse({ paymentId: "pay-1", reference: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      markPaymentDisbursedSchema.safeParse({ paymentId: "pay-1", note: "x".repeat(501) }).success,
    ).toBe(false);
  });
});
