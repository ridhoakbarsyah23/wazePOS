import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  getExportRows: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock("@/lib/admin/platform-admin-api", () => ({
  getPlatformAdminRequestSession: mocks.getRequestSession,
}));

vi.mock("@/lib/admin/platform-admin-payments", () => ({
  getPlatformAdminPaymentExportRows: mocks.getExportRows,
}));

vi.mock("@/lib/admin/platform-admin-audit", () => ({
  recordPlatformAdminAudit: mocks.recordAudit,
}));

import { GET } from "@/app/api/admin/payments/export/route";

const adminSession = {
  user: { id: "admin-1", name: "Platform Admin", email: "admin@wazepos.com" },
};

describe("GET /api/admin/payments/export", () => {
  beforeEach(() => {
    mocks.getRequestSession.mockReset();
    mocks.getExportRows.mockReset();
    mocks.recordAudit.mockReset();
    mocks.getRequestSession.mockResolvedValue({ session: adminSession, allowed: true });
    mocks.getExportRows.mockResolvedValue({
      filters: { query: "", status: "paid", plan: "all" },
      payments: [
        {
          id: "pay-1",
          businessId: "biz-1",
          businessName: "=Formula",
          ownerEmail: "owner@example.com",
          plan: "tumbuh",
          amount: 450000,
          currency: "IDR",
          status: "paid",
          provider: "midtrans",
          providerOrderId: "WAZE-2026-0001",
          providerPaymentType: "qris",
          createdAt: "2026-09-24T10:00:00.000Z",
          paidAt: "2026-09-24T10:05:00.000Z",
        },
      ],
      truncated: false,
    });
  });

  it("menolak user yang bukan platform admin", async () => {
    mocks.getRequestSession.mockResolvedValue({ session: adminSession, allowed: false });
    const response = await GET(new Request("http://localhost/api/admin/payments/export"));
    expect(response.status).toBe(403);
  });

  it("menghasilkan CSV aman dan mencatat audit payment_export", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/payments/export?status=paid"),
    );
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(csv).toContain("'=Formula");
    expect(csv).toContain("WAZE-2026-0001");
    expect(mocks.getExportRows).toHaveBeenCalledWith(expect.objectContaining({ status: "paid" }));
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payment_export", entityType: "payment_directory" }),
    );
  });
});
