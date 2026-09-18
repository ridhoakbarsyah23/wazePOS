import { and, eq, gte, lt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { DashboardHeader, PeriodKey } from "@/components/dashboard-header";
import { DashboardMetrics } from "@/components/dashboard-metrics";
import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { SubscriptionLockout } from "@/components/subscription-lockout";
import { db } from "@/db";
import { cashShift, category, inventoryStock, outlet, product, sale } from "@/db/schema";
import { getBusinessSubscription, getMembership, requireSession } from "@/lib/auth-session";
import { getSubscriptionStatusDetails, hasPlanFeature, normalizePlan } from "@/lib/plans";

const dayInMilliseconds = 86_400_000;
const jakartaDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date) {
  const parts = Object.fromEntries(
    jakartaDateFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function startOfJakartaDay(date: Date) {
  return new Date(`${dateKey(date)}T00:00:00+07:00`);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; message?: string; period?: string; outlet?: string }>;
}) {
  const feedback = await searchParams;
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");
  if (membership.role === "cashier") redirect("/pos");

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  const subDetails = getSubscriptionStatusDetails(currentSubscription);

  if (!subDetails.isValid) {
    if (membership.role === "owner") {
      redirect("/subscription?expired=1");
    }
    return (
      <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
        <AppHeader
          businessName={membership.businessName}
          role={membership.role}
        />
        <SubscriptionLockout
          businessName={membership.businessName}
          role={membership.role}
          reason={subDetails.message}
        />
      </main>
    );
  }

  const selectedPlan = normalizePlan(currentSubscription?.plan);
  const shiftManagementEnabled = hasPlanFeature(selectedPlan, "shiftManagement");
  const selectedPeriod: PeriodKey =
    feedback.period === "today" || feedback.period === "30d" ? feedback.period : "7d";

  const [categories, outlets, productRows] = await Promise.all([
    db
      .select({
        id: category.id,
        name: category.name,
        productCount: sql<number>`COUNT(${product.id})::int`,
      })
      .from(category)
      .leftJoin(
        product,
        and(eq(product.categoryId, category.id), eq(product.businessId, membership.businessId))
      )
      .where(eq(category.businessId, membership.businessId))
      .groupBy(category.id, category.name)
      .orderBy(category.name),
    db
      .select({
        id: outlet.id,
        name: outlet.name,
        address: outlet.address,
      })
      .from(outlet)
      .where(eq(outlet.businessId, membership.businessId))
      .orderBy(outlet.name),
    db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        costPrice: product.costPrice,
        categoryId: product.categoryId,
        trackStock: product.trackStock,
        isActive: product.isActive,
        categoryName: category.name,
        stockTotal: sql<number>`COALESCE(SUM(${inventoryStock.quantity}), 0)::int`,
      })
      .from(product)
      .leftJoin(category, eq(category.id, product.categoryId))
      .leftJoin(inventoryStock, eq(inventoryStock.productId, product.id))
      .where(eq(product.businessId, membership.businessId))
      .groupBy(
        product.id,
        product.name,
        product.sku,
        product.sellingPrice,
        product.costPrice,
        product.categoryId,
        product.trackStock,
        product.isActive,
        category.name,
        product.createdAt
      )
      .orderBy(product.createdAt),
  ]);

  const selectedOutletId =
    feedback.outlet && outlets.some((item) => item.id === feedback.outlet)
      ? feedback.outlet
      : "all";
  const selectedOutlet = outlets.find((item) => item.id === selectedOutletId);
  const now = new Date();
  const periodDays = selectedPeriod === "today" ? 1 : selectedPeriod === "7d" ? 7 : 30;
  const periodStart = new Date(
    startOfJakartaDay(now).getTime() - (periodDays - 1) * dayInMilliseconds
  );
  const previousStart = new Date(periodStart.getTime() - periodDays * dayInMilliseconds);
  const previousEnd = new Date(now.getTime() - periodDays * dayInMilliseconds);

  const currentFilters = [
    eq(sale.businessId, membership.businessId),
    eq(sale.status, "completed"),
    gte(sale.createdAt, periodStart),
    lt(sale.createdAt, now),
  ];
  const previousFilters = [
    eq(sale.businessId, membership.businessId),
    eq(sale.status, "completed"),
    gte(sale.createdAt, previousStart),
    lt(sale.createdAt, previousEnd),
  ];
  if (selectedOutletId !== "all") {
    currentFilters.push(eq(sale.outletId, selectedOutletId));
    previousFilters.push(eq(sale.outletId, selectedOutletId));
  }

  const bucketExpression =
    selectedPeriod === "today"
      ? sql<string>`to_char(timezone('Asia/Jakarta', ${sale.createdAt}), 'HH24')`
      : sql<string>`to_char(timezone('Asia/Jakarta', ${sale.createdAt}), 'YYYY-MM-DD')`;

  const stockFilters = [
    eq(inventoryStock.businessId, membership.businessId),
    eq(product.businessId, membership.businessId),
    eq(product.trackStock, true),
  ];
  if (selectedOutletId !== "all") {
    stockFilters.push(eq(inventoryStock.outletId, selectedOutletId));
  }

  const [currentTotals, previousTotals, trendRows, stockRows, currentShift] = await Promise.all([
    db
      .select({
        revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
        transactions: sql<number>`COUNT(*)::int`,
      })
      .from(sale)
      .where(and(...currentFilters)),
    db
      .select({
        revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
        transactions: sql<number>`COUNT(*)::int`,
      })
      .from(sale)
      .where(and(...previousFilters)),
    db
      .select({
        bucket: bucketExpression,
        revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
        transactions: sql<number>`COUNT(*)::int`,
      })
      .from(sale)
      .where(and(...currentFilters))
      .groupBy(bucketExpression)
      .orderBy(bucketExpression),
    db
      .select({
        quantity: inventoryStock.quantity,
        threshold: inventoryStock.lowStockThreshold,
      })
      .from(inventoryStock)
      .innerJoin(product, eq(product.id, inventoryStock.productId))
      .where(and(...stockFilters)),
    shiftManagementEnabled
      ? db
          .select({
            id: cashShift.id,
            outletId: cashShift.outletId,
            openingCash: cashShift.openingCash,
            openedAt: cashShift.openedAt,
          })
          .from(cashShift)
          .where(
            and(
              eq(cashShift.businessId, membership.businessId),
              eq(cashShift.cashierId, session.user.id),
              eq(cashShift.status, "open")
            )
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const currentRevenue = Number(currentTotals[0]?.revenue ?? 0);
  const currentTransactions = Number(currentTotals[0]?.transactions ?? 0);
  const previousRevenue = Number(previousTotals[0]?.revenue ?? 0);
  const previousTransactions = Number(previousTotals[0]?.transactions ?? 0);
  const currentAverage =
    currentTransactions > 0 ? Math.round(currentRevenue / currentTransactions) : 0;

  const totalStock = stockRows.reduce((sum, item) => sum + Number(item.quantity), 0);
  const lowStockCount = stockRows.filter(
    (item) => Number(item.quantity) <= Number(item.threshold)
  ).length;

  const trendMap = new Map(trendRows.map((item) => [item.bucket, item]));
  const currentJakartaHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now)
  );

  const chartPoints =
    selectedPeriod === "today"
      ? Array.from({ length: currentJakartaHour + 1 }, (_, hour) => {
          const key = hour.toString().padStart(2, "0");
          const point = trendMap.get(key);
          return {
            key,
            label: `${key}.00`,
            revenue: Number(point?.revenue ?? 0),
            transactions: Number(point?.transactions ?? 0),
          };
        })
      : Array.from({ length: periodDays }, (_, index) => {
          const date = new Date(periodStart.getTime() + index * dayInMilliseconds);
          const key = dateKey(date);
          const point = trendMap.get(key);
          const label = new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            ...(selectedPeriod === "7d"
              ? { weekday: "short" as const }
              : { day: "numeric" as const, month: "short" as const }),
          }).format(date);
          return {
            key,
            label,
            revenue: Number(point?.revenue ?? 0),
            transactions: Number(point?.transactions ?? 0),
          };
        });


  const periodLabels: Record<PeriodKey, string> = {
    today: "Hari Ini",
    "7d": "7 Hari Terakhir",
    "30d": "30 Hari Terakhir",
  };

  const currentOutletName =
    selectedOutlet?.name ??
    (selectedOutletId === "all" ? "Semua Gerai" : outlets[0]?.name ?? "Gerai Utama");

  return (
    <AppHeader
      businessName={membership.businessName}
      outletName={currentOutletName}
      outlets={outlets}
      activeOutletId={selectedOutletId === "all" ? undefined : selectedOutletId}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
    >
      <div className="mx-auto w-[min(1240px,calc(100%-32px))] py-8 space-y-6 animate-page-enter">
        {/* Executive Merchant Cockpit & Filter Header */}
        <DashboardHeader
          userName={session.user.name ?? "Pemilik Toko"}
          businessName={membership.businessName}
          activeOutletName={currentOutletName}
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          selectedPeriod={selectedPeriod}
          trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
          currentPlan={selectedPlan}
        />

        {/* Cohesive Fintech Metric Cards */}
        <DashboardMetrics
          currentSales={currentRevenue}
          previousSales={previousRevenue}
          currentTransactions={currentTransactions}
          previousTransactions={previousTransactions}
          currentAov={currentAverage}
          totalStockUnits={totalStock}
          lowStockCount={lowStockCount}
        />

        {/* Master Control Workspace: 4 Cohesive Tabs (Overview, Products, Categories, Outlets) */}
        <DashboardWorkspace
          chartPoints={chartPoints}
          periodLabel={periodLabels[selectedPeriod]}
          currentTransactions={currentTransactions}
          currentShift={currentShift}
          shiftManagementEnabled={shiftManagementEnabled}
          initialProducts={productRows.map((p) => ({
            ...p,
            sellingPrice: Number(p.sellingPrice),
            costPrice: Number(p.costPrice || 0),
            stockTotal: Number(p.stockTotal),
          }))}
          initialCategories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            productCount: Number(c.productCount ?? 0),
          }))}
          initialOutlets={outlets}
          selectedOutletId={selectedOutletId}
        />
      </div>

      <AppFooter businessName={membership.businessName} />
    </AppHeader>
  );
}
