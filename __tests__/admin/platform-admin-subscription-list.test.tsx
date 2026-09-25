import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformAdminSubscriptionList } from "@/components/admin/platform-admin-subscription-list";

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

const subscriptions = [
  {
    id: "sub-1",
    businessId: "biz-1",
    businessName: "Nest Coffee",
    businessType: "Kedai Kopi",
    ownerName: "Ridho Akbarsyah",
    ownerEmail: "ridho@example.com",
    plan: "tumbuh" as const,
    status: "trialing" as const,
    trialEndsAt: new Date("2026-10-08T00:00:00.000Z"),
    currentPeriodStart: null,
    currentPeriodEnd: null,
    createdAt: new Date("2026-09-24T00:00:00.000Z"),
    state: "trial_active" as const,
  },
];

const summary = {
  total: 11,
  trialActive: 5,
  trialExpired: 1,
  active: 3,
  expired: 0,
  pastDue: 1,
  cancelled: 1,
  trialEndingSoon: 2,
};

describe("PlatformAdminSubscriptionList", () => {
  it("menampilkan tabel langganan dan pagination dengan filter", () => {
    render(
      <PlatformAdminSubscriptionList
        subscriptions={subscriptions}
        filters={{ query: "Nest", state: "trial_active", plan: "tumbuh" }}
        summary={summary}
        pagination={{ total: 11, page: 1, pageSize: 10, totalPages: 2, from: 1, to: 10 }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Daftar langganan" })).toBeDefined();
    expect(screen.getAllByText("Nest Coffee").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: "2" }).getAttribute("href")).toBe(
      "/admin/subscriptions?q=Nest&state=trial_active&plan=tumbuh&page=2",
    );
  });

  it("menampilkan status kosong yang sesuai filter", () => {
    render(
      <PlatformAdminSubscriptionList
        subscriptions={[]}
        filters={{ query: "tidak ada", state: "all", plan: "all" }}
        summary={{ ...summary, total: 0 }}
        pagination={{ total: 0, page: 1, pageSize: 10, totalPages: 1, from: 0, to: 0 }}
      />,
    );

    expect(screen.getByRole("status")).toBeDefined();
  });
});
