import { describe, expect, it } from "vitest";
import {
  createBankTransferOrderSchema,
  parseTransferProofDataUrl,
  uploadTransferProofSchema,
  verifyBankTransferSchema,
} from "@/shared/validation/subscription";
import {
  formatBankTransferDestination,
  getBankTransferDestination,
  isBankTransferConfigured,
} from "@/shared/billing/bank-transfer";

describe("rekening transfer bank", () => {
  it("membaca rekening tujuan dari env dengan fallback placeholder", () => {
    const destination = getBankTransferDestination({});
    expect(destination).toEqual({
      bank: "BCA",
      accountNumber: "1234567890",
      accountName: "PT wazePOS",
    });
    expect(isBankTransferConfigured({})).toBe(true);
    expect(
      getBankTransferDestination({
        BANK_TRANSFER_BANK: "Mandiri",
        BANK_TRANSFER_ACCOUNT_NUMBER: " 9876543210 ",
        BANK_TRANSFER_ACCOUNT_NAME: "PT Contoh",
      }),
    ).toEqual({ bank: "Mandiri", accountNumber: "9876543210", accountName: "PT Contoh" });
    expect(formatBankTransferDestination(destination)).toBe("BCA 1234567890 a.n. PT wazePOS");
  });
});

describe("validasi pesanan transfer bank", () => {
  it("menerima paket tumbuh/bisnis dan menolak paket lain", () => {
    expect(createBankTransferOrderSchema.safeParse({ plan: "tumbuh" }).success).toBe(true);
    expect(createBankTransferOrderSchema.safeParse({ plan: "bisnis" }).success).toBe(true);
    expect(createBankTransferOrderSchema.safeParse({ plan: "enterprise" }).success).toBe(false);
  });
});

describe("validasi bukti transfer", () => {
  const proofDataUrl = "data:image/png;base64,aGVsbG8=";

  it("menerima bukti valid JPG/PNG/WebP", () => {
    expect(
      uploadTransferProofSchema.safeParse({
        paymentId: "pay-1",
        senderBank: "BCA",
        senderAccountName: "Toko Maju",
        proofDataUrl,
      }).success,
    ).toBe(true);
    expect(parseTransferProofDataUrl(proofDataUrl)).toEqual({ mime: "image/png", base64: "aGVsbG8=" });
  });

  it("menolak tipe file, bank kosong, dan data URL rusak", () => {
    expect(parseTransferProofDataUrl("data:image/gif;base64,aGVsbG8=")).toBeNull();
    expect(parseTransferProofDataUrl("bukan-data-url")).toBeNull();
    expect(
      uploadTransferProofSchema.safeParse({
        paymentId: "pay-1",
        senderBank: "B",
        senderAccountName: "Toko Maju",
        proofDataUrl,
      }).success,
    ).toBe(false);
  });
});

describe("validasi verifikasi admin", () => {
  it("menerima approve/reject dan mewajibkan alasan minimal saat menolak (di UI)", () => {
    expect(verifyBankTransferSchema.safeParse({ paymentId: "pay-1", decision: "approve" }).success).toBe(true);
    expect(
      verifyBankTransferSchema.safeParse({ paymentId: "pay-1", decision: "reject", note: "Bukti buram" }).success,
    ).toBe(true);
    expect(verifyBankTransferSchema.safeParse({ paymentId: "pay-1", decision: "maybe" }).success).toBe(false);
  });
});
