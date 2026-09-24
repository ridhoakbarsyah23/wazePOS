import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getMembership: vi.fn(),
  getBusinessSubscription: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
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
  db: { insert: mocks.insert, select: mocks.select },
}));

import { POST } from "@/app/api/customers/route";

const businessId = "22222222-2222-4222-8222-222222222222";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
  mocks.getMembership.mockResolvedValue({ businessId, role: "owner" });
  mocks.getBusinessSubscription.mockResolvedValue({ plan: "tumbuh", status: "active" });
  // Default: hitungan pelanggan 0 sehingga kuota tidak penuh.
  mocks.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    }),
  });
});

describe("POST /api/customers", () => {
  it("membuat pelanggan dan mengembalikan 201", async () => {
    mocks.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "customer-1",
            name: "Bu Sari",
            phone: "628123456789",
            email: null,
            note: null,
            createdAt: new Date(),
          },
        ]),
      }),
    });

    const res = await POST(jsonRequest({ name: "Bu Sari", phone: "0812-3456-789" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.customer.name).toBe("Bu Sari");
    expect(data.customer.phone).toBe("628123456789");
    // Field statistik wajib ada agar UI tidak crash saat menambahkan kartu baru.
    expect(data.customer.transactionCount).toBe(0);
    expect(data.customer.totalSpent).toBe(0);
    expect(data.customer.lastVisitAt).toBeNull();
  });

  it("menolak payload tanpa nama dengan 422", async () => {
    const res = await POST(jsonRequest({ phone: "081234567890" }));
    expect(res.status).toBe(422);
  });

  it("menolak telepon tidak valid dengan 422", async () => {
    const res = await POST(jsonRequest({ name: "Andi", phone: "12345" }));
    expect(res.status).toBe(422);
  });

  it("mengembalikan 409 ketika nomor telepon sudah terdaftar", async () => {
    mocks.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValue({ code: "23505" }),
      }),
    });

    const res = await POST(jsonRequest({ name: "Andi", phone: "081234567890" }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.message).toContain("sudah terdaftar");
  });

  it("memblokir penambahan ketika kuota paket penuh (403)", async () => {
    mocks.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 200 }]),
      }),
    });

    const res = await POST(jsonRequest({ name: "Pelanggan Baru" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe("PLAN_LIMIT_REACHED");
  });

  it("mengizinkan kasir menambah pelanggan agar member dapat didaftarkan di kasir", async () => {
    mocks.getMembership.mockResolvedValue({ businessId, role: "cashier" });
    mocks.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: "customer-2",
            name: "Pelanggan Kasir",
            phone: null,
            email: null,
            note: null,
            createdAt: new Date(),
          },
        ]),
      }),
    });

    const res = await POST(jsonRequest({ name: "Pelanggan Kasir" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.customer.name).toBe("Pelanggan Kasir");
  });
});
