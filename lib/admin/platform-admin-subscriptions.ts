import "server-only";

import { and, asc, count, desc, eq, gt, ilike, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { business, businessMember, subscription, user } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/admin/platform-admin";
import {
  getPlatformSubscriptionState,
  platformSubscriptionStates,
  type PlatformSubscriptionState,
} from "@/lib/admin/platform-admin-access";
import type { PlatformAdminSubscriptionItem } from "@/lib/admin/platform-admin-types";

const PAGE_SIZE = 10;
const PLATFORM_ADMIN_SUBSCRIPTION_EXPORT_LIMIT = 10_000;

type SearchParam = string | string[] | undefined;

export type PlatformAdminSubscriptionFilters = {
  query: string;
  state: PlatformSubscriptionState | "all";
  plan: "all" | "tumbuh" | "bisnis";
};

export type PlatformAdminSubscriptionInput = {
  query?: SearchParam;
  state?: SearchParam;
  plan?: SearchParam;
  page?: SearchParam;
};

function getFirst(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizePlatformAdminSubscriptionFilters(
  input: PlatformAdminSubscriptionInput = {},
): PlatformAdminSubscriptionFilters {
  const stateRaw = getFirst(input.state)?.trim() ?? "all";
  const planRaw = getFirst(input.plan)?.trim() ?? "all";
  return {
    query: getFirst(input.query)?.trim().slice(0, 100) ?? "",
    state: (platformSubscriptionStates as readonly string[]).includes(stateRaw)
      ? (stateRaw as PlatformAdminSubscriptionFilters["state"])
      : "all",
    plan: planRaw === "tumbuh" || planRaw === "bisnis" ? planRaw : "all",
  };
}

function buildOwnerRows() {
  const ranked = db
    .select({
      businessId: businessMember.businessId,
      name: user.name,
      email: user.email,
      rowNumber:
        sql<number>`row_number() over (partition by ${businessMember.businessId} order by ${businessMember.createdAt} asc)`.as(
          "sub_owner_row_number",
        ),
    })
    .from(businessMember)
    .innerJoin(user, eq(user.id, businessMember.userId))
    .where(eq(businessMember.role, "owner"))
    .as("platform_sub_ranked_owners");

  return db
    .select({ businessId: ranked.businessId, name: ranked.name, email: ranked.email })
    .from(ranked)
    .where(eq(ranked.rowNumber, 1))
    .as("platform_sub_owner");
}

function getStateCondition(state: PlatformAdminSubscriptionFilters["state"], now: Date): SQL | undefined {
  switch (state) {
    case "trial_active":
      return and(eq(subscription.status, "trialing"), gt(subscription.trialEndsAt, now));
    case "trial_expired":
      return and(eq(subscription.status, "trialing"), lte(subscription.trialEndsAt, now));
    case "active":
      return and(
        eq(subscription.status, "active"),
        or(isNull(subscription.currentPeriodEnd), gt(subscription.currentPeriodEnd, now)),
      );
    case "subscription_expired":
      return and(eq(subscription.status, "active"), lte(subscription.currentPeriodEnd, now));
    case "past_due":
      return eq(subscription.status, "past_due");
    case "cancelled":
      return eq(subscription.status, "cancelled");
    case "missing":
      // Tabel ini hanya berisi subscription yang ada, jadi "missing" selalu kosong.
      return sql`false`;
    default:
      return undefined;
  }
}

function getSubscriptionWhere(
  filters: PlatformAdminSubscriptionFilters,
  now: Date,
  ownerRows: ReturnType<typeof buildOwnerRows>,
): SQL | undefined {
  const conditions: SQL[] = [];
  if (filters.query) {
    const search = `%${filters.query}%`;
    conditions.push(
      or(ilike(business.name, search), ilike(ownerRows.name, search), ilike(ownerRows.email, search))!,
    );
  }
  const stateCondition = getStateCondition(filters.state, now);
  if (stateCondition) conditions.push(stateCondition);
  if (filters.plan !== "all") conditions.push(eq(subscription.plan, filters.plan));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getPlatformAdminSubscriptionRows(
  filters: PlatformAdminSubscriptionFilters,
  options: { page?: number; pageSize?: number; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const requestedPage = options.page ?? 1;
  const ownerRows = buildOwnerRows();
  const where = getSubscriptionWhere(filters, now, ownerRows);

  const [countRows] = await db
    .select({ value: count() })
    .from(subscription)
    .innerJoin(business, eq(business.id, subscription.businessId))
    .leftJoin(ownerRows, eq(ownerRows.businessId, business.id))
    .where(where);
  const total = Number(countRows?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: subscription.id,
      businessId: subscription.businessId,
      businessName: business.name,
      businessType: business.type,
      ownerName: ownerRows.name,
      ownerEmail: ownerRows.email,
      plan: subscription.plan,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      createdAt: subscription.createdAt,
    })
    .from(subscription)
    .innerJoin(business, eq(business.id, subscription.businessId))
    .leftJoin(ownerRows, eq(ownerRows.businessId, business.id))
    .where(where)
    .orderBy(
      sql`case when ${subscription.status} = 'trialing' then ${subscription.trialEndsAt} else ${subscription.currentPeriodEnd} end asc nulls last`,
      desc(subscription.createdAt),
      asc(subscription.id),
    )
    .limit(pageSize)
    .offset(offset);

  const subscriptions: PlatformAdminSubscriptionItem[] = rows.map((item) => ({
    ...item,
    state: getPlatformSubscriptionState(
      { status: item.status, trialEndsAt: item.trialEndsAt, currentPeriodEnd: item.currentPeriodEnd },
      now,
    ),
  }));

  return {
    subscriptions,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      from: total === 0 ? 0 : offset + 1,
      to: Math.min(offset + pageSize, total),
    },
  };
}

export async function getPlatformAdminSubscriptionExportRows(input: PlatformAdminSubscriptionInput) {
  const filters = normalizePlatformAdminSubscriptionFilters(input);
  const result = await getPlatformAdminSubscriptionRows(filters, {
    page: 1,
    pageSize: PLATFORM_ADMIN_SUBSCRIPTION_EXPORT_LIMIT,
  });

  return {
    filters,
    subscriptions: result.subscriptions,
    truncated: result.pagination.total > result.subscriptions.length,
  };
}

export async function getPlatformAdminSubscriptionsData(input: PlatformAdminSubscriptionInput = {}) {
  await requirePlatformAdmin();
  const now = new Date();
  const filters = normalizePlatformAdminSubscriptionFilters(input);
  const requestedPage = normalizePage(getFirst(input.page));
  const { subscriptions, pagination } = await getPlatformAdminSubscriptionRows(filters, {
    page: requestedPage,
    pageSize: PAGE_SIZE,
    now,
  });

  const nowParam = now.toISOString();
  const trialWindowEnd = new Date(now);
  trialWindowEnd.setDate(trialWindowEnd.getDate() + 7);
  const trialWindowEndParam = trialWindowEnd.toISOString();
  const [summaryRows] = await db
    .select({
      total: sql<number>`count(*)::int`,
      trialActive: sql<number>`count(*) filter (where ${subscription.status} = 'trialing' and ${subscription.trialEndsAt} > ${nowParam})::int`,
      trialExpired: sql<number>`count(*) filter (where ${subscription.status} = 'trialing' and ${subscription.trialEndsAt} <= ${nowParam})::int`,
      active: sql<number>`count(*) filter (where ${subscription.status} = 'active' and (${subscription.currentPeriodEnd} is null or ${subscription.currentPeriodEnd} > ${nowParam}))::int`,
      expired: sql<number>`count(*) filter (where ${subscription.status} = 'active' and ${subscription.currentPeriodEnd} <= ${nowParam})::int`,
      pastDue: sql<number>`count(*) filter (where ${subscription.status} = 'past_due')::int`,
      cancelled: sql<number>`count(*) filter (where ${subscription.status} = 'cancelled')::int`,
      trialEndingSoon: sql<number>`count(*) filter (where ${subscription.status} = 'trialing' and ${subscription.trialEndsAt} > ${nowParam} and ${subscription.trialEndsAt} <= ${trialWindowEndParam})::int`,
    })
    .from(subscription);

  return {
    filters,
    subscriptions,
    pagination,
    summary: {
      total: Number(summaryRows?.total ?? 0),
      trialActive: Number(summaryRows?.trialActive ?? 0),
      trialExpired: Number(summaryRows?.trialExpired ?? 0),
      active: Number(summaryRows?.active ?? 0),
      expired: Number(summaryRows?.expired ?? 0),
      pastDue: Number(summaryRows?.pastDue ?? 0),
      cancelled: Number(summaryRows?.cancelled ?? 0),
      trialEndingSoon: Number(summaryRows?.trialEndingSoon ?? 0),
    },
  };
}
