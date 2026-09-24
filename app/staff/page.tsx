import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { businessMember, user } from "@/db/schema";
import { Users } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StaffManager } from "@/components/staff-manager";
import { Badge } from "@/components/ui/badge";
import { requireDashboardAccess } from "@/lib/dashboard-access";
import { getPlanLimits, normalizePlan, plans } from "@/lib/plans";

export default async function StaffPage() {
  const access = await requireDashboardAccess({ rule: "manageStaff" });
  if (!access.ok) return access.lockout;
  const { session, membership, currentSubscription, subDetails, allowDarkMode } = access;

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

  const selectedPlan = normalizePlan(currentSubscription?.plan);
  const planLimits = getPlanLimits(selectedPlan);

  const staffFormatted = staffRows.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <AppHeader
      businessName={membership.businessName}
      userName={session.user.name}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
    >
      <section className="mx-auto w-[min(1140px,calc(100%-24px))] py-6 sm:w-[min(1140px,calc(100%-40px))] sm:py-10 animate-page-enter">
        <div className="relative overflow-hidden rounded-3xl border border-[#d8e8df] bg-gradient-to-br from-white via-[#f8fcfa] to-[#eaf7f0] p-5 shadow-[0_10px_35px_rgba(16,65,48,.07)] sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#198760] to-[#126b4b] text-white shadow-[0_10px_24px_rgba(25,135,96,.25)]">
              <Users className="size-6" />
            </span>
            <div className="min-w-0">
              <Badge variant="outline" className="w-fit border-emerald-200 bg-white/80 text-emerald-800">
                Tim &amp; Hak Akses
              </Badge>
              <h1 className="mt-2 text-2xl font-black tracking-[-1px] text-[#15211d] sm:text-4xl">
                Manajemen Karyawan
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#627069]">
                Buat akun kerja terpisah, tentukan peran yang tepat, dan jaga akses operasional tetap aman.
              </p>
            </div>
          </div>
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
