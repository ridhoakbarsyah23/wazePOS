import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformAdminBusinessList } from "@/components/admin/platform-admin-business-list";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

const businesses = [
  {
    id: "b9458848-23e9-4edd-86c2-07f10ad4170e",
    name: "Nest Coffee",
    type: "Kedai Kopi",
    onboardingCompleted: true,
    createdAt: new Date("2026-09-24T00:00:00.000Z"),
    ownerName: "Ridho Akbarsyah",
    ownerEmail: "ridho@example.com",
    plan: "tumbuh" as const,
    subscriptionStatus: "trialing" as const,
    trialEndsAt: new Date("2026-10-08T00:00:00.000Z"),
    currentPeriodEnd: null,
    memberCount: 2,
    outletCount: 1,
    state: "trial_active" as const,
  },
];

const detailResponse = {
  business: {
    ...businesses[0],
    lastActivityAt: null,
    saleCount: 0,
    grossRevenue: 0,
  },
  outlets: [],
  members: [],
  payments: [],
  activity: { saleCount: 0, grossRevenue: 0, lastSaleAt: null, latestSales: [] },
  auditLog: [],
};

beforeEach(() => {
  mocks.replace.mockClear();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ detail: detailResponse }),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlatformAdminBusinessList", () => {
  it("menyediakan tabel desktop dan ringkasan kartu mobile", () => {
    render(
      <PlatformAdminBusinessList
        businesses={businesses}
        filters={{ query: "", status: "all" }}
        overview={{ expiredSubscriptions: 1, pastDue: 2, cancelled: 3 }}
        directory={{ total: 1, page: 1, pageSize: 10, totalPages: 1, from: 1, to: 1 }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Daftar usaha" })).toBeDefined();
    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getAllByText("Nest Coffee").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("1 data")).toBeDefined();
    expect(screen.getByText(/maksimal 10 per halaman/)).toBeDefined();
    expect(screen.getByText("Langganan berakhir:")).toBeDefined();
  });

  it("membuka detail usaha dalam dialog kustom", async () => {
    render(
      <PlatformAdminBusinessList
        businesses={businesses}
        filters={{ query: "", status: "all" }}
        overview={{ expiredSubscriptions: 0, pastDue: 0, cancelled: 0 }}
        directory={{ total: 1, page: 1, pageSize: 10, totalPages: 1, from: 1, to: 1 }}
      />,
    );

    const detailButtons = screen.getAllByRole("button", { name: "Lihat detail Nest Coffee" });
    expect(detailButtons).toHaveLength(2);
    fireEvent.click(detailButtons[0]);

    expect(screen.getByRole("alertdialog")).toBeDefined();
    expect(screen.getByText("Detail usaha")).toBeDefined();
    expect(await screen.findByText("Kode usaha")).toBeDefined();
    expect(screen.getAllByText("BIZ-20260924-B9458848").length).toBeGreaterThan(0);
  });

  it("menampilkan navigasi pagination dengan filter yang dipertahankan", () => {
    render(
      <PlatformAdminBusinessList
        businesses={businesses}
        filters={{ query: "Nest", status: "trial_active" }}
        overview={{ expiredSubscriptions: 0, pastDue: 0, cancelled: 0 }}
        directory={{ total: 11, page: 1, pageSize: 10, totalPages: 2, from: 1, to: 10 }}
      />,
    );

    expect(screen.getByRole("link", { name: "2" }).getAttribute("href")).toBe(
      "/admin/businesses?q=Nest&status=trial_active&page=2",
    );
  });

  it("mempertahankan filter tambahan pada pagination dan export", () => {
    render(
      <PlatformAdminBusinessList
        businesses={businesses}
        filters={{
          query: "Nest",
          status: "trial_active",
          businessType: "Kedai",
          plan: "tumbuh",
          onboarding: "completed",
          registeredFrom: "2026-01-01",
          registeredTo: "2026-12-31",
          sort: "activity",
        }}
        overview={{ expiredSubscriptions: 0, pastDue: 0, cancelled: 0 }}
        directory={{ total: 11, page: 1, pageSize: 10, totalPages: 2, from: 1, to: 10 }}
      />,
    );

    expect(screen.getByRole("link", { name: "2" }).getAttribute("href")).toBe(
      "/admin/businesses?q=Nest&status=trial_active&businessType=Kedai&plan=tumbuh&onboarding=completed&registeredFrom=2026-01-01&registeredTo=2026-12-31&sort=activity&page=2",
    );
    expect(screen.getByRole("link", { name: "Export CSV" }).getAttribute("href")).toBe(
      "/api/admin/businesses/export?q=Nest&status=trial_active&businessType=Kedai&plan=tumbuh&onboarding=completed&registeredFrom=2026-01-01&registeredTo=2026-12-31&sort=activity",
    );
  });

  it("menampilkan tombol reset yang mengembalikan filter ke kondisi awal", () => {
    render(
      <PlatformAdminBusinessList
        businesses={businesses}
        filters={{ query: "", status: "all" }}
        overview={{ expiredSubscriptions: 0, pastDue: 0, cancelled: 0 }}
        directory={{ total: 1, page: 1, pageSize: 10, totalPages: 1, from: 1, to: 1 }}
      />,
    );

    expect(screen.getByRole("button", { name: "Reset filter" })).toBeDefined();
  });

  it("mengembalikan perubahan input ke default saat reset", () => {
    render(
      <PlatformAdminBusinessList
        businesses={businesses}
        filters={{ query: "", status: "all" }}
        overview={{ expiredSubscriptions: 0, pastDue: 0, cancelled: 0 }}
        directory={{ total: 1, page: 1, pageSize: 10, totalPages: 1, from: 1, to: 1 }}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Cari usaha, owner, atau email") as HTMLInputElement;
    const businessTypeInput = screen.getByLabelText("Filter jenis usaha") as HTMLInputElement;
    const statusSelect = screen.getByLabelText("Filter status subscription") as HTMLSelectElement;

    fireEvent.change(searchInput, { target: { value: "Nest" } });
    fireEvent.change(businessTypeInput, { target: { value: "Kedai Kopi" } });
    fireEvent.change(statusSelect, { target: { value: "trial_active" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset filter" }));

    expect(searchInput.value).toBe("");
    expect(businessTypeInput.value).toBe("");
    expect(statusSelect.value).toBe("all");
    expect(mocks.replace).toHaveBeenCalledWith("/admin/businesses");
  });
});
