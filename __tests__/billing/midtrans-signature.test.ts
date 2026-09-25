import { describe, expect, it } from "vitest";
import { createMidtransSignature, verifyMidtransSignatureValue } from "@/lib/billing/midtrans-signature";

describe("signature Midtrans", () => {
  it("menerima SHA-512 yang dibentuk dari order, status, nominal, dan Server Key", () => {
    const orderId = "WZP-payment-1";
    const statusCode = "200";
    const grossAmount = "950000.00";
    const serverKey = "server-key-uji";
    const signatureKey = createMidtransSignature({ orderId, statusCode, grossAmount, serverKey });

    expect(verifyMidtransSignatureValue({
      orderId,
      statusCode,
      grossAmount,
      serverKey,
      signatureKey,
    })).toBe(true);
    expect(verifyMidtransSignatureValue({
      orderId,
      statusCode,
      grossAmount: "1.00",
      serverKey,
      signatureKey,
    })).toBe(false);
  });
});
