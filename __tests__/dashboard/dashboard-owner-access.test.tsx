import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireDashboardAccess: vi.fn(),
}));

vi.mock("@/server/access/dashboard-access", () => ({
  requireDashboardAccess: mocks.requireDashboardAccess,
}));

import DashboardPage from "@/app/(app)/dashboard/page";

beforeEach(() => {
  mocks.requireDashboardAccess.mockReset();
});

describe("DashboardPage access", () => {
  it("meminta guard owner-only sebelum memuat data dashboard", async () => {
    const lockout = createElement("main", null, "blocked");
    mocks.requireDashboardAccess.mockResolvedValue({ ok: false, lockout });

    const result = await DashboardPage({ searchParams: Promise.resolve({}) });

    expect(result).toBe(lockout);
    expect(mocks.requireDashboardAccess).toHaveBeenCalledWith({ rule: "ownerOnly" });
  });
});
