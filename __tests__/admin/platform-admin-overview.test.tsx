import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformAdminOverviewPage from "@/app/admin/page";

const { getOverview } = vi.hoisted(() => ({ getOverview: vi.fn() }));
vi.mock("@/server/admin/platform-admin-dashboard", () => ({ getPlatformAdminOverviewData: getOverview }));

function overviewData() {
  return {
    overview: { totalUsers: 12, totalBusinesses: 10, trialActive: 4, trialExpired: 1, activeSubscriptions: 3, expiredSubscriptions: 2 },
    payments: { pendingPayments: 2, paidPayments: 5, paidRevenue: 500000 },
    analytics: { totalSubscriptions: 10, currentActiveSubscriptions: 3, activeSubscriptionRate: 30, activeMrr: 100000, trialEndingSoon: 2, activeSubscriptions: 3, trialActive: 4, trialExpired: 1, pastDue: 0, cancelled: 0 },
    todayFollowUps: {
      today: "2026-09-27",
      total: 1,
      items: [
        {
          businessId: "business-1",
          businessName: "Nest Coffee",
          ownerName: "Owner",
          ownerEmail: "owner@example.com",
          note: "Hubungi kembali soal impor produk.",
          status: "open",
          followUpDate: "2026-09-27",
          authorName: "Platform Admin",
          authorEmail: "admin@wazepos.com",
          createdAt: "2026-09-26T10:00:00.000Z",
        },
      ],
    },
  };
}

describe("Ringkasan platform admin", () => {
  beforeEach(() => { getOverview.mockResolvedValue(overviewData()); });

  it("menghubungkan perhatian ke filter yang tepat dan menjelaskan metrik aktif", async () => {
    render(await PlatformAdminOverviewPage());
    expect(screen.getByRole("link", { name: /Trial segera berakhir/ }).getAttribute("href")).toBe("/admin/subscriptions?state=trial_ending");
    expect(screen.getByRole("link", { name: /Trial sudah berakhir/ }).getAttribute("href")).toBe("/admin/subscriptions?state=trial_expired");
    expect(screen.getByRole("link", { name: /Langganan kedaluwarsa/ }).getAttribute("href")).toBe("/admin/subscriptions?state=subscription_expired");
    expect(screen.getByRole("link", { name: /Menunggu pembayaran/ }).getAttribute("href")).toBe("/admin/payments?status=pending");
    expect(screen.getByRole("heading", { name: "Persentase langganan aktif" })).toBeDefined();
    expect(screen.getByText("3 dari 10 langganan masih aktif.")).toBeDefined();
    expect(screen.getByRole("link", { name: /total akun/i }).getAttribute("href")).toBe("/admin/users");
  });

  it("menjelaskan kategori kosong tanpa peringatan palsu", async () => {
    const data = overviewData();
    data.analytics.trialEndingSoon = 0;
    data.overview.trialExpired = 0;
    data.overview.expiredSubscriptions = 0;
    data.payments.pendingPayments = 0;
    data.analytics.totalSubscriptions = 0;
    data.analytics.currentActiveSubscriptions = 0;
    data.analytics.activeSubscriptionRate = 0;
    data.todayFollowUps = { today: "2026-09-27", total: 0, items: [] };
    getOverview.mockResolvedValue(data);
    render(await PlatformAdminOverviewPage());
    expect(screen.getByText("Tidak ada trial yang berakhir dalam 7 hari.")).toBeDefined();
    expect(screen.getByText("Tidak ada langganan kedaluwarsa.")).toBeDefined();
    expect(screen.getByText("Tidak ada pembayaran yang menunggu.")).toBeDefined();
    expect(screen.getByRole("img", { name: "Persentase langganan aktif 0%" })).toBeDefined();
    expect(screen.getByText(/Tidak ada tindak lanjut untuk hari ini/)).toBeDefined();
  });

  it("menampilkan antrean tindak lanjut hari ini dari catatan terbaru", async () => {
    render(await PlatformAdminOverviewPage());
    expect(screen.getByRole("heading", { name: "Tindak lanjut hari ini" })).toBeDefined();
    expect(screen.getByText("Nest Coffee")).toBeDefined();
    expect(screen.getByText("Hubungi kembali soal impor produk.")).toBeDefined();
    expect(screen.getByRole("link", { name: /Buka tindak lanjut/ }).getAttribute("href")).toBe(
      "/admin/businesses?q=Nest%20Coffee",
    );
  });

  it("menandai jadwal tindak lanjut yang terlewat", async () => {
    const data = overviewData();
    data.todayFollowUps = {
      today: "2026-09-27",
      total: 1,
      items: [{ ...data.todayFollowUps.items[0], followUpDate: "2026-09-25" }],
    };
    getOverview.mockResolvedValue(data);
    render(await PlatformAdminOverviewPage());
    expect(screen.getByText(/Terlewat sejak/)).toBeDefined();
  });
});
