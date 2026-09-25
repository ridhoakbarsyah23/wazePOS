import { and, eq, sql } from "drizzle-orm";
import { Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shared/app-header";
import { DashboardSetupManager } from "@/components/dashboard/dashboard-setup-manager";
import { SettingsManager } from "@/components/settings/settings-manager";
import { db } from "@/db";
import { business, category, outlet, product } from "@/db/schema";
import { requireDashboardAccess } from "@/lib/access/dashboard-access";
import { normalizeReceiptSettings } from "@/lib/validation/receipt-settings";

export default async function SettingsPage() {
  const access = await requireDashboardAccess({ rule: "manageBusiness" });
  if (!access.ok) return access.lockout;
  const { session, membership, subDetails, allowDarkMode } = access;

  const [businessRows, outlets, categories] = await Promise.all([
    db
      .select({
        name: business.name,
        type: business.type,
        timezone: business.timezone,
        currency: business.currency,
        receiptSettings: business.receiptSettings,
      })
      .from(business)
      .where(eq(business.id, membership.businessId))
      .limit(1),
    db
      .select({ id: outlet.id, name: outlet.name, address: outlet.address })
      .from(outlet)
      .where(eq(outlet.businessId, membership.businessId))
      .orderBy(outlet.name),
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
  ]);

  const businessData = businessRows[0];
  if (!businessData) redirect("/onboarding");


  return (
    <AppHeader
      businessName={businessData.name}
      userName={session.user.name}
      outletName={outlets[0]?.name}
      outlets={outlets.map(({ id, name }) => ({ id, name }))}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
    >
      <section className="mx-auto w-[min(1140px,calc(100%-24px))] py-6 sm:w-[min(1140px,calc(100%-40px))] sm:py-8 animate-page-enter">
        <header className="flex items-start gap-3">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center border border-[#cfe0d7] bg-white text-[#187c59]">
            <Settings className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.7px] text-[#17211d]">Pengaturan</h1>
            <p className="mt-1 text-sm leading-6 text-[#6c7a73]">
              Kelola identitas usaha dan informasi gerai dari satu tempat.
            </p>
          </div>
        </header>

        <div className="mt-6">
          <SettingsManager
            initialBusiness={businessData}
            initialOutlets={outlets}
            initialReceiptSettings={normalizeReceiptSettings(businessData.receiptSettings)}
          />
        </div>

        <div className="mt-6">
          <DashboardSetupManager
            initialCategories={categories.map((item) => ({
              ...item,
              productCount: Number(item.productCount),
            }))}
            initialOutlets={outlets}
            showQuickProduct={false}
          />
        </div>
      </section>
    </AppHeader>
  );
}
