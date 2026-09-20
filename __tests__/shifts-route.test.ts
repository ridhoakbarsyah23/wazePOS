import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getMembership: vi.fn(),
  getBusinessSubscription: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
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
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
  },
}));

import { POST } from "@/app/api/shifts/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const outletId = "33333333-3333-4333-8333-333333333333";

function shiftRequest(action: "open" | "close", amount: number) {
  return new Request("http://localhost/api/shifts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, outletId, amount }),
  });
}

function queryBuilder(rows: unknown[]) {
  const builder = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled: (value: unknown[]) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(onFulfilled, onRejected),
  };

  builder.from.mockReturnValue(builder);
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
    role: "cashier",
    onboardingCompleted: true,
  });
  mocks.getBusinessSubscription.mockResolvedValue({ plan: "bisnis" });
});

describe("POST /api/shifts", () => {
  it("membatasi manajemen shift ke Paket Bisnis", async () => {
    mocks.getBusinessSubscription.mockResolvedValue({ plan: "tumbuh" });

    const response = await POST(shiftRequest("open", 100_000));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("PLAN_FEATURE_REQUIRED");
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("menolak gerai milik tenant lain", async () => {
    mocks.select.mockReturnValueOnce(queryBuilder([]));

    const response = await POST(shiftRequest("open", 100_000));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ message: "Gerai tidak valid." });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("membuka shift dengan modal awal", async () => {
    mocks.select
      .mockReturnValueOnce(queryBuilder([{ id: outletId }]))
      .mockReturnValueOnce(queryBuilder([]));

    const returning = vi.fn(async () => [{ id: "shift-1" }]);
    const values = vi.fn(() => ({ returning }));
    mocks.insert.mockReturnValue({ values });

    const response = await POST(shiftRequest("open", 100_000));

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: "shift-1" });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      businessId,
      outletId,
      cashierId: userId,
      openingCash: 100_000,
      status: "open",
    }));
  });

  it("menghitung kas yang diharapkan hanya dari penjualan tunai", async () => {
    mocks.select
      .mockReturnValueOnce(queryBuilder([{ id: outletId }]))
      .mockReturnValueOnce(queryBuilder([{ id: "shift-1", openingCash: 100_000 }]))
      .mockReturnValueOnce(queryBuilder([{ total: 50_000 }]));

    const updateBuilder = {
      set: vi.fn(),
      where: vi.fn(async () => undefined),
    };
    updateBuilder.set.mockReturnValue(updateBuilder);
    mocks.update.mockReturnValue(updateBuilder);

    const response = await POST(shiftRequest("close", 160_000));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ expectedCash: 150_000, difference: 10_000 });
    expect(updateBuilder.set).toHaveBeenCalledWith(expect.objectContaining({
      closingCash: 160_000,
      expectedCash: 150_000,
      status: "closed",
    }));
  });
});
