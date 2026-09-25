import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireSession: vi.fn(),
  getWorkspaceContext: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/auth-session", () => ({
  requireSession: mocks.requireSession,
  getWorkspaceContext: mocks.getWorkspaceContext,
  canManageBusiness: (role: string) => role === "owner" || role === "admin",
  canManageStaff: (role: string) => role === "owner" || role === "admin",
}));

vi.mock("@/lib/billing/plans", () => ({
  getSubscriptionStatusDetails: () => ({ isValid: true, isTrialing: false, daysRemaining: 0 }),
  hasPlanFeature: () => false,
}));

import { requireDashboardAccess } from "@/lib/access/dashboard-access";

beforeEach(() => {
  mocks.redirect.mockReset();
  mocks.requireSession.mockReset();
  mocks.getWorkspaceContext.mockReset();
  mocks.requireSession.mockResolvedValue({ user: { id: "user-1", name: "Admin" } });
  mocks.redirect.mockImplementation((destination: string) => {
    throw new Error(`REDIRECT:${destination}`);
  });
});

describe("requireDashboardAccess ownerOnly", () => {
  it("mengalihkan admin usaha ke POS", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({
      membership: { businessId: "business-1", businessName: "Toko", role: "admin" },
      currentSubscription: null,
    });

    await expect(requireDashboardAccess({ rule: "ownerOnly" })).rejects.toThrow("REDIRECT:/pos");
    expect(mocks.redirect).toHaveBeenCalledWith("/pos");
  });
});
