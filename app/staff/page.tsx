import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { businessMember, user } from "@/db/schema";
import { Users } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StaffManager } from "@/components/staff-manager";
import { SubscriptionLockout } from "@/components/subscription-lockout";
import { Badge } from "@/components/ui/badge";
import { canManageStaff, getWorkspaceContext, requireSession } from "@/lib/auth-session";
import { getPlanLimits, getSubscriptionStatusDetails, normalizePlan, plans } from "@/lib/plans";

export default async function StaffPage() {
  const session = await requireSession();
  const { membership, currentSubscription } = await getWorkspaceContext(session.user.id);
  if (!membership) redirect("/onboarding");
  if (!canManageStaff(membership.role)) redirect("/pos");

  const staffRows = await db
      .select({
        id: businessMember.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: businessMember.role,
        createdAt: businessMember.createdAt,
      })
      .from(businessMember)
      .innerJoin(user, eq(user.id, businessMember.userId))
      .where(eq(businessMember.businessId, membership.businessId))
      .orderBy(desc(businessMember.createdAt));

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
  const planLimits = getPlanLimits(selectedPlan);

  const staffFormatted = staffRows.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <AppHeader
      businessName={membership.businessName}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
    >
      <section className="mx-auto w-[min(1140px,calc(100%-32px))] py-8 sm:py-10 animate-page-enter">
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="w-fit">
            <Users className="size-3.5" /> Team & Permissions
          </Badge>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-1.2px] text-[#15211d] sm:text-4xl">
            Manajemen Karyawan
          </h1>
          <p className="m-0 text-sm leading-relaxed text-[#627069]">
            Atur peran akun staf Anda. Kasir memiliki akses fokus ke terminal kasir POS, sedangkan Admin dapat mengelola katalog produk, stok, dan laporan.
          </p>
        </div>

        <div className="mt-7">
          <StaffManager
            initialStaff={staffFormatted}
            currentUserRole={membership.role}
            currentUserId={session.user.id}
            maxStaff={planLimits.maxStaff}
            planName={plans[selectedPlan].name}
          />
        </div>
      </section>
    </AppHeader>
  );
}
