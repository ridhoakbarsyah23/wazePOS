import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardCashflow } from "@/components/dashboard/dashboard-cashflow";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { DashboardSalesChart } from "@/components/dashboard/dashboard-sales-chart";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("P0 dashboard: sinkron angka dan grafik", () => {
  it("metrics mengikuti angka polling arus kas", async () => {
    render(
      <>
        <DashboardMetrics
          currentSales={100_000}
          previousSales={80_000}
          currentTransactions={10}
          previousTransactions={8}
          currentAov={10_000}
          totalStockUnits={0}
          lowStockCount={0}
          outOfStockCount={0}
          lowStockHref="/inventory"
          showStock={false}
        />
        <DashboardCashflow
          selectedPeriod="7d"
          selectedOutletId="all"
          outlets={[{ id: "outlet-1", name: "Gerai Utama" }]}
          defaultOutletId="outlet-1"
          initialIncomeTotal={100_000}
          initialIncomeCount={10}
          initialExpenseTotal={20_000}
          initialExpenseCount={2}
          initialRecent={[]}
        />
      </>,
    );

    expect(screen.getAllByText("Rp 100.000").length).toBeGreaterThan(0);

    const response = {
      period: "7d",
      outletId: "all",
      incomeTotal: 150_000,
      incomeCount: 12,
      expenseTotal: 20_000,
      expenseCount: 2,
      netTotal: 130_000,
      recent: [],
      updatedAt: new Date().toISOString(),
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(screen.getAllByText("Rp 150.000").length).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it("grafik reset ke batang terakhir saat points berganti periode", async () => {
    const first = [
      { key: "2026-09-20", label: "20 Sep", revenue: 50_000, transactions: 5 },
      { key: "2026-09-21", label: "21 Sep", revenue: 70_000, transactions: 7 },
    ];
    const second = [
      { key: "10.00", label: "10.00", revenue: 10_000, transactions: 1 },
      { key: "11.00", label: "11.00", revenue: 30_000, transactions: 3 },
    ];

    const { rerender } = render(<DashboardSalesChart points={first} />);
    fireEvent.click(screen.getByRole("listitem", { name: /20 Sep/ }));
    expect(screen.getAllByText("20 Sep").length).toBeGreaterThan(0);

    rerender(<DashboardSalesChart points={second} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(screen.getAllByText("11.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rp 30.000").length).toBeGreaterThan(0);
  });
});
