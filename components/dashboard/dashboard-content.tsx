import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import { DashboardHeader, type PeriodKey } from "@/components/dashboard/dashboard-header";
import { DashboardCashflow } from "@/components/dashboard/dashboard-cashflow";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { DashboardInsights } from "@/components/dashboard/dashboard-insights";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { db } from "@/db";
import { cashExpense, inventoryStock, outlet, product, sale, saleItem, user } from "@/db/schema";
import { isMissingSchemaError } from "@/server/db/schema-errors";


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
  if (selectedOutletId !== "all") {
    currentFilters.push(eq(sale.outletId, selectedOutletId));
  }

  const combinedTotalsFilters = [
    eq(sale.businessId, membership.businessId),
    eq(sale.status, "completed"),
    gte(sale.createdAt, previousStart),
    lt(sale.createdAt, now),
    or(gte(sale.createdAt, periodStart), lt(sale.createdAt, previousEnd)),
  ];
  if (selectedOutletId !== "all") {
    combinedTotalsFilters.push(eq(sale.outletId, selectedOutletId));
  }

  const bucketExpression =
    selectedPeriod === "today"
      ? sql<string>`to_char(timezone('Asia/Jakarta', ${sale.createdAt}), 'HH24')`
      : sql<string>`to_char(timezone('Asia/Jakarta', ${sale.createdAt}), 'YYYY-MM-DD')`;
  const hourExpression = sql<string>`to_char(timezone('Asia/Jakarta', ${sale.createdAt}), 'HH24')`;

  const stockFilters = [
    eq(inventoryStock.businessId, membership.businessId),
    eq(product.businessId, membership.businessId),
    eq(product.trackStock, true),
  ];
  if (selectedOutletId !== "all") {
    stockFilters.push(eq(inventoryStock.outletId, selectedOutletId));
  }

  const expenseFilters = [
    eq(cashExpense.businessId, membership.businessId),
    gte(cashExpense.spentAt, periodStart),
    lt(cashExpense.spentAt, now),
  ];
  if (selectedOutletId !== "all") {
    expenseFilters.push(eq(cashExpense.outletId, selectedOutletId));
  }

  const [periodRows, stockRows, topProductRows, trendRows, outletRows, expenseResults, recentActivitiesRows] = await Promise.all([
    db
      .select({
        bucket: sql<string>`case
          when ${sale.createdAt} >= ${periodStart.toISOString()} then 'current'
          else 'previous' end`.as("period"),
        revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
        transactions: sql<number>`COUNT(*)::int`,
      })
      .from(sale)
      .where(and(...combinedTotalsFilters))
      .groupBy(sql`1`) 
      .orderBy(sql`1`),
    db
      .select({
        productId: product.id,
        quantity: inventoryStock.quantity,
        threshold: inventoryStock.lowStockThreshold,
      })
      .from(inventoryStock)
      .innerJoin(product, eq(product.id, inventoryStock.productId))
      .where(and(...stockFilters)),
    db
      .select({
        productId: saleItem.productId,
        productName: saleItem.productName,
        quantitySold: sql<number>`COALESCE(SUM(${saleItem.quantity}), 0)::int`,
        revenue: sql<number>`COALESCE(SUM(${saleItem.subtotal}), 0)::int`,
        costTotal: sql<number>`COALESCE(SUM(${saleItem.quantity} * ${saleItem.unitCost}), 0)::int`,
        missingCostCount: sql<number>`COUNT(*) FILTER (WHERE ${saleItem.unitCost} IS NULL)::int`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .where(and(...currentFilters))
      .groupBy(saleItem.productId, saleItem.productName)
      .orderBy(sql`SUM(${saleItem.quantity}) DESC`)
      .limit(5),
    db
      .select({
        bucket: bucketExpression,
        hour: hourExpression,
        revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
        transactions: sql<number>`COUNT(*)::int`,
      })
      .from(sale)
      .where(and(...currentFilters))
      .groupBy(bucketExpression, hourExpression)
      .orderBy(bucketExpression),
    db
      .select({
        id: outlet.id,
        name: outlet.name,
        revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
        transactions: sql<number>`COUNT(${sale.id})::int`,
      })
      .from(outlet)
      .leftJoin(
        sale,
        and(
          eq(sale.outletId, outlet.id),
          eq(sale.status, "completed"),
          gte(sale.createdAt, periodStart),
          lt(sale.createdAt, now)
        )
      )
      .where(eq(outlet.businessId, membership.businessId))
      .groupBy(outlet.id, outlet.name)
      .orderBy(outlet.name),
    (async () => {
      if (!canUseCashflow) {
        return { expenseTotalRows: [], expenseRecentRows: [], unavailable: false };
      }
      try {
        const [expenseTotalRows, expenseRecentRows] = await Promise.all([
          db
            .select({
              total: sql<number>`COALESCE(SUM(${cashExpense.amount}), 0)::int`,
              count: sql<number>`COUNT(*)::int`,
            })
            .from(cashExpense)
            .where(and(...expenseFilters)),
          db
            .select({
              id: cashExpense.id,
              amount: cashExpense.amount,
              category: cashExpense.category,
              note: cashExpense.note,
              spentAt: cashExpense.spentAt,
              outletId: cashExpense.outletId,
            })
            .from(cashExpense)
            .where(and(...expenseFilters))
            .orderBy(desc(cashExpense.spentAt), desc(cashExpense.createdAt))
            .limit(5),
        ]);
        return { expenseTotalRows, expenseRecentRows, unavailable: false };
      } catch (error) {
        if (!isMissingSchemaError(error)) throw error;
        console.error("Dashboard tanpa data pengeluaran: tabel cash_expense belum dimigrasi.", error);
        return { expenseTotalRows: [], expenseRecentRows: [], unavailable: true };
      }
    })(),
    db
      .select({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        cashierName: user.name,
        createdAt: sale.createdAt,
      })
      .from(sale)
      .leftJoin(user, eq(sale.cashierId, user.id))
      .where(and(...currentFilters))
      .orderBy(desc(sale.createdAt))
      .limit(5),
  ]);
  const expenseTotalRows = expenseResults.expenseTotalRows;
  const expenseRecentRows = expenseResults.expenseRecentRows;
  const expenseUnavailable = expenseResults.unavailable;

  const recentActivities = recentActivitiesRows.map((row) => {
    const diffMins = Math.max(0, Math.round((now.getTime() - row.createdAt.getTime()) / 60000));
    let timeStr = "";
    if (diffMins === 0) timeStr = "Baru saja";
    else if (diffMins < 60) timeStr = `${diffMins} menit yang lalu`;
    else if (diffMins < 1440) timeStr = `${Math.floor(diffMins / 60)} jam yang lalu`;
    else timeStr = `${Math.floor(diffMins / 1440)} hari yang lalu`;
    
    return {
      id: row.id,
      type: "transaction" as const,
      title: `Transaksi #${row.invoiceNumber}`,
      description: `Kasir: ${row.cashierName || "Sistem"} • ${row.paymentMethod.toUpperCase()}`,
      time: timeStr,
      amount: row.total,
    };
  });

  const currentPeriodRow = periodRows.find((item) => item.bucket === "current");
  const previousPeriodRow = periodRows.find((item) => item.bucket === "previous");
  const currentRevenue = Number(currentPeriodRow?.revenue ?? 0);
  const currentTransactions = Number(currentPeriodRow?.transactions ?? 0);
  const previousRevenue = Number(previousPeriodRow?.revenue ?? 0);
  const previousTransactions = Number(previousPeriodRow?.transactions ?? 0);
  const currentAverage =
    currentTransactions > 0 ? Math.round(currentRevenue / currentTransactions) : 0;
  const currentExpenseTotal = Number(expenseTotalRows[0]?.total ?? 0);
  const currentExpenseCount = Number(expenseTotalRows[0]?.count ?? 0);
  const expenseRecent = expenseRecentRows.map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    category: row.category,
    note: row.note,
    spentAt: row.spentAt instanceof Date ? row.spentAt.toISOString() : String(row.spentAt),
    outletId: row.outletId,
  }));

  const totalStock = stockRows.reduce((sum, item) => sum + Number(item.quantity), 0);
  const outOfStockProductIds = new Set(
    stockRows
      .filter((item) => Number(item.quantity) <= 0)
      .map((item) => item.productId)
  );
  const lowStockProductIds = new Set(
    stockRows
      .filter(
        (item) =>
          Number(item.quantity) > 0 &&
          Number(item.quantity) <= Number(item.threshold) &&
          !outOfStockProductIds.has(item.productId)
      )
      .map((item) => item.productId)
  );
  const outOfStockCount = outOfStockProductIds.size;
  const lowStockCount = lowStockProductIds.size;
  const lowStockHref =
    selectedOutletId === "all"
      ? "/inventory?status=low"
      : `/inventory?status=low&outlet=${encodeURIComponent(selectedOutletId)}`;

  const trendMap = new Map<string, { revenue: number; transactions: number }>();
  const hourMap = new Map<string, { revenue: number; transactions: number }>();
  for (const row of trendRows) {
    const rowRevenue = Number(row.revenue);
    const rowTransactions = Number(row.transactions);

    const trendEntry = trendMap.get(row.bucket);
    if (trendEntry) {
      trendEntry.revenue += rowRevenue;
      trendEntry.transactions += rowTransactions;
    } else {
      trendMap.set(row.bucket, { revenue: rowRevenue, transactions: rowTransactions });
    }

    const hourEntry = hourMap.get(row.hour);
    if (hourEntry) {
      hourEntry.revenue += rowRevenue;
      hourEntry.transactions += rowTransactions;
    } else {
      hourMap.set(row.hour, { revenue: rowRevenue, transactions: rowTransactions });
    }
  }
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

  const currentPeriodKey = selectedPeriod as PeriodKey;

  const insightTopProducts = topProductRows.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    quantitySold: Number(row.quantitySold),
    revenue: Number(row.revenue),
    estimatedProfit:
      Number(row.missingCostCount) > 0
        ? null
        : Number(row.revenue) - Number(row.costTotal),
  }));

  const insightHourPoints = [...hourMap.entries()]
    .map(([bucket, totals]) => ({
      hour: Number(bucket),
      label: `${bucket}.00`,
      revenue: totals.revenue,
      transactions: totals.transactions,
    }))
    .sort((a, b) => a.hour - b.hour);

  const insightOutletPerformance =
    selectedOutletId === "all"
      ? outletRows.map((row) => ({
          id: row.id,
          name: row.name,
          revenue: Number(row.revenue),
          transactions: Number(row.transactions),
        }))
      : outletRows
          .filter((row) => row.id === selectedOutletId)
          .map((row) => ({
            id: row.id,
            name: row.name,
            revenue: Number(row.revenue),
            transactions: Number(row.transactions),
          }));

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
        currentSales={currentRevenue}
        previousSales={previousRevenue}
        currentTransactions={currentTransactions}
        previousTransactions={previousTransactions}
        currentAov={currentAverage}
        totalStockUnits={totalStock}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        lowStockHref={lowStockHref}
        showStock={canManageInventory}
      />

      {canUseCashflow && expenseUnavailable && (
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
          initialIncomeTotal={currentRevenue}
          initialIncomeCount={currentTransactions}
          initialExpenseTotal={currentExpenseTotal}
          initialExpenseCount={currentExpenseCount}
          initialRecent={expenseRecent}
          initialExpenseUnavailable={expenseUnavailable}
        />
      )}

      {canViewReports && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <DashboardInsights
              periodLabel={periodLabels[currentPeriodKey]}
              topProducts={insightTopProducts}
              hourPoints={insightHourPoints}
              outletPerformance={insightOutletPerformance}
            />
          </div>
          <div className="lg:col-span-1">
            <DashboardRecentActivity activities={recentActivities} />
          </div>
        </div>
      )}

      <DashboardOverview
        chartPoints={chartPoints}
        periodLabel={periodLabels[currentPeriodKey]}
        currentTransactions={currentTransactions}
        selectedOutletId={selectedOutletId}
        selectedOutletSlug={selectedOutlet?.slug}
        showSalesChart={canViewReports}
        showReportsAction={canViewReports}
        showInventoryAction={canManageInventory}
      />
    </div>
  );
}
