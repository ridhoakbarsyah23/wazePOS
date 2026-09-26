import "server-only";

import { cache } from "react";
import { getSessionCookie } from "better-auth/cookies";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { business, businessMember, subscription } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { getSubscriptionStatusDetails } from "@/shared/billing/plans";

export const getCurrentSession = cache(async () => {
  const requestHeaders = await headers();

  // Tanpa cookie session, lewati query database/adapter agar halaman publik
  // seperti /register tidak memicu lookup DB yang gagal (database mati,
  // session basi) dan memunculkan overlay dev "Failed to get session".
  if (!getSessionCookie(requestHeaders)) return null;

  try {
    return await auth.api.getSession({ headers: requestHeaders });
  } catch {
    // Gagal tertutup menjadi null (dianggap belum login). Sengaja TANPA
    // console.error: Next.js dev meneruskan console.error server ke overlay
    // error di browser, sehingga halaman publik seperti /register ikut
    // menampilkan overlay "Failed to get session" saat database mati atau
    // cookie session basi. Kesehatan database dipantau lewat /api/health.
    return null;
  }
});

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export const getWorkspaceContext = cache(async (userId: string) => {
  const [row] = await db
    .select({
      membershipId: businessMember.id,
      businessId: businessMember.businessId,
      businessName: business.name,
      role: businessMember.role,
      onboardingCompleted: business.onboardingCompleted,
      subscriptionId: subscription.id,
      plan: subscription.plan,
      subscriptionStatus: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      subscriptionCreatedAt: subscription.createdAt,
    })
    .from(businessMember)
    .innerJoin(business, eq(business.id, businessMember.businessId))
    .leftJoin(subscription, eq(subscription.businessId, business.id))
    .where(eq(businessMember.userId, userId))
    .limit(1);

  if (!row) return { membership: null, currentSubscription: null };

  return {
    membership: {
      id: row.membershipId,
      businessId: row.businessId,
      businessName: row.businessName,
      role: row.role,
      onboardingCompleted: row.onboardingCompleted,
    },
    currentSubscription: row.subscriptionId
      ? {
          id: row.subscriptionId,
          plan: row.plan!,
          status: row.subscriptionStatus!,
          trialEndsAt: row.trialEndsAt!,
          currentPeriodStart: row.currentPeriodStart,
          currentPeriodEnd: row.currentPeriodEnd,
          cancelAtPeriodEnd: row.cancelAtPeriodEnd!,
          createdAt: row.subscriptionCreatedAt!,
        }
      : null,
  };
});

export const getMembership = cache(async (userId: string) => {
  const [membership] = await db
    .select({
      id: businessMember.id,
      businessId: businessMember.businessId,
      businessName: business.name,
      role: businessMember.role,
      onboardingCompleted: business.onboardingCompleted,
    })
    .from(businessMember)
    .innerJoin(business, eq(business.id, businessMember.businessId))
    .where(eq(businessMember.userId, userId))
    .limit(1);

  return membership ?? null;
});

export const getBusinessSubscription = cache(async (businessId: string) => {
  const [currentSubscription] = await db
    .select({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      createdAt: subscription.createdAt,
    })
    .from(subscription)
    .where(eq(subscription.businessId, businessId))
    .limit(1);

  return currentSubscription ?? null;
});

export function isOwner(role: "owner" | "admin" | "cashier") {
  return role === "owner";
}

export function canManageBusiness(role: "owner" | "admin" | "cashier") {
  return role === "owner" || role === "admin";
}

export function canManageStaff(role: "owner" | "admin" | "cashier") {
  return role === "owner" || role === "admin";
}

export const requireValidSubscription = cache(async (businessId: string) => {
  const sub = await getBusinessSubscription(businessId);
  const details = getSubscriptionStatusDetails(sub);
  return { sub, details };
});
