import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getMembership: vi.fn(),
  getBusinessSubscription: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/lib/auth-session", () => ({
  getMembership: mocks.getMembership,
  getBusinessSubscription: mocks.getBusinessSubscription,
}));

vi.mock("@/db", () => ({
  db: { transaction: mocks.transaction },
}));

import { POST } from "@/app/api/sales/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const outletId = "33333333-3333-4333-8333-333333333333";
const productId = "44444444-4444-4444-8444-444444444444";

function activeSubscription(plan: "tumbuh" | "bisnis") {
  return {
    id: "subscription-1",
    plan,
    status: "active" as const,
    trialEndsAt: new Date("2026-01-01T00:00:00.000Z"),
    currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
    currentPeriodEnd: new Date("2099-01-01T00:00:00.000Z"),
    cancelAtPeriodEnd: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function saleRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      outletId,
      paymentMethod: "cash",
      paidAmount: 25_000,
      items: [{ productId, quantity: 2 }],
      ...overrides,
    }),
  });
}

function selectBuilder(rows: unknown[]) {
  const builder = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(onFulfilled, onRejected),
  };

  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.limit.mockResolvedValue(rows);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: userId } });
  mocks.getMembership.mockResolvedValue({
    id: "membership-1",
    businessId,
    businessName: "Toko Uji",
    role: "owner",
    onboardingCompleted: true,
  });
  mocks.getBusinessSubscription.mockResolvedValue(activeSubscription("tumbuh"));
});

describe("POST /api/sales", () => {
  it("menolak permintaan tanpa sesi", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await POST(saleRequest());

    expect(response.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("menolak QRIS sebelum integrasi pembayaran resmi tersedia", async () => {
    mocks.getBusinessSubscription.mockResolvedValue(activeSubscription("bisnis"));

    const response = await POST(saleRequest({ paymentMethod: "qris" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("PAYMENT_METHOD_UNAVAILABLE");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("membatasi kartu debit dan kredit ke Paket Bisnis", async () => {
    const response = await POST(saleRequest({ paymentMethod: "debit" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("PLAN_FEATURE_REQUIRED");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("menolak gerai yang tidak ditemukan dalam tenant aktif", async () => {
    const tx = {
      select: vi.fn(() => selectBuilder([])),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(saleRequest());

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ message: "Gerai tidak ditemukan." });
  });

  it("menyimpan penjualan Paket Bisnis tanpa shift, mengurangi stok, dan mengambil snapshot harga modal", async () => {
    mocks.getBusinessSubscription.mockResolvedValue(activeSubscription("bisnis"));
    const queryResults = [
      [{ id: outletId }],
      [{
        id: productId,
        name: "Kopi Susu",
        sellingPrice: 10_000,
        costPrice: 6_000,
        trackStock: true,
        stockId: "stock-1",
        quantity: 5,
      }],
    ];
    const insertedValues: unknown[] = [];
    const updateBuilder = {
      set: vi.fn(),
      where: vi.fn(),
      returning: vi.fn(async () => [{ id: "stock-1" }]),
    };
    updateBuilder.set.mockReturnValue(updateBuilder);
    updateBuilder.where.mockReturnValue(updateBuilder);

    const tx = {
      select: vi.fn(() => selectBuilder(queryResults.shift() ?? [])),
      update: vi.fn(() => updateBuilder),
      insert: vi.fn(() => ({
        values: vi.fn(async (values: unknown) => {
          insertedValues.push(values);
        }),
      })),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(saleRequest());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ total: 20_000, changeAmount: 5_000 });
    expect(tx.update).toHaveBeenCalledOnce();
    expect(insertedValues).toHaveLength(3);
    expect(insertedValues[1]).toEqual([
      expect.objectContaining({
        productId,
        productName: "Kopi Susu",
        quantity: 2,
        unitPrice: 10_000,
        unitCost: 6_000,
        subtotal: 20_000,
      }),
    ]);
  });
});
