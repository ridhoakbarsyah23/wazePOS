import "server-only";

import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNull,
  lte,
  max,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  business,
  businessMember,
  outlet,
  sale,
  subscription,
  subscriptionPayment,
  user,
} from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/admin/platform-admin";
import {
  getPlatformSubscriptionState,
  platformSubscriptionStates,
} from "@/lib/admin/platform-admin-access";
import type {
  PlatformAdminBusiness,
  PlatformAdminDirectoryFilters,
  PlatformAdminOnboardingFilter,
  PlatformAdminPlanFilter,
  PlatformAdminSort,
} from "@/lib/admin/platform-admin-types";
import { plans } from "@/lib/billing/plans";

const PLATFORM_ADMIN_PAGE_SIZE = 10;
const PLATFORM_ADMIN_EXPORT_LIMIT = 10_000;
const TRIAL_ENDING_WINDOW_DAYS = 7;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type SearchParam = string | string[] | undefined;
type PlatformAdminStatusFilter = PlatformAdminDirectoryFilters["status"];

export type PlatformAdminDirectoryInput = {
  query?: SearchParam;
  status?: SearchParam;
  businessType?: SearchParam;
  plan?: SearchParam;
  onboarding?: SearchParam;
  registeredFrom?: SearchParam;
  registeredTo?: SearchParam;
  sort?: SearchParam;
};

function getFirstSearchParam(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePageNumber(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeDateInput(value: string | undefined): string {
  const normalized = getFirstSearchParam(value)?.trim() ?? "";
  if (!DATE_INPUT_PATTERN.test(normalized)) return "";
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "" : normalized;
}

// Filter tanggal administrator mengikuti zona waktu bisnis wazePOS (WIB).
function getDateBoundary(value: string, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeStatusFilter(value: string | undefined): PlatformAdminStatusFilter {
  return platformSubscriptionStates.includes(value as (typeof platformSubscriptionStates)[number])
    ? (value as PlatformAdminStatusFilter)
    : "all";
}

function normalizePlanFilter(value: string | undefined): PlatformAdminPlanFilter {
  return value === "tumbuh" || value === "bisnis" || value === "missing" ? value : "all";
}

function normalizeOnboardingFilter(value: string | undefined): PlatformAdminOnboardingFilter {
  return value === "completed" || value === "incomplete" ? value : "all";
}

function normalizeSort(value: string | undefined): PlatformAdminSort {
  return value === "oldest" ||
    value === "name_asc" ||
    value === "name_desc" ||
    value === "trial_ending" ||
    value === "activity"
    ? value
    : "newest";
}

export function normalizePlatformAdminDirectoryFilters(
  input: PlatformAdminDirectoryInput = {},
): PlatformAdminDirectoryFilters {
  return {
    query: getFirstSearchParam(input.query)?.trim().slice(0, 100) ?? "",
    status: normalizeStatusFilter(getFirstSearchParam(input.status)),
    businessType: getFirstSearchParam(input.businessType)?.trim().slice(0, 50) ?? "",
    plan: normalizePlanFilter(getFirstSearchParam(input.plan)),
    onboarding: normalizeOnboardingFilter(getFirstSearchParam(input.onboarding)),
    registeredFrom: normalizeDateInput(getFirstSearchParam(input.registeredFrom)),
    registeredTo: normalizeDateInput(getFirstSearchParam(input.registeredTo)),
    sort: normalizeSort(getFirstSearchParam(input.sort)),
  };
}

function getStatusCondition(status: PlatformAdminStatusFilter, now: Date): SQL | undefined {
  switch (status) {
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
      return isNull(subscription.id);
    default:
      return undefined;
  }
}

function getOrderBy(sort: PlatformAdminSort, activityRows: ReturnType<typeof buildActivityRows>) {
  switch (sort) {
    case "oldest":
      return [asc(business.createdAt), asc(business.id)];
    case "name_asc":
      return [asc(business.name), asc(business.id)];
    case "name_desc":
      return [desc(business.name), asc(business.id)];
    case "trial_ending": {
      const boundary = sql`coalesce(case when ${subscription.status} = 'trialing' then ${subscription.trialEndsAt} else ${subscription.currentPeriodEnd} end)`;
      return [
        sql`${boundary} is null`,
        asc(boundary),
        desc(business.createdAt),
        asc(business.id),
      ];
    }
    case "activity":
      return [
        sql`${activityRows.lastActivityAt} is null`,
        desc(activityRows.lastActivityAt),
        desc(business.createdAt),
        asc(business.id),
      ];
    default:
      return [desc(business.createdAt), asc(business.id)];
  }
}

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
    .as("platform_ranked_owners");

  return db
    .select({
      businessId: rankedOwners.businessId,
      name: rankedOwners.name,
      email: rankedOwners.email,
    })
    .from(rankedOwners)
    .where(eq(rankedOwners.rowNumber, 1))
    .as("platform_owner");
}

function buildMemberCounts() {
  return db
    .select({ businessId: businessMember.businessId, memberCount: count().as("member_count") })
    .from(businessMember)
    .groupBy(businessMember.businessId)
    .as("platform_member_counts");
}

function buildOutletCounts() {
  return db
    .select({ businessId: outlet.businessId, outletCount: count().as("outlet_count") })
    .from(outlet)
    .groupBy(outlet.businessId)
    .as("platform_outlet_counts");
}

function buildActivityRows() {
  return db
    .select({
      businessId: sale.businessId,
      saleCount: count().as("sale_count"),
      grossRevenue: sum(sale.total).as("gross_revenue"),
      lastActivityAt: max(sale.createdAt).as("last_activity_at"),
    })
    .from(sale)
    .where(eq(sale.status, "completed"))
    .groupBy(sale.businessId)
    .as("platform_activity");
}

function getDirectoryWhere(
  filters: PlatformAdminDirectoryFilters,
  now: Date,
  ownerRows: ReturnType<typeof buildOwnerRows>,
) {
  const conditions: SQL[] = [];

  if (filters.query) {
    const search = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(business.name, search),
        ilike(ownerRows.name, search),
        ilike(ownerRows.email, search),
      )!,
    );
  }
  if (filters.businessType) {
    conditions.push(ilike(business.type, `%${filters.businessType}%`));
  }

  const statusCondition = getStatusCondition(filters.status, now);
  if (statusCondition) conditions.push(statusCondition);

  if (filters.plan === "missing") {
    conditions.push(isNull(subscription.id));
  } else if (filters.plan !== "all") {
    conditions.push(eq(subscription.plan, filters.plan));
  }

  if (filters.onboarding === "completed") {
    conditions.push(eq(business.onboardingCompleted, true));
  } else if (filters.onboarding === "incomplete") {
    conditions.push(eq(business.onboardingCompleted, false));
  }

  const registeredFrom = getDateBoundary(filters.registeredFrom);
  const registeredTo = getDateBoundary(filters.registeredTo, true);
  if (registeredFrom) conditions.push(gte(business.createdAt, registeredFrom));
  if (registeredTo) conditions.push(lte(business.createdAt, registeredTo));

  return conditions.length ? and(...conditions) : undefined;
}

