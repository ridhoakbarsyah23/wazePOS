import { cache } from "react";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/shared/app-header";
import { SubscriptionLockout } from "@/components/subscription/subscription-lockout";
import {
  canManageBusiness,
  canManageStaff,
  getWorkspaceContext,
  requireSession,
} from "@/server/auth/auth-session";
import { getSubscriptionStatusDetails, hasPlanFeature } from "@/shared/billing/plans";

type AccessRule =
  // Owner + admin (cashier dialihkan ke /pos) — produk, stok, pengaturan, laporan, dll.
  | "manageBusiness"
  // Owner + admin (semantik kelola karyawan) — halaman /staff
  | "manageStaff"
  // Hanya owner — halaman /subscription
  | "ownerOnly"
  // Semua role yang sudah login — halaman /transactions
  | "anyAuthenticated";

type RequireDashboardAccessOptions = {
  /** Peran minimum yang boleh membuka halaman. Default: "anyAuthenticated". */
  rule?: AccessRule;
  /**
   * Set `false` untuk halaman yang memang mengelola langganan (mis. /subscription)
   * supaya tidak terjadi redirect loop saat langganan berakhir. Default: true.
   */
  enforceSubscription?: boolean;
};

/** Halaman tidak boleh dirender — tampilkan layar lockout langganan. */
type AccessFailure = { ok: false; lockout: ReactNode };

/** Akses lolos semua guard — data siap dipakai halaman. */
type AccessSuccess = {
  ok: true;
  session: Awaited<ReturnType<typeof requireSession>>;
  membership: NonNullable<Awaited<ReturnType<typeof getWorkspaceContext>>["membership"]>;
  currentSubscription: Awaited<ReturnType<typeof getWorkspaceContext>>["currentSubscription"];
  subDetails: ReturnType<typeof getSubscriptionStatusDetails>;
  allowDarkMode: boolean;
};

/**
 * Guard gabungan untuk halaman dashboard (server component):
 * session → membership/onboarding → role → status langganan.
 *
 * Pemakaian:
 * ```tsx
 * const access = await requireDashboardAccess({ rule: "manageBusiness" });
 * if (!access.ok) return access.lockout;
 * const { session, membership, currentSubscription, subDetails } = access;
 * ```
 */
export const requireDashboardAccess = cache(
  async (
    options: RequireDashboardAccessOptions = {},
  ): Promise<AccessSuccess | AccessFailure> => {
    const { rule = "anyAuthenticated", enforceSubscription = true } = options;

    const session = await requireSession();
    const { membership, currentSubscription } = await getWorkspaceContext(session.user.id);
    if (!membership) redirect("/onboarding");

    if (rule === "manageBusiness" && !canManageBusiness(membership.role)) redirect("/pos");
    if (rule === "manageStaff" && !canManageStaff(membership.role)) redirect("/pos");
    if (rule === "ownerOnly" && membership.role !== "owner") redirect("/pos");

    const subDetails = getSubscriptionStatusDetails(currentSubscription);

    if (enforceSubscription && !subDetails.isValid) {
      if (membership.role === "owner") redirect("/subscription?expired=1");
      return {
        ok: false,
        lockout: (
          <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
            <AppHeader businessName={membership.businessName} userName={session.user.name} role={membership.role} />
            <SubscriptionLockout
              businessName={membership.businessName}
              role={membership.role}
              reason={subDetails.message}
            />
          </main>
        ),
      };
    }

    const allowDarkMode = subDetails.isValid && hasPlanFeature(currentSubscription?.plan, "darkMode");

    return { ok: true, session, membership, currentSubscription, subDetails, allowDarkMode };
  },
);
