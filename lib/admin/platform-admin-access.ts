export const platformSubscriptionStates = [
  "trial_active",
  "trial_expired",
  "active",
  "subscription_expired",
  "past_due",
  "cancelled",
  "missing",
] as const;

export type PlatformSubscriptionState = (typeof platformSubscriptionStates)[number];

export type PlatformSubscriptionRecord = {
  status: "trialing" | "active" | "past_due" | "cancelled";
  trialEndsAt: Date | string;
  currentPeriodEnd?: Date | string | null;
} | null;

export function parsePlatformAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformAdminEmail(email: string | null | undefined, allowlist: string | undefined): boolean {
  if (!email) return false;
  return parsePlatformAdminEmails(allowlist).has(email.trim().toLowerCase());
}

export type PlatformAdminIdentity = {
  email: string | null | undefined;
  emailVerified?: boolean | null;
};

/**
 * Email allowlist saja tidak cukup: signup publik membuat user dengan
 * email_verified=false. Akses admin tetap harus dimiliki akun terverifikasi.
 */
export function isPlatformAdminUser(
  user: PlatformAdminIdentity | null | undefined,
  allowlist: string | undefined,
): boolean {
  return user?.emailVerified === true && isPlatformAdminEmail(user.email, allowlist);
}

export function getPostLoginDestination(
  user: PlatformAdminIdentity | null | undefined,
  allowlist: string | undefined,
): "/admin" | "/dashboard" {
  return isPlatformAdminUser(user, allowlist) ? "/admin" : "/dashboard";
}

export function getPlatformSubscriptionState(
  subscription: PlatformSubscriptionRecord,
  now = new Date(),
): PlatformSubscriptionState {
  if (!subscription) return "missing";

  if (subscription.status === "trialing") {
    return new Date(subscription.trialEndsAt) > now ? "trial_active" : "trial_expired";
  }

  if (subscription.status === "active") {
    if (!subscription.currentPeriodEnd) return "active";
    return new Date(subscription.currentPeriodEnd) > now ? "active" : "subscription_expired";
  }

  return subscription.status;
}
