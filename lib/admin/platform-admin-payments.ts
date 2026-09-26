import "server-only";

import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { business, businessMember, subscriptionPayment, user } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/admin/platform-admin";
import { PLATFORM_ADMIN_EXPORT_LIMIT } from "@/lib/admin/platform-admin-csv";
import type { PlatformAdminPaymentItem } from "@/lib/admin/platform-admin-types";

const PAGE_SIZE = 10;

type SearchParam = string | string[] | undefined;

export type PlatformAdminPaymentStatusFilter =
  | "all"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded";

export type PlatformAdminPaymentFilters = {
  query: string;
  status: PlatformAdminPaymentStatusFilter;
  plan: "all" | "tumbuh" | "bisnis";
};

export type PlatformAdminPaymentInput = {
  query?: SearchParam;
  status?: SearchParam;
  plan?: SearchParam;
  page?: SearchParam;
};

const paymentStatuses: readonly string[] = ["pending", "paid", "failed", "expired", "refunded"];

function getFirst(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizePlatformAdminPaymentFilters(
  input: PlatformAdminPaymentInput = {},
): PlatformAdminPaymentFilters {
  const statusRaw = getFirst(input.status)?.trim() ?? "all";
  const planRaw = getFirst(input.plan)?.trim() ?? "all";
  return {
    query: getFirst(input.query)?.trim().slice(0, 100) ?? "",
    status: (paymentStatuses as readonly string[]).includes(statusRaw)
      ? (statusRaw as PlatformAdminPaymentFilters["status"])
      : "all",
    plan: planRaw === "tumbuh" || planRaw === "bisnis" ? planRaw : "all",
  };
}

function buildOwnerRows() {
  const ranked = db
    .select({
      businessId: businessMember.businessId,
      email: user.email,
      rowNumber:
        sql<number>`row_number() over (partition by ${businessMember.businessId} order by ${businessMember.createdAt} asc)`.as(
          "pay_owner_row_number",
        ),
    })
    .from(businessMember)
    .innerJoin(user, eq(user.id, businessMember.userId))
    .where(eq(businessMember.role, "owner"))
    .as("platform_pay_ranked_owners");

  return db
    .select({ businessId: ranked.businessId, email: ranked.email })
    .from(ranked)
    .where(eq(ranked.rowNumber, 1))
    .as("platform_pay_owner");
}

function getPaymentWhere(
  filters: PlatformAdminPaymentFilters,
  ownerRows: ReturnType<typeof buildOwnerRows>,
): SQL | undefined {
  const conditions: SQL[] = [];
  if (filters.query) {
    const search = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(business.name, search),
        ilike(ownerRows.email, search),
        ilike(subscriptionPayment.providerOrderId, search),
      )!,
    );
  }
  if (filters.status !== "all") conditions.push(eq(subscriptionPayment.status, filters.status));
  if (filters.plan !== "all") conditions.push(eq(subscriptionPayment.plan, filters.plan));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getPlatformAdminPaymentRows(
  filters: PlatformAdminPaymentFilters,
  options: { page?: number; pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const requestedPage = options.page ?? 1;
  const ownerRows = buildOwnerRows();
  const where = getPaymentWhere(filters, ownerRows);

  const [countRows] = await db
    .select({ value: count() })
    .from(subscriptionPayment)
    .innerJoin(business, eq(business.id, subscriptionPayment.businessId))
    .leftJoin(ownerRows, eq(ownerRows.businessId, business.id))
    .where(where);
  const total = Number(countRows?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: subscriptionPayment.id,
      businessId: subscriptionPayment.businessId,
      businessName: business.name,
      ownerEmail: ownerRows.email,
      plan: subscriptionPayment.plan,
      amount: subscriptionPayment.amount,
      currency: subscriptionPayment.currency,
      provider: subscriptionPayment.provider,
      providerOrderId: subscriptionPayment.providerOrderId,
      providerPaymentType: subscriptionPayment.providerPaymentType,
      status: subscriptionPayment.status,
      createdAt: subscriptionPayment.createdAt,
      paidAt: subscriptionPayment.paidAt,
    })
    .from(subscriptionPayment)
    .innerJoin(business, eq(business.id, subscriptionPayment.businessId))
    .leftJoin(ownerRows, eq(ownerRows.businessId, business.id))
    .where(where)
    .orderBy(desc(subscriptionPayment.createdAt), desc(subscriptionPayment.id))
    .limit(pageSize)
    .offset(offset);

  const payments: PlatformAdminPaymentItem[] = rows.map((item) => ({
    ...item,
    amount: Number(item.amount ?? 0),
  }));

  return {
    payments,
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

export async function getPlatformAdminPaymentExportRows(input: PlatformAdminPaymentInput) {
  const filters = normalizePlatformAdminPaymentFilters(input);
  const result = await getPlatformAdminPaymentRows(filters, {
    page: 1,
    pageSize: PLATFORM_ADMIN_EXPORT_LIMIT,
  });

  return {
    filters,
    payments: result.payments,
    truncated: result.pagination.total > result.payments.length,
  };
}

export async function getPlatformAdminPaymentsData(input: PlatformAdminPaymentInput = {}) {
  await requirePlatformAdmin();
  const filters = normalizePlatformAdminPaymentFilters(input);
  const requestedPage = normalizePage(getFirst(input.page));
  const { payments, pagination } = await getPlatformAdminPaymentRows(filters, {
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const [summaryRows] = await db
    .select({
      pendingPayments: sql<number>`count(*) filter (where ${subscriptionPayment.status} = 'pending')::int`,
      paidPayments: sql<number>`count(*) filter (where ${subscriptionPayment.status} = 'paid')::int`,
      paidRevenue: sql<number>`coalesce(sum(${subscriptionPayment.amount}) filter (where ${subscriptionPayment.status} = 'paid'), 0)::bigint`,
      failedPayments: sql<number>`count(*) filter (where ${subscriptionPayment.status} = 'failed')::int`,
      expiredPayments: sql<number>`count(*) filter (where ${subscriptionPayment.status} = 'expired')::int`,
    })
    .from(subscriptionPayment);

  return {
    filters,
    payments,
    pagination,
    summary: {
      pendingPayments: Number(summaryRows?.pendingPayments ?? 0),
      paidPayments: Number(summaryRows?.paidPayments ?? 0),
      paidRevenue: Number(summaryRows?.paidRevenue ?? 0),
      failedPayments: Number(summaryRows?.failedPayments ?? 0),
      expiredPayments: Number(summaryRows?.expiredPayments ?? 0),
    },
  };
}
