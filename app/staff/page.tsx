import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { businessMember, user } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { StaffManager } from "@/components/staff-manager";
import { canManageStaff, getBusinessSubscription, getMembership, requireSession } from "@/lib/auth-session";
import { getPlanLimits, normalizePlan, plans } from "@/lib/plans";

export default async function StaffPage() {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");
  if (!canManageStaff(membership.role)) redirect("/pos");

  const [staffRows, subscription] = await Promise.all([
    db
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
      .orderBy(desc(businessMember.createdAt)),
    getBusinessSubscription(membership.businessId),
  ]);

  const selectedPlan = normalizePlan(subscription?.plan);
  const planLimits = getPlanLimits(selectedPlan);

  const staffFormatted = staffRows.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
      <AppHeader
        businessName={membership.businessName}
        role={membership.role}
      />

      <section className="mx-auto w-[min(1080px,calc(100%-32px))] py-8 sm:py-10 animate-page-enter">
        <span className="section-kicker">Team & Permissions</span>
        <h1 className="mt-3 mb-2 text-3xl font-extrabold tracking-[-1.2px] text-[#15211d] sm:text-4xl">
          Manajemen Karyawan
        </h1>
        <p className="m-0 max-w-2xl text-sm leading-7 text-[#627069]">
          Atur peran akun untuk tim Anda. Kasir hanya memiliki akses ke terminal transaksi kasir, sedangkan Admin dapat membantu mengelola katalog dan stok.
        </p>

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
    </main>
  );
}
