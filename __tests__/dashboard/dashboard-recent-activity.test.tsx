import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";

describe("DashboardRecentActivity", () => {
  it("menampilkan keadaan kosong tanpa data dummy", () => {
    render(<DashboardRecentActivity activities={[]} />);

    expect(screen.getByText("Belum ada aktivitas transaksi")).toBeTruthy();
    expect(screen.queryByText(/TRX-1029/i)).toBeNull();
    expect(screen.queryByText(/Budi/i)).toBeNull();
    expect(screen.queryByText(/Tren Penjualan Naik/i)).toBeNull();
  });

  it("menampilkan transaksi yang diberikan oleh dashboard", () => {
    render(
      <DashboardRecentActivity
        activities={[
          {
            id: "sale-1",
            type: "transaction",
            title: "Transaksi #INV-001",
            description: "Kasir: Rina • QRIS",
            time: "Baru saja",
            amount: 25000,
          },
        ]}
      />,
    );

    expect(screen.getByText("Transaksi #INV-001")).toBeTruthy();
    expect(screen.getByText("Kasir: Rina • QRIS")).toBeTruthy();
    expect(screen.getByText(/Rp\s*25\.000/)).toBeTruthy();
  });
});
