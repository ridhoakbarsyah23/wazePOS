import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  verifySignature: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/midtrans", () => ({
  isMidtransConfigured: mocks.isConfigured,
  verifyMidtransSignature: mocks.verifySignature,
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
  },
}));

import { POST } from "@/app/api/payments/midtrans/webhook/route";

const payment = {
  id: "payment-1",
  businessId: "business-1",
  subscriptionId: "subscription-1",
  plan: "bisnis",
  amount: 950_000,
  status: "pending",
  providerTransactionId: null,
  providerPaymentType: null,
  paidAt: null,
};

function webhookRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/payments/midtrans/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: "WZP-payment-1",
      status_code: "200",
      gross_amount: "950000.00",
      signature_key: "valid-signature",
      transaction_status: "settlement",
      transaction_id: "midtrans-transaction-1",
      payment_type: "bank_transfer",
      fraud_status: "accept",
      currency: "IDR",
      ...overrides,
    }),
  });
}

function paymentQuery(rows: unknown[]) {
  const builder = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(async () => rows),
  };
  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isConfigured.mockReturnValue(true);
  mocks.verifySignature.mockReturnValue(true);
  mocks.select.mockReturnValue(paymentQuery([payment]));
});

describe("POST /api/payments/midtrans/webhook", () => {
  it("menolak signature yang tidak valid sebelum membaca pembayaran", async () => {
    mocks.verifySignature.mockReturnValue(false);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("menolak nominal yang berbeda dari pembayaran tersimpan", async () => {
    const response = await POST(webhookRequest({ gross_amount: "1.00" }));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ message: "Nominal pembayaran tidak sesuai." });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("mengaktifkan subscription setelah settlement yang valid", async () => {
    const paymentSet = vi.fn();
    const subscriptionSet = vi.fn();
    const paymentUpdate = {
      set: paymentSet,
      where: vi.fn(),
      returning: vi.fn(async () => [{ id: payment.id }]),
    };
    paymentSet.mockReturnValue(paymentUpdate);
    paymentUpdate.where.mockReturnValue(paymentUpdate);

    const subscriptionUpdate = {
      set: subscriptionSet,
      where: vi.fn(async () => undefined),
    };
    subscriptionSet.mockReturnValue(subscriptionUpdate);

    const update = vi.fn()
      .mockReturnValueOnce(paymentUpdate)
      .mockReturnValueOnce(subscriptionUpdate);
    mocks.transaction.mockImplementation(async (callback) => callback({ update }));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(paymentSet).toHaveBeenCalledWith(expect.objectContaining({
      status: "paid",
      providerTransactionId: "midtrans-transaction-1",
      providerPaymentType: "bank_transfer",
    }));
    expect(subscriptionSet).toHaveBeenCalledWith(expect.objectContaining({
      plan: "bisnis",
      status: "active",
      cancelAtPeriodEnd: false,
    }));
  });

  it("mengabaikan notifikasi settlement duplikat secara idempotent", async () => {
    mocks.select.mockReturnValue(paymentQuery([{ ...payment, status: "paid" }]));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
