import { Suspense } from "react";
import { eq, count } from "drizzle-orm";
import { AppFooter } from "@/components/shared/app-footer";
import { AppHeader } from "@/components/shared/app-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { db } from "@/db";
import { outlet, product, sale } from "@/db/schema";
import { requireDashboardAccess } from "@/server/access/dashboard-access";
import { hasPlanFeature, normalizePlan } from "@/shared/billing/plans";
import type { PeriodKey } from "@/components/dashboard/dashboard-header";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; message?: string; period?: string; outlet?: string }>;
}) {
  const feedback = await searchParams;
  const access = await requireDashboardAccess({ rule: "manageBusiness" });
  if (!access.ok) return access.lockout;
  const { session, membership, currentSubscription, subDetails, allowDarkMode } = access;

  const selectedPlan = normalizePlan(currentSubscription?.plan);
  const canViewReports = hasPlanFeature(selectedPlan, "onscreenReports");
  const canManageOutlets = hasPlanFeature(selectedPlan, "multiOutlet");
  const canManageInventory = hasPlanFeature(selectedPlan, "inventoryStock");
  const canUseCashflow = hasPlanFeature(selectedPlan, "cashflow");
  const selectedPeriod: PeriodKey =
    feedback.period === "today" || feedback.period === "30d" ? feedback.period : "7d";

  const outlets = await db
      .select({
        id: outlet.id,
        name: outlet.name,
        slug: outlet.slug,
        address: outlet.address,
      })
      .from(outlet)
      .where(eq(outlet.businessId, membership.businessId))
      .orderBy(outlet.name);

  const [totalProducts, totalSales] = await Promise.all([
    db.select({ count: count() }).from(product).where(eq(product.businessId, membership.businessId)),
    db.select({ count: count() }).from(sale).where(eq(sale.businessId, membership.businessId))
  ]);
  const hasProducts = totalProducts[0].count > 0;
  const hasSales = totalSales[0].count > 0;

  const selectedOutletId = canManageOutlets
    ? feedback.outlet && outlets.some((item) => item.id === feedback.outlet)
      ? feedback.outlet
      : "all"
    : outlets[0]?.id ?? "all";
  const selectedOutlet = outlets.find((item) => item.id === selectedOutletId);
  const currentOutletName =
    selectedOutlet?.name ??
    (selectedOutletId === "all" ? "Semua Gerai" : outlets[0]?.name ?? "Gerai Utama");

  return (
    <AppHeader
      businessName={membership.businessName}
      userName={session.user.name}
      outletName={currentOutletName}
      outlets={outlets}
      activeOutletId={selectedOutletId === "all" ? undefined : selectedOutletId}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
      plan={selectedPlan}
    >
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          hasProducts={hasProducts}
          hasSales={hasSales}
          membership={membership}
          session={session}
          subDetails={subDetails}
          selectedPlan={selectedPlan}
          canViewReports={canViewReports}
          canManageOutlets={canManageOutlets}
          canManageInventory={canManageInventory}
          canUseCashflow={canUseCashflow}
          selectedPeriod={selectedPeriod}
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          selectedOutlet={selectedOutlet}
          currentOutletName={currentOutletName}
        />
      </Suspense>
      <AppFooter businessName={membership.businessName} />
    </AppHeader>
  );
}
