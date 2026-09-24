import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

import { GET } from "@/app/api/auth/destination/route";

const originalAllowlist = process.env.PLATFORM_ADMIN_EMAILS;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PLATFORM_ADMIN_EMAILS = "admin@example.com";
});

afterEach(() => {
  if (originalAllowlist === undefined) delete process.env.PLATFORM_ADMIN_EMAILS;
  else process.env.PLATFORM_ADMIN_EMAILS = originalAllowlist;
});

describe("GET /api/auth/destination", () => {
  it("menolak request tanpa session", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("mengarahkan akun allowlist ke Platform Admin", async () => {
    mocks.getSession.mockResolvedValue({ user: { email: "ADMIN@example.com" } });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ destination: "/admin" });
  });

  it("mengarahkan akun biasa ke dashboard usaha", async () => {
    mocks.getSession.mockResolvedValue({ user: { email: "cashier@example.com" } });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ destination: "/dashboard" });
  });
});
