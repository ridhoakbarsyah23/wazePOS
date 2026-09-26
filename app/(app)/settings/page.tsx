import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowRight, Crown, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shared/app-header";
import { DashboardSetupManager } from "@/components/dashboard/dashboard-setup-manager";
import { SettingsManager } from "@/components/settings/settings-manager";
import { db } from "@/db";
import { business, outlet } from "@/db/schema";
import { requireDashboardAccess } from "@/server/access/dashboard-access";
import { hasPlanFeature, normalizePlan } from "@/shared/billing/plans";
import { normalizeReceiptSettings } from "@/shared/validation/receipt-settings";

export default async function SettingsPage() {
  const access = await requireDashboardAccess({ rule: "manageBusiness" });
  if (!access.ok) return access.lockout;
  const { session, membership, currentSubscription, subDetails, allowDarkMode } = access;
  const selectedPlan = normalizePlan(currentSubscription?.plan);
  const canManageOutlets = hasPlanFeature(selectedPlan, "multiOutlet");
  const canManageReceiptSettings = hasPlanFeature(selectedPlan, "receiptSettings");

  const [businessRows, outlets] = await Promise.all([
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
      plan={selectedPlan}
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
            allowReceiptSettings={canManageReceiptSettings}
            initialReceiptSettings={normalizeReceiptSettings(businessData.receiptSettings)}
          />
        </div>

        {canManageOutlets ? (
          <div className="mt-6">
            <DashboardSetupManager
              initialCategories={[]}
              initialOutlets={outlets}
              showQuickProduct={false}
              showCategories={false}
            />
          </div>
        ) : (
          <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-[#eadfbf] bg-[#fffaf0] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#f0d99a] bg-[#fff3cf] text-[#9a6a12]">
                <Crown className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-[#533b12]">Multi-gerai tersedia di Paket Bisnis</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-[#80652a]">
                  Paket Tumbuh mendukung 1 gerai. Upgrade untuk menambah gerai dan mengelola operasional multi-cabang.
                </p>
              </div>
            </div>
            <Link
              href="/subscription"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#9a6a12] px-4 text-xs font-extrabold text-white transition hover:bg-[#7d550d]"
            >
              Lihat Paket Bisnis
              <ArrowRight className="size-4" />
            </Link>
          </section>
        )}
      </section>
    </AppHeader>
  );
}