function toBusinessRow(
  item: {
    id: string;
    name: string;
    type: string;
    onboardingCompleted: boolean;
    createdAt: Date;
    ownerName: string | null;
    ownerEmail: string | null;
    plan: "tumbuh" | "bisnis" | null;
    subscriptionStatus: "trialing" | "active" | "past_due" | "cancelled" | null;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    memberCount: number | string | null;
    outletCount: number | string | null;
    saleCount: number | string | null;
    grossRevenue: number | string | null;
    lastActivityAt: Date | null;
  },
  now: Date,
): PlatformAdminBusiness {
  return {
    ...item,
    memberCount: Number(item.memberCount ?? 0),
    outletCount: Number(item.outletCount ?? 0),
    saleCount: Number(item.saleCount ?? 0),
    grossRevenue: Number(item.grossRevenue ?? 0),
    state: getPlatformSubscriptionState(
      item.subscriptionStatus && item.trialEndsAt
        ? {
            status: item.subscriptionStatus,
            trialEndsAt: item.trialEndsAt,
            currentPeriodEnd: item.currentPeriodEnd,
          }
        : null,
      now,
    ),
  };
}

export async function getPlatformAdminDirectoryRows(
  filters: PlatformAdminDirectoryFilters,
  options: { page?: number; pageSize?: number; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const pageSize = options.pageSize ?? PLATFORM_ADMIN_PAGE_SIZE;
  const requestedPage = options.page ?? 1;
  const ownerRows = buildOwnerRows();
  const memberCounts = buildMemberCounts();
  const outletCounts = buildOutletCounts();
  const activityRows = buildActivityRows();
  const directoryWhere = getDirectoryWhere(filters, now, ownerRows);

  const directoryCountRows = await db
    .select({ value: countDistinct(business.id) })
    .from(business)
    .leftJoin(subscription, eq(subscription.businessId, business.id))
    .leftJoin(ownerRows, eq(ownerRows.businessId, business.id))
    .where(directoryWhere);
  const total = Number(directoryCountRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await db
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
      memberCount: memberCounts.memberCount,
      outletCount: outletCounts.outletCount,
      saleCount: activityRows.saleCount,
      grossRevenue: activityRows.grossRevenue,
      lastActivityAt: activityRows.lastActivityAt,
    })
    .from(business)
    .leftJoin(subscription, eq(subscription.businessId, business.id))
    .leftJoin(ownerRows, eq(ownerRows.businessId, business.id))
    .leftJoin(memberCounts, eq(memberCounts.businessId, business.id))
    .leftJoin(outletCounts, eq(outletCounts.businessId, business.id))
    .leftJoin(activityRows, eq(activityRows.businessId, business.id))
    .where(directoryWhere)
    .orderBy(...getOrderBy(filters.sort, activityRows))
    .limit(pageSize)
    .offset(offset);

  return {
    businesses: rows.map((item) => toBusinessRow(item, now)),
    directory: {
      total,
      page,
      pageSize,
      totalPages,
      from: total === 0 ? 0 : offset + 1,
      to: Math.min(offset + pageSize, total),
    },
  };
}

