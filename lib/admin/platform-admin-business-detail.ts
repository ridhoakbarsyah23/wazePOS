import "server-only";

import { and, count, desc, eq, max, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  business,
  businessMember,
  outlet,
  platformAdminAuditLog,
  sale,
  subscription,
  subscriptionPayment,
  user,
} from "@/db/schema";
import { getPlatformSubscriptionState } from "@/lib/admin/platform-admin-access";
import type {
  PlatformAdminAuditItem,
  PlatformAdminBusiness,
  PlatformAdminBusinessDetailData,
} from "@/lib/admin/platform-admin-types";

function buildOwnerRows() {
  const rankedOwners = db
    .select({
      businessId: businessMember.businessId,
      name: user.name,
      email: user.email,
      rowNumber: sql<number>`row_number() over (partition by ${businessMember.businessId} order by ${businessMember.createdAt} asc)`.as("owner_row_number"),
    })
    .from(businessMember)
    .innerJoin(user, eq(user.id, businessMember.userId))
    .where(eq(businessMember.role, "owner"))
    .as("platform_ranked_detail_owners");

  return db
    .select({
      businessId: rankedOwners.businessId,
      name: rankedOwners.name,
      email: rankedOwners.email,
    })
    .from(rankedOwners)
    .where(eq(rankedOwners.rowNumber, 1))
    .as("platform_detail_owner");
}

export async function getPlatformAdminBusinessDetail(
  businessId: string,
): Promise<PlatformAdminBusinessDetailData | null> {
  const now = new Date();
  const ownerRows = buildOwnerRows();
  const [row] = await db
    .select({
      id: business.id,
      name: business.name,
      type: business.type,
      onboardingCompleted: business.onboardingCompleted,
      createdAt: business.createdAt,
      ownerName: ownerRows.name,
      ownerEmail: ownerRows.email,
      plan: subscription.plan,
      subscriptionStatus: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
    })
    .from(business)
    .leftJoin(subscription, eq(subscription.businessId, business.id))
    .leftJoin(ownerRows, eq(ownerRows.businessId, business.id))
    .where(eq(business.id, businessId))
    .limit(1);

  if (!row) return null;

  const [memberCountRows, outletCountRows, activityRows, outlets, members, payments, latestSales] = await Promise.all([
    db
      .select({ value: count() })
      .from(businessMember)
      .where(eq(businessMember.businessId, businessId)),
    db.select({ value: count() }).from(outlet).where(eq(outlet.businessId, businessId)),
    db
      .select({
        saleCount: count(),
        grossRevenue: sum(sale.total),
        lastSaleAt: max(sale.createdAt),
      })
      .from(sale)
      .where(and(eq(sale.businessId, businessId), eq(sale.status, "completed"))),
    db
      .select({
        id: outlet.id,
        name: outlet.name,
        address: outlet.address,
        createdAt: outlet.createdAt,
      })
      .from(outlet)
      .where(eq(outlet.businessId, businessId))
      .orderBy(outlet.name),
    db
      .select({
        id: businessMember.id,
        name: user.name,
        email: user.email,
        role: businessMember.role,
        createdAt: businessMember.createdAt,
      })
      .from(businessMember)
      .innerJoin(user, eq(user.id, businessMember.userId))
      .where(eq(businessMember.businessId, businessId))
      .orderBy(businessMember.createdAt),
    db
      .select({
        id: subscriptionPayment.id,
        plan: subscriptionPayment.plan,
        amount: subscriptionPayment.amount,
        status: subscriptionPayment.status,
        provider: subscriptionPayment.provider,
        providerOrderId: subscriptionPayment.providerOrderId,
        createdAt: subscriptionPayment.createdAt,
        paidAt: subscriptionPayment.paidAt,
      })
      .from(subscriptionPayment)
      .where(eq(subscriptionPayment.businessId, businessId))
      .orderBy(desc(subscriptionPayment.createdAt))
      .limit(10),
    db
      .select({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        total: sale.total,
        status: sale.status,
        outletName: outlet.name,
        cashierName: user.name,
        createdAt: sale.createdAt,
      })
      .from(sale)
      .leftJoin(outlet, eq(outlet.id, sale.outletId))
      .leftJoin(user, eq(user.id, sale.cashierId))
      .where(eq(sale.businessId, businessId))
      .orderBy(desc(sale.createdAt))
      .limit(10),
  ]);

  let auditLog: PlatformAdminAuditItem[] = [];
  try {
    const auditRows = await db
      .select({
        id: platformAdminAuditLog.id,
        action: platformAdminAuditLog.action,
        createdAt: platformAdminAuditLog.createdAt,
        adminName: user.name,
        adminEmail: user.email,
        metadata: platformAdminAuditLog.metadata,
      })
      .from(platformAdminAuditLog)
      .leftJoin(user, eq(user.id, platformAdminAuditLog.actorUserId))
      .where(eq(platformAdminAuditLog.businessId, businessId))
      .orderBy(desc(platformAdminAuditLog.createdAt))
      .limit(20);
    auditLog = auditRows.map((item) => ({
      ...item,
      metadata: (item.metadata as Record<string, unknown> | null) ?? null,
    }));
  } catch (error) {
    // Detail tetap dapat dibuka jika migration audit belum dijalankan di database lokal.
    console.error("Failed to load Platform Admin audit log", error);
  }

  const activity = activityRows[0] ?? { saleCount: 0, grossRevenue: 0, lastSaleAt: null };
  const businessSummary: PlatformAdminBusiness = {
    id: row.id,
    name: row.name,
    type: row.type,
    onboardingCompleted: row.onboardingCompleted,
    createdAt: row.createdAt,
    ownerName: row.ownerName,
    ownerEmail: row.ownerEmail,
    plan: row.plan,
    subscriptionStatus: row.subscriptionStatus,
    trialEndsAt: row.trialEndsAt,
    currentPeriodEnd: row.currentPeriodEnd,
    memberCount: Number(memberCountRows[0]?.value ?? 0),
    outletCount: Number(outletCountRows[0]?.value ?? 0),
    saleCount: Number(activity.saleCount ?? 0),
    grossRevenue: Number(activity.grossRevenue ?? 0),
    lastActivityAt: activity.lastSaleAt,
    state: getPlatformSubscriptionState(
      row.subscriptionStatus && row.trialEndsAt
        ? {
            status: row.subscriptionStatus,
            trialEndsAt: row.trialEndsAt,
            currentPeriodEnd: row.currentPeriodEnd,
          }
        : null,
      now,
    ),
  };

  return {
    business: businessSummary,
    outlets,
    members,
    payments,
    activity: {
      saleCount: businessSummary.saleCount ?? 0,
      grossRevenue: businessSummary.grossRevenue ?? 0,
      lastSaleAt: activity.lastSaleAt,
      latestSales,
    },
    auditLog,
  };
}
