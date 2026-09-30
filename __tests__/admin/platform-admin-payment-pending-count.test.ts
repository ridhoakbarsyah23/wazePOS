import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCounts } = vi.hoisted(() => ({ getCounts: vi.fn() }));

vi.mock("@/server/admin/platform-admin-payment-notifications", () => ({
  getPendingPaymentNotificationCounts: getCounts,
}));

vi.mock("@/server/admin/platform-admin-api", () => ({
  getPlatformAdminRequestSession: vi.fn(async () => ({
    session: { user: { id: "admin-1", name: "Dashboard Admin", email: "admin@wazepos.com" } },
    allowed: true,
  })),
}));

import { GET } from "@/app/api/admin/payments/pending-count/route";

describe("GET /api/admin/payments/pending-count", () => {
  beforeEach(() => {
    getCounts.mockReset();
  });

  it("mengembalikan jumlah pending total dan siap verifikasi tanpa cache", async () => {
    getCounts.mockResolvedValue({
      pendingTotal: 3,
      pendingReady: 2,
      updatedAt: "2026-09-29T00:00:00.000Z",
    });

    const response = await GET();
    const payload = (await response.json()) as { pendingTotal: number; pendingReady: number };

    expect(response.status).toBe(200);
    expect(payload.pendingTotal).toBe(3);
    expect(payload.pendingReady).toBe(2);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("mengembalikan 500 saat query gagal", async () => {
    getCounts.mockRejectedValue(new Error("db down"));

    const response = await GET();
    expect(response.status).toBe(500);
  });
});
