import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  getExportRows: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock("@/server/admin/platform-admin-api", () => ({
  getPlatformAdminRequestSession: mocks.getRequestSession,
}));

vi.mock("@/server/admin/platform-admin-dashboard", () => ({
  getPlatformAdminBusinessExportRows: mocks.getExportRows,
}));

vi.mock("@/server/admin/platform-admin-audit", () => ({
  recordPlatformAdminAudit: mocks.recordAudit,
}));

import { GET } from "@/app/api/admin/businesses/export/route";

const adminSession = {
  user: {
    id: "admin-1",
    name: "Platform Admin",
    email: "admin@wazepos.com",
  },
};

function request(url = "http://localhost/api/admin/businesses/export?status=trial_active") {
  return new Request(url);
}

describe("GET /api/admin/businesses/export", () => {
  beforeEach(() => {
    mocks.getRequestSession.mockReset();
    mocks.getExportRows.mockReset();
    mocks.recordAudit.mockReset();
    mocks.getRequestSession.mockResolvedValue({ session: adminSession, allowed: true });
    mocks.getExportRows.mockResolvedValue({
      filters: { status: "trial_active", query: "", businessType: "", plan: "all", onboarding: "all", registeredFrom: "", registeredTo: "", sort: "newest" },
      businesses: [
        {
          id: "b9458848-23e9-4edd-86c2-07f10ad4170e",
          name: "=Formula",
          type: "Kedai Kopi",
          ownerName: "Owner",
          ownerEmail: "owner@example.com",
          plan: "tumbuh",
          state: "trial_active",
          trialEndsAt: "2026-10-08T00:00:00.000Z",
          currentPeriodEnd: null,
          createdAt: "2026-09-24T00:00:00.000Z",
          outletCount: 1,
          memberCount: 1,
          saleCount: 2,
          grossRevenue: 100000,
          lastActivityAt: null,
          onboardingCompleted: true,
        },
      ],
      truncated: false,
    });
  });

  it("menolak request tanpa sesi", async () => {
    mocks.getRequestSession.mockResolvedValue({ session: null, allowed: false });
    const response = await GET(request());
    expect(response.status).toBe(401);
  });

  it("menolak user yang bukan platform admin", async () => {
    mocks.getRequestSession.mockResolvedValue({ session: adminSession, allowed: false });
    const response = await GET(request());
    expect(response.status).toBe(403);
  });

  it("menghasilkan CSV aman dan mencatat audit export", async () => {
    const response = await GET(request("http://localhost/api/admin/businesses/export?businessType=Kedai"));
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain("daftar-usaha-platform-");
    expect(csv).toContain("'=Formula");
    expect(csv).toContain("Kedai Kopi");
    expect(csv).toContain("BIZ-20260924-B9458848");
    expect(mocks.getExportRows).toHaveBeenCalledWith(expect.objectContaining({ businessType: "Kedai" }));
    expect(mocks.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "business_export" }));
  });
});
