import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  getDetail: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock("@/lib/platform-admin-api", () => ({
  getPlatformAdminRequestSession: mocks.getRequestSession,
}));

vi.mock("@/lib/platform-admin-business-detail", () => ({
  getPlatformAdminBusinessDetail: mocks.getDetail,
}));

vi.mock("@/lib/platform-admin-audit", () => ({
  recordPlatformAdminAudit: mocks.recordAudit,
}));

import { GET } from "@/app/api/admin/businesses/[businessId]/route";

const session = {
  user: { id: "admin-1", name: "Platform Admin", email: "admin@wazepos.com" },
};

const detail = {
  business: {
    id: "business-1",
    name: "Nest Coffee",
    type: "Kedai Kopi",
    onboardingCompleted: true,
    createdAt: "2026-09-24T00:00:00.000Z",
    ownerName: "Owner",
    ownerEmail: "owner@example.com",
    plan: "tumbuh",
    subscriptionStatus: "trialing",
    trialEndsAt: "2026-10-08T00:00:00.000Z",
    currentPeriodEnd: null,
    memberCount: 1,
    outletCount: 1,
    saleCount: 0,
    grossRevenue: 0,
    lastActivityAt: null,
    state: "trial_active",
  },
  outlets: [],
  members: [],
  payments: [],
  activity: { saleCount: 0, grossRevenue: 0, lastSaleAt: null, latestSales: [] },
  auditLog: [],
};

function request() {
  return new Request("http://localhost/api/admin/businesses/business-1");
}

function params() {
  return { params: Promise.resolve({ businessId: "business-1" }) };
}

describe("GET /api/admin/businesses/[businessId]", () => {
  beforeEach(() => {
    mocks.getRequestSession.mockReset();
    mocks.getDetail.mockReset();
    mocks.recordAudit.mockReset();
    mocks.getRequestSession.mockResolvedValue({ session, allowed: true });
    mocks.getDetail.mockResolvedValue(detail);
  });

  it("menolak request tanpa sesi", async () => {
    mocks.getRequestSession.mockResolvedValue({ session: null, allowed: false });
    const response = await GET(request(), params());
    expect(response.status).toBe(401);
  });

  it("menolak user non-admin", async () => {
    mocks.getRequestSession.mockResolvedValue({ session, allowed: false });
    const response = await GET(request(), params());
    expect(response.status).toBe(403);
  });

  it("mengembalikan detail dan mencatat akses", async () => {
    const response = await GET(request(), params());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ detail });
    expect(mocks.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "business_detail_view",
      businessId: "business-1",
    }));
  });
});
