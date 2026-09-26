import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  getExportRows: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock("@/server/admin/platform-admin-api", () => ({
  getPlatformAdminRequestSession: mocks.getRequestSession,
}));

vi.mock("@/server/admin/platform-admin-subscriptions", () => ({
  getPlatformAdminSubscriptionExportRows: mocks.getExportRows,
}));

vi.mock("@/server/admin/platform-admin-audit", () => ({
  recordPlatformAdminAudit: mocks.recordAudit,
}));

import { GET } from "@/app/api/admin/subscriptions/export/route";

const adminSession = {
  user: { id: "admin-1", name: "Platform Admin", email: "admin@wazepos.com" },
};

describe("GET /api/admin/subscriptions/export", () => {
  beforeEach(() => {
    mocks.getRequestSession.mockReset();
    mocks.getExportRows.mockReset();
    mocks.recordAudit.mockReset();
    mocks.getRequestSession.mockResolvedValue({ session: adminSession, allowed: true });
    mocks.getExportRows.mockResolvedValue({
      filters: { query: "", state: "trial_active", plan: "all" },
      subscriptions: [
        {
          id: "sub-1",
          businessId: "biz-1",
          businessName: "=Formula",
          businessType: "Kedai Kopi",
          ownerName: "Owner",
          ownerEmail: "owner@example.com",
          plan: "tumbuh",
          state: "trial_active",
          trialEndsAt: "2026-10-08T00:00:00.000Z",
          currentPeriodStart: null,
          currentPeriodEnd: null,
          createdAt: "2026-09-24T00:00:00.000Z",
        },
      ],
      truncated: false,
    });
  });

  it("menolak request tanpa sesi", async () => {
    mocks.getRequestSession.mockResolvedValue({ session: null, allowed: false });
    const response = await GET(new Request("http://localhost/api/admin/subscriptions/export"));
    expect(response.status).toBe(401);
  });

  it("menghasilkan CSV aman dan mencatat audit subscription_export", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/subscriptions/export?state=trial_active"),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(csv).toContain("'=Formula");
    expect(csv).toContain("Trial aktif");
    expect(mocks.getExportRows).toHaveBeenCalledWith(
      expect.objectContaining({ state: "trial_active" }),
    );
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "subscription_export", entityType: "subscription_directory" }),
    );
  });
});