export async function getPlatformAdminBusinessExportRows(
  input: PlatformAdminDirectoryInput,
) {
  const filters = normalizePlatformAdminDirectoryFilters(input);
  const result = await getPlatformAdminDirectoryRows(filters, {
    page: 1,
    pageSize: PLATFORM_ADMIN_EXPORT_LIMIT,
  });

  return {
    filters,
    businesses: result.businesses,
    truncated: result.directory.total > result.businesses.length,
  };
}

export async function getPlatformAdminStats(now: Date = new Date()) {
  const nowParam = now.toISOString();
  const trialWindowEnd = new Date(now);
  trialWindowEnd.setDate(trialWindowEnd.getDate() + TRIAL_ENDING_WINDOW_DAYS);
  const trialWindowEndParam = trialWindowEnd.toISOString();

  const [overviewRows, paymentRows, analyticsRows] = await Promise.all([
    db
      .select({
        totalUsers: sql<number>`(select count(*)::int from "user")`,
        totalBusinesses: sql<number>`count(${business.id})::int`,
        trialActive: sql<number>`count(*) filter (where ${subscription.status} = 'trialing' and ${subscription.trialEndsAt} > ${nowParam})::int`,
        trialExpired: sql<number>`count(*) filter (where ${subscription.status} = 'trialing' and ${subscription.trialEndsAt} <= ${nowParam})::int`,
        activeSubscriptions: sql<number>`count(*) filter (where ${subscription.status} = 'active' and (${subscription.currentPeriodEnd} is null or ${subscription.currentPeriodEnd} > ${nowParam}))::int`,
        expiredSubscriptions: sql<number>`count(*) filter (where ${subscription.status} = 'active' and ${subscription.currentPeriodEnd} <= ${nowParam})::int`,
        pastDue: sql<number>`count(*) filter (where ${subscription.status} = 'past_due')::int`,
        cancelled: sql<number>`count(*) filter (where ${subscription.status} = 'cancelled')::int`,
      })
      .from(business)
      .leftJoin(subscription, eq(subscription.businessId, business.id)),
    db
      .select({
        pendingPayments: sql<number>`count(*) filter (where ${subscriptionPayment.status} = 'pending')::int`,
        paidPayments: sql<number>`count(*) filter (where ${subscriptionPayment.status} = 'paid')::int`,
        paidRevenue: sql<number>`coalesce(sum(${subscriptionPayment.amount}) filter (where ${subscriptionPayment.status} = 'paid'), 0)::bigint`,
      })
      .from(subscriptionPayment),
    db
      .select({
        totalSubscriptions: sql<number>`count(*)::int`,
        convertedSubscriptions: sql<number>`count(*) filter (where ${subscription.status} <> 'trialing')::int`,
        activeMrr: sql<number>`coalesce(sum(case when ${subscription.status} = 'active' then case when ${subscription.plan} = 'bisnis' then ${sql.raw(String(Math.round(plans.bisnis.annualPrice / 12)))} else ${sql.raw(String(Math.round(plans.tumbuh.annualPrice / 12)))} end else 0 end), 0)::bigint`,
        trialEndingSoon: sql<number>`count(*) filter (where ${subscription.status} = 'trialing' and ${subscription.trialEndsAt} > ${nowParam} and ${subscription.trialEndsAt} <= ${trialWindowEndParam})::int`,
      })
      .from(subscription),
  ]);

  const overview = overviewRows[0] ?? {
    totalUsers: 0,
    totalBusinesses: 0,
    trialActive: 0,
    trialExpired: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    pastDue: 0,
    cancelled: 0,
  };
  const payments = paymentRows[0] ?? { pendingPayments: 0, paidPayments: 0, paidRevenue: 0 };
  const analyticsRowsResult = analyticsRows[0] ?? {
    totalSubscriptions: 0,
    convertedSubscriptions: 0,
    activeMrr: 0,
    trialEndingSoon: 0,
  };
  const analytics = {
    totalSubscriptions: Number(analyticsRowsResult.totalSubscriptions),
    convertedSubscriptions: Number(analyticsRowsResult.convertedSubscriptions),
    activeMrr: Number(analyticsRowsResult.activeMrr),
    trialEndingSoon: Number(analyticsRowsResult.trialEndingSoon),
    trialConversionRate:
      Number(analyticsRowsResult.totalSubscriptions) > 0
        ? Math.round(
            (Number(analyticsRowsResult.convertedSubscriptions) /
              Number(analyticsRowsResult.totalSubscriptions)) *
              1000,
          ) / 10
        : 0,
    activeSubscriptions: Number(overview.activeSubscriptions),
    trialActive: Number(overview.trialActive),
    trialExpired: Number(overview.trialExpired),
    pastDue: Number(overview.pastDue),
    cancelled: Number(overview.cancelled),
  };

  return {
    overview: {
      ...overview,
      totalUsers: Number(overview.totalUsers),
      totalBusinesses: Number(overview.totalBusinesses),
      trialActive: Number(overview.trialActive),
      trialExpired: Number(overview.trialExpired),
      activeSubscriptions: Number(overview.activeSubscriptions),
      expiredSubscriptions: Number(overview.expiredSubscriptions),
      pastDue: Number(overview.pastDue),
      cancelled: Number(overview.cancelled),
    },
    payments: {
      pendingPayments: Number(payments.pendingPayments),
      paidPayments: Number(payments.paidPayments),
      paidRevenue: Number(payments.paidRevenue),
    },
    analytics,
  };
}

