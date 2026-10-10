import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformAdminAuditList } from "@/components/admin/platform-admin-audit-list";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const logs = [
  {
    id: "audit-1",
    action: "business_detail_view",
    entityType: "business",
    entityId: "biz-1",
    businessId: "biz-1",
    businessName: "Nest Coffee",
    actorName: "Admin",
    actorEmail: "admin@wazepos.com",
    createdAt: new Date("2026-09-24T10:00:00.000Z"),
    metadata: null,
  },
  {
    id: "audit-2",
    action: "payment_verified",
    entityType: "payment",
    entityId: "pay-1",
    businessId: "biz-1",
    businessName: "Nest Coffee",
    actorName: "Admin",
    actorEmail: "admin@wazepos.com",
    createdAt: new Date("2026-09-24T10:05:00.000Z"),
    metadata: {
      decision: "approve",
      plan: "bisnis",
      amount: 199000,
      orderId: "WAZE-2026-0001",
      note: "Bukti sesuai mutasi",
    },
  },
];

describe("PlatformAdminAuditList", () => {
  it("menampilkan jejak audit dan pagination dengan filter", () => {
    render(
      <PlatformAdminAuditList
        logs={logs}
        filters={{ query: "Nest", action: "business_detail_view" }}
        pagination={{ total: 16, page: 1, pageSize: 15, totalPages: 2, from: 1, to: 15 }}
        auditAvailable
      />,
    );

    expect(screen.getByRole("heading", { name: "Jejak audit" })).toBeDefined();
    expect(screen.getAllByText("Detail usaha dibuka").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "2" }).getAttribute("href")).toBe(
      "/admin/audit?q=Nest&action=business_detail_view&page=2",
    );
  });

  it("memberi tahu saat tabel audit belum tersedia", () => {
    render(
      <PlatformAdminAuditList
        logs={[]}
        filters={{ query: "", action: "all" }}
        pagination={{ total: 0, page: 1, pageSize: 15, totalPages: 1, from: 0, to: 0 }}
        auditAvailable={false}
      />,
    );

    expect(screen.getByText(/Tabel audit belum tersedia/)).toBeDefined();
  });

  it("menampilkan detail metadata pembayaran dan siap dark mode", () => {
    render(
      <PlatformAdminAuditList
        logs={logs}
        filters={{ query: "", action: "all" }}
        pagination={{ total: 2, page: 1, pageSize: 15, totalPages: 1, from: 1, to: 2 }}
        auditAvailable
      />,
    );

    expect(screen.getAllByText("Keputusan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Disetujui").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("wazePOS Bisnis").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("WAZE-2026-0001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("region", { name: "Tabel jejak audit" }).closest("section")?.className).toContain("dark:bg-[#0d0d0d]");
    expect(screen.getByLabelText("Cari admin, usaha, atau entity").className).toContain("dark:bg-[#101010]");
  });
});
