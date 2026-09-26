import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getMembership: vi.fn(),
  getBusinessSubscription: vi.fn(),
  select: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/server/auth/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/server/auth/auth-session", () => ({
  canManageBusiness: (role: string) => role === "owner" || role === "admin",
  getMembership: mocks.getMembership,
  getBusinessSubscription: mocks.getBusinessSubscription,
}));

vi.mock("@/db", () => ({
  db: { select: mocks.select, transaction: mocks.transaction },
}));

import { PATCH } from "@/app/api/products/[id]/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const productId = "33333333-3333-4333-8333-333333333333";

function queryBuilder(rows: unknown[]) {
  const builder = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    then: (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(rows).then(onFulfilled, onRejected),
  };
  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  return builder;
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Kopi Susu",
    sku: "",
    categoryId: null,
    sellingPrice: 20_000,
    costPrice: 10_000,
    trackStock: true,
    isActive: true,
    ...overrides,
  };
}

function patchRequest(body: Record<string, unknown>) {
  return PATCH(
    new Request(`http://localhost/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: productId }) },
  );
}

function updateBuilder() {
  const builder = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn(async () => [{ id: productId }]),
  };
  builder.set.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: userId } });
  mocks.getMembership.mockResolvedValue({ businessId, role: "owner" });
  mocks.getBusinessSubscription.mockResolvedValue({ plan: "bisnis" });
});

describe("PATCH /api/products/[id] trackStock consistency", () => {
  it("menghapus baris stok saat pelacakan stok dimatikan", async () => {
    // currentProduct lookup (trackStock: true)
    mocks.select.mockReturnValueOnce(queryBuilder([{ trackStock: true }]));
    const deleteWhere = vi.fn(async () => undefined);
    const tx = {
      update: vi.fn().mockReturnValue(updateBuilder()),
      insert: vi.fn(),
      delete: vi.fn(() => ({ where: deleteWhere })),
      select: vi.fn(),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await patchRequest(payload({ trackStock: false }));

    expect(response.status).toBe(200);
    expect(tx.delete).toHaveBeenCalledOnce();
    expect(deleteWhere).toHaveBeenCalledOnce();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("membuat baris stok untuk gerai yang belum ada saat pelacakan dinyalakan", async () => {
    // currentProduct lookup (trackStock: false)
    mocks.select.mockReturnValueOnce(queryBuilder([{ trackStock: false }]));
    const insertValues = vi.fn(async () => undefined);
    const tx = {
      update: vi.fn().mockReturnValue(updateBuilder()),
      insert: vi.fn(() => ({ values: insertValues })),
      delete: vi.fn(),
      select: vi
        .fn()
        // business outlets
        .mockReturnValueOnce(queryBuilder([{ id: "outlet-1" }, { id: "outlet-2" }]))
        // existing stocks (outlet-1 sudah punya baris)
        .mockReturnValueOnce(queryBuilder([{ outletId: "outlet-1" }])),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await patchRequest(payload({ trackStock: true }));

    expect(response.status).toBe(200);
    expect(tx.insert).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledWith([
      expect.objectContaining({ outletId: "outlet-2", productId, quantity: 0 }),
    ]);
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it("tidak menyentuh baris stok saat paket tidak memiliki fitur inventori", async () => {
    mocks.getBusinessSubscription.mockResolvedValue({ plan: "tumbuh" });
    mocks.select.mockReturnValueOnce(queryBuilder([{ trackStock: true }]));
    const update = updateBuilder();
    const tx = {
      update: vi.fn().mockReturnValue(update),
      insert: vi.fn(),
      delete: vi.fn(),
      select: vi.fn(),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));

    const response = await patchRequest(payload({ trackStock: true }));

    expect(response.status).toBe(200);
    expect(update.set).toHaveBeenCalledWith(expect.objectContaining({ trackStock: false }));
    expect(tx.insert).not.toHaveBeenCalled();
    expect(tx.delete).not.toHaveBeenCalled();
  });
});
