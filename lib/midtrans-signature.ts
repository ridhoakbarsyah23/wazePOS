import { createHash, timingSafeEqual } from "node:crypto";

type SignatureInput = {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
};

export function createMidtransSignature(input: SignatureInput) {
  return createHash("sha512")
    .update(`${input.orderId}${input.statusCode}${input.grossAmount}${input.serverKey}`)
    .digest("hex");
}

export function verifyMidtransSignatureValue(
  input: SignatureInput & { signatureKey: string },
) {
  const expectedBuffer = Buffer.from(createMidtransSignature(input), "utf8");
  const actualBuffer = Buffer.from(input.signatureKey.toLowerCase(), "utf8");

  return expectedBuffer.length === actualBuffer.length
    && timingSafeEqual(expectedBuffer, actualBuffer);
}
