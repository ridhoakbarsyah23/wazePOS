import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getMembership: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/lib/auth-session", () => ({
  canManageBusiness: (role: string) => role === "owner" || role === "admin",
  getMembership: mocks.getMembership,
}));

vi.mock("@/db", () => ({
  db: { transaction: mocks.transaction },
}));

import { POST } from "@/app/api/sales/[id]/void/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const saleId = "33333333-3333-4333-8333-333333333333";

function voidRequest(reason: unknown = "Salah input pesanan") {
  return new Request(`http://localhost/api/sales/${saleId}/void`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}

function queryBuilder(rows: unknown[]) {
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    for: vi.fn(),
    then: (onFulfilled: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(onFulfilled, onRejected),
  };
  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.for.mockReturnValue(builder);
  return builder;
}

function saleRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: saleId,
    businessId,
    outletId: "outlet-1",
    cashShiftId: null,
    invoiceNumber: "INV-001",
    status: "completed",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: userId } });
  mocks.getMembership.mockResolvedValue({
    businessId,
    role: "owner",
  });
});

describe("POST /api/sales/[id]/void", () => {
  it("mewajibkan alasan pembatalan yang layak diaudit", async () => {
    const response = await POST(voidRequest("x"), { params: Promise.resolve({ id: saleId }) });

    expect(response.status).toBe(422);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("menolak void berulang sebelum mengembalikan stok", async () => {
    const tx = {
      select: vi.fn().mockReturnValue(queryBuilder([saleRecord({ status: "voided" })])),
      update: vi.fn(),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(voidRequest(), { params: Promise.resolve({ id: saleId }) });

    expect(response.status).toBe(409);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("tidak mengembalikan stok ketika update atomik kalah oleh request lain", async () => {
    const saleUpdate = {
      set: vi.fn(),
      where: vi.fn(),
      returning: vi.fn(async () => []),
    };
    saleUpdate.set.mockReturnValue(saleUpdate);
    saleUpdate.where.mockReturnValue(saleUpdate);
    const tx = {
      select: vi.fn().mockReturnValue(queryBuilder([saleRecord()])),
      update: vi.fn().mockReturnValue(saleUpdate),
      insert: vi.fn(),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(voidRequest(), { params: Promise.resolve({ id: saleId }) });

    expect(response.status).toBe(409);
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.update).toHaveBeenCalledOnce();
  });

  it("menyimpan audit void dan mengembalikan stok tepat satu kali", async () => {
    const queryResults = [
      [saleRecord({ cashShiftId: "legacy-shift" })],
      [{ productId: "product-1", productName: "Kopi", quantity: 2, trackStock: true }],
    ];
    const saleUpdate = {
      set: vi.fn(),
      where: vi.fn(),
      returning: vi.fn(async () => [{ id: saleId }]),
    };
    saleUpdate.set.mockReturnValue(saleUpdate);
    saleUpdate.where.mockReturnValue(saleUpdate);
    const stockUpdate = {
      set: vi.fn(),
      where: vi.fn(async () => undefined),
    };
    stockUpdate.set.mockReturnValue(stockUpdate);
    const insertedMovements: unknown[] = [];
    const tx = {
      select: vi.fn(() => queryBuilder(queryResults.shift() ?? [])),
      update: vi.fn()
        .mockReturnValueOnce(saleUpdate)
        .mockReturnValueOnce(stockUpdate),
      insert: vi.fn(() => ({
        values: vi.fn(async (values: unknown) => insertedMovements.push(values)),
      })),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await POST(voidRequest("Pelanggan membatalkan pesanan"), {
      params: Promise.resolve({ id: saleId }),
    });

    expect(response.status).toBe(200);
    expect(saleUpdate.set).toHaveBeenCalledWith(expect.objectContaining({
      status: "voided",
      voidedById: userId,
      voidReason: "Pelanggan membatalkan pesanan",
      voidedAt: expect.any(Date),
    }));
    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(insertedMovements).toEqual([
      expect.objectContaining({
        productId: "product-1",
        quantity: 2,
        note: "Void INV-001: Pelanggan membatalkan pesanan",
      }),
    ]);
  });
});
