import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { business, businessMember, subscription } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSubscriptionStatusDetails } from "@/lib/plans";

export const getCurrentSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

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

