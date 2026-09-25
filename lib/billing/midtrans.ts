import "server-only";

import { verifyMidtransSignatureValue } from "@/lib/billing/midtrans-signature";

type SnapTransactionInput = {
  orderId: string;
  amount: number;
  planName: string;
  customerName: string;
  customerEmail: string;
  finishUrl: string;
};

type SnapTransactionResponse = {
  token: string;
  redirect_url: string;
};

export function isMidtransConfigured() {
  return Boolean(process.env.MIDTRANS_SERVER_KEY?.trim());
}

function getMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) throw new Error("MIDTRANS_NOT_CONFIGURED");
  const production = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return {
    serverKey,
    snapUrl: production
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions",
  };
}

export async function createSnapTransaction(input: SnapTransactionInput) {
  const { serverKey, snapUrl } = getMidtransConfig();
  const notificationUrl = process.env.MIDTRANS_NOTIFICATION_URL?.trim();
  const response = await fetch(snapUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
      ...(notificationUrl ? { "X-Override-Notification": notificationUrl } : {}),
    },
    body: JSON.stringify({
      transaction_details: { order_id: input.orderId, gross_amount: input.amount },
      item_details: [{ id: `wazepos-${input.orderId}`, price: input.amount, quantity: 1, name: `wazePOS Paket ${input.planName} - 1 tahun` }],
      customer_details: { first_name: input.customerName.slice(0, 50), email: input.customerEmail },
      callbacks: { finish: input.finishUrl },
      credit_card: { secure: true },
      expiry: { duration: 24, unit: "hour" },
      page_expiry: { duration: 24, unit: "hour" },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await response.json() as Partial<SnapTransactionResponse> & { error_messages?: string[] };
  if (!response.ok || !payload.token || !payload.redirect_url) {
    throw new Error(`MIDTRANS_SNAP_ERROR:${response.status}`);
  }
  return { token: payload.token, redirectUrl: payload.redirect_url };
}

export function verifyMidtransSignature(input: { orderId: string; statusCode: string; grossAmount: string; signatureKey: string }) {
  const { serverKey } = getMidtransConfig();
  return verifyMidtransSignatureValue({ ...input, serverKey });
}
