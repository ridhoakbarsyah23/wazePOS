import { and, eq, isNotNull } from "drizzle-orm";
import { UserRound } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ProfileManager } from "@/components/profile-manager";
import { db } from "@/db";
import { account } from "@/db/schema";
import { requireDashboardAccess } from "@/lib/dashboard-access";

const roleLabels = {
  owner: "Pemilik Usaha",
  admin: "Admin Gerai",
  cashier: "Kasir",
} as const;

export default async function ProfilePage() {
  const access = await requireDashboardAccess({
    rule: "anyAuthenticated",
    enforceSubscription: false,
  });
  if (!access.ok) return access.lockout;
  const { session, membership, subDetails, allowDarkMode } = access;

  const credentialAccount = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "credential"),
        isNotNull(account.password),
      ),
    )
    .limit(1);

  const roleLabel = roleLabels[membership.role];

  return (
    <AppHeader
      businessName={membership.businessName}
      userName={session.user.name}
      outletName={membership.businessName}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
    >
      <section className="mx-auto w-[min(1080px,calc(100%-24px))] py-6 sm:w-[min(1080px,calc(100%-40px))] sm:py-10 animate-page-enter">
        <header className="flex items-start gap-3">
          <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-2xl border border-[#cfe0d7] bg-white text-[#187c59]">
            <UserRound className="size-5" />
          </span>
          <div>
            <h1 className="m-0 text-2xl font-extrabold tracking-[-0.7px] text-[#17211d] sm:text-3xl">Profil Akun</h1>
            <p className="m-0 mt-1 text-sm leading-6 text-[#6c7a73]">Perbarui identitas pribadi dan kelola keamanan akun Anda.</p>
          </div>
        </header>

        <div className="mt-6">
          <ProfileManager
            initialName={session.user.name}
            email={session.user.email}
            roleLabel={roleLabel}
            businessName={membership.businessName}
            canChangePassword={credentialAccount.length > 0}
          />
        </div>
      </section>
    </AppHeader>
  );
}

