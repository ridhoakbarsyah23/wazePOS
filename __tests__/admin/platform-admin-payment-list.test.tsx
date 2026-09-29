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
    provider: "bank_transfer",
    providerOrderId: "WAZE-2026-0001",
    status: "paid" as const,
    senderBank: "BCA",
    senderAccountName: "Nest Coffee",
    proofUploaded: true,
    transferProofUploadedAt: new Date("2026-09-24T10:04:00.000Z"),
    verifiedBy: "admin@wazepos.com",
    verifiedAt: new Date("2026-09-24T10:06:00.000Z"),
    verificationNote: null,
    disbursedAt: null,
    disbursedBy: null,
    disbursementReference: null,
    disbursementNote: null,
    createdAt: new Date("2026-09-24T10:00:00.000Z"),
    paidAt: new Date("2026-09-24T10:05:00.000Z"),
  },
];

const summary = {
  pendingPayments: 1,
  paidPayments: 2,
  paidRevenue: 900000,
  disbursedPayments: 1,
  disbursedRevenue: 450000,
  pendingDisbursementPayments: 1,
  pendingDisbursementRevenue: 450000,
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
        summary={{ ...summary, paidPayments: 0, paidRevenue: 0, disbursedPayments: 0, disbursedRevenue: 0, pendingDisbursementPayments: 0, pendingDisbursementRevenue: 0 }}
        pagination={{ total: 0, page: 1, pageSize: 10, totalPages: 1, from: 0, to: 0 }}
      />,
    );

    expect(screen.getByText("Belum ada pembayaran yang tercatat.")).toBeDefined();
  });

  it("menampilkan ringkasan pencairan dan aksi tandai dicairkan untuk pembayaran paid", () => {
    render(
      <PlatformAdminPaymentList
        payments={payments}
        filters={{ query: "", status: "paid", plan: "all" }}
        summary={summary}
        pagination={{ total: 1, page: 1, pageSize: 10, totalPages: 1, from: 1, to: 1 }}
      />,
    );

    expect(screen.getByText(/Siap dicairkan:/)).toBeDefined();
    expect(screen.getByText(/Sudah dicairkan:/)).toBeDefined();
    // Tombol dirender di tabel desktop dan kartu mobile sekaligus di jsdom.
    expect(screen.getAllByRole("button", { name: "Tandai dicairkan" }).length).toBeGreaterThanOrEqual(1);
  });
});
