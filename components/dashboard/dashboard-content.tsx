import { DashboardHeader, type PeriodKey } from "@/components/dashboard/dashboard-header";
import { DashboardCashflow } from "@/components/dashboard/dashboard-cashflow";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { DashboardInsights } from "@/components/dashboard/dashboard-insights";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { getDashboardData } from "@/server/services/dashboard.service";

export async function DashboardContent({
  membership,
  session,
  subDetails,
  selectedPlan,
  canViewReports,
  canManageOutlets,
  canManageInventory,
  canUseCashflow,
  selectedPeriod,
  outlets,
  selectedOutletId,
  selectedOutlet,
  currentOutletName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) {
  
  const data = await getDashboardData({
    businessId: membership.businessId,
    selectedPeriod,
    selectedOutletId,
    canUseCashflow,
  });

  const lowStockHref =
    selectedOutletId === "all"
      ? "/inventory?status=low"
      : `/inventory?status=low&outlet=${encodeURIComponent(selectedOutletId)}`;

  const periodLabels: Record<PeriodKey, string> = {
    today: "Hari Ini",
    "7d": "7 Hari Terakhir",
    "30d": "30 Hari Terakhir",
  };
  const currentPeriodKey = selectedPeriod as PeriodKey;

  return (
    <div className="dash-warung mx-auto w-[min(1240px,calc(100%-32px))] py-8 space-y-4 sm:space-y-6 animate-page-enter">
      <DashboardHeader
        userName={session.user.name ?? "Pemilik Toko"}
        businessName={membership.businessName}
        activeOutletName={currentOutletName}
        outlets={outlets}
        selectedOutletId={selectedOutletId}
        selectedOutletSlug={selectedOutlet?.slug}
        selectedPeriod={selectedPeriod}
        trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
        currentPlan={selectedPlan}
        showOutletFilter={canManageOutlets}
      />

      <DashboardMetrics
        currentSales={data.currentRevenue}
        previousSales={data.previousRevenue}
        currentTransactions={data.currentTransactions}
        previousTransactions={data.previousTransactions}
        currentAov={data.currentAverage}
        totalStockUnits={data.totalStock}
        lowStockCount={data.lowStockCount}
        outOfStockCount={data.outOfStockCount}
        lowStockHref={lowStockHref}
        showStock={canManageInventory}
      />

      {canUseCashflow && data.expenseUnavailable && (
        <p className="m-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
          Fitur uang keluar belum aktif di database production. Jalankan migrasi terbaru lalu muat ulang halaman ini.
        </p>
      )}
      {canUseCashflow && (
        <DashboardCashflow
          selectedPeriod={selectedPeriod}
          selectedOutletId={selectedOutletId}
          outlets={outlets.map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }))}
          defaultOutletId={selectedOutletId !== "all" ? selectedOutletId : outlets[0]?.id ?? "all"}
          initialIncomeTotal={data.currentRevenue}
          initialIncomeCount={data.currentTransactions}
          initialExpenseTotal={data.currentExpenseTotal}
          initialExpenseCount={data.currentExpenseCount}
          initialRecent={data.expenseRecent}
          initialExpenseUnavailable={data.expenseUnavailable}
        />
      )}

      {canViewReports && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <DashboardInsights
              periodLabel={periodLabels[currentPeriodKey]}
              topProducts={data.insightTopProducts}
              hourPoints={data.insightHourPoints}
              outletPerformance={data.insightOutletPerformance}
            />
          </div>
          <div className="lg:col-span-1">
            <DashboardRecentActivity activities={data.recentActivities} />
          </div>
        </div>
      )}

      <DashboardOverview
        chartPoints={data.chartPoints}
        periodLabel={periodLabels[currentPeriodKey]}
        currentTransactions={data.currentTransactions}
        selectedOutletId={selectedOutletId}
        selectedOutletSlug={selectedOutlet?.slug}
        showSalesChart={canViewReports}
        showReportsAction={canViewReports}
        showInventoryAction={canManageInventory}
      />
    </div>
  );
}
