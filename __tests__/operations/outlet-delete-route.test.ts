import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getMembership: vi.fn(),
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
}));

vi.mock("@/db", () => ({
  db: { select: mocks.select, transaction: mocks.transaction },
}));

import { DELETE } from "@/app/api/outlets/[id]/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const ownOutletId = "33333333-3333-4333-8333-333333333333";
const foreignOutletId = "44444444-4444-4444-8444-444444444444";

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

function deleteTransaction() {
  const where = vi.fn(async () => undefined);
  const tx = {
    delete: vi.fn(() => ({ where })),
  };
  mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) =>
    callback(tx),
  );
  return tx;
}

function deleteRequest(id: string) {
  return DELETE(new Request(`http://localhost/api/outlets/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: userId } });
  mocks.getMembership.mockResolvedValue({ businessId, role: "owner" });
});

describe("DELETE /api/outlets/[id]", () => {
  it("menolak menghapus gerai yang bukan milik usaha pemanggil tanpa menyentuh data stok", async () => {
    // Ownership lookup mengembalikan kosong: id gerai milik tenant lain.
    mocks.select.mockReturnValueOnce(queryBuilder([]));

    const response = await deleteRequest(foreignOutletId);

    expect(response.status).toBe(404);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("menghapus gerai milik sendiri beserta stok yang ter-scope business", async () => {
    const tx = deleteTransaction();
    mocks.select
      .mockReturnValueOnce(queryBuilder([{ id: ownOutletId }]))
      .mockReturnValueOnce(queryBuilder([{ count: 2 }]))
      .mockReturnValueOnce(queryBuilder([]));

    const response = await deleteRequest(ownOutletId);

    expect(response.status).toBe(200);
    // stockMovement, inventoryStock, outlet
    expect(tx.delete).toHaveBeenCalledTimes(3);
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("melindungi gerai terakhir dari penghapusan", async () => {
    mocks.select
      .mockReturnValueOnce(queryBuilder([{ id: ownOutletId }]))
      .mockReturnValueOnce(queryBuilder([{ count: 1 }]));

    const response = await deleteRequest(ownOutletId);

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