export async function getPlatformAdminOverviewData() {
  const adminSession = await requirePlatformAdmin();
  const stats = await getPlatformAdminStats(new Date());

  return {
    admin: adminSession.user,
    ...stats,
  };
}

export async function getPlatformAdminDirectoryData(
  input: PlatformAdminDirectoryInput & { page?: SearchParam },
) {
  await requirePlatformAdmin();
  const now = new Date();
  const filters = normalizePlatformAdminDirectoryFilters(input);
  const requestedPage = normalizePageNumber(getFirstSearchParam(input.page));
  const [{ businesses, directory }, stats] = await Promise.all([
    getPlatformAdminDirectoryRows(filters, {
      page: requestedPage,
      pageSize: PLATFORM_ADMIN_PAGE_SIZE,
      now,
    }),
    getPlatformAdminStats(now),
  ]);

  return {
    filters,
    businesses,
    directory,
    overview: {
      expiredSubscriptions: stats.overview.expiredSubscriptions,
      pastDue: stats.overview.pastDue,
      cancelled: stats.overview.cancelled,
    },
  };
}

export async function getPlatformAdminDashboardData(input: PlatformAdminDirectoryInput & { page?: SearchParam }) {
  const overviewData = await getPlatformAdminOverviewData();
  const directoryData = await getPlatformAdminDirectoryData(input);

  return {
    ...overviewData,
    ...directoryData,
    overview: overviewData.overview,
  };
}
