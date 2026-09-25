import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformAdminPaymentList } from "@/components/admin/platform-admin-payment-list";

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

const payments = [
  {
    id: "pay-1",
    businessId: "biz-1",
    businessName: "Nest Coffee",
    ownerEmail: "ridho@example.com",
    plan: "tumbuh" as const,
    amount: 450000,
    currency: "IDR",
    provider: "midtrans",
    providerOrderId: "WAZE-2026-0001",
    providerPaymentType: "qris",
    status: "paid" as const,
    createdAt: new Date("2026-09-24T10:00:00.000Z"),
    paidAt: new Date("2026-09-24T10:05:00.000Z"),
  },
];

const summary = {
  pendingPayments: 1,
  paidPayments: 2,
  paidRevenue: 900000,
  failedPayments: 0,
  expiredPayments: 0,
};

describe("PlatformAdminPaymentList", () => {
  it("menampilkan tabel pembayaran dan pagination dengan filter", () => {
    render(
      <PlatformAdminPaymentList
        payments={payments}
        filters={{ query: "Nest", status: "paid", plan: "tumbuh" }}
        summary={summary}
        pagination={{ total: 11, page: 1, pageSize: 10, totalPages: 2, from: 1, to: 10 }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Daftar pembayaran" })).toBeDefined();
    expect(screen.getAllByText("Nest Coffee").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: "2" }).getAttribute("href")).toBe(
      "/admin/payments?q=Nest&status=paid&plan=tumbuh&page=2",
    );
  });

  it("menampilkan status kosong yang sesuai filter", () => {
    render(
      <PlatformAdminPaymentList
        payments={[]}
        filters={{ query: "", status: "all", plan: "all" }}
        summary={{ ...summary, paidPayments: 0, paidRevenue: 0 }}
        pagination={{ total: 0, page: 1, pageSize: 10, totalPages: 1, from: 0, to: 0 }}
      />,
    );

    expect(screen.getByText("Belum ada pembayaran yang tercatat.")).toBeDefined();
  });
});
