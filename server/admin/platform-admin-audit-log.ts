import "server-only";

import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { business, platformAdminAuditLog } from "@/db/schema";
import { requirePlatformAdmin } from "@/server/admin/platform-admin";
import type { PlatformAdminAuditLogItem } from "@/shared/admin/platform-admin-types";

const PAGE_SIZE = 15;

type SearchParam = string | string[] | undefined;

export type PlatformAdminAuditFilters = {
  query: string;
  action: string;
};

export type PlatformAdminAuditInput = {
  query?: SearchParam;
  action?: SearchParam;
  page?: SearchParam;
};

const auditActions: readonly string[] = [
  "all",
  "business_detail_view",
  "business_export",
  "subscription_export",
  "payment_export",
];

function getFirst(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizePlatformAdminAuditFilters(input: PlatformAdminAuditInput = {}): PlatformAdminAuditFilters {
  const actionRaw = getFirst(input.action)?.trim() ?? "all";
  return {
    query: getFirst(input.query)?.trim().slice(0, 100) ?? "",
    action: auditActions.includes(actionRaw) ? actionRaw : "all",
  };
}

export async function getPlatformAdminAuditData(input: PlatformAdminAuditInput = {}) {
  await requirePlatformAdmin();

  const filters = normalizePlatformAdminAuditFilters(input);
  const requestedPage = normalizePage(getFirst(input.page));

  const conditions: SQL[] = [];
  if (filters.action !== "all")
    conditions.push(
      eq(
        platformAdminAuditLog.action,
        filters.action as
          | "business_detail_view"
          | "business_export"
          | "subscription_export"
          | "payment_export",
      ),
    );
  if (filters.query) {
    const search = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(platformAdminAuditLog.actorEmail, search),
        ilike(platformAdminAuditLog.actorName, search),
        ilike(platformAdminAuditLog.entityId, search),
        ilike(business.name, search),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  let total = 0;
  let rows: PlatformAdminAuditLogItem[] = [];
  let page = 1;
  let totalPages = 1;
  let from = 0;
  let to = 0;
  let auditAvailable = true;

  try {
    const [countRows] = await db
      .select({ value: count() })
      .from(platformAdminAuditLog)
      .leftJoin(business, eq(business.id, platformAdminAuditLog.businessId))
      .where(where);
    total = Number(countRows?.value ?? 0);
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * PAGE_SIZE;
    from = total === 0 ? 0 : offset + 1;
    to = Math.min(offset + PAGE_SIZE, total);

    const resultRows = await db
      .select({
        id: platformAdminAuditLog.id,
        action: platformAdminAuditLog.action,
        entityType: platformAdminAuditLog.entityType,
        entityId: platformAdminAuditLog.entityId,
        businessId: platformAdminAuditLog.businessId,
        businessName: business.name,
        actorName: platformAdminAuditLog.actorName,
        actorEmail: platformAdminAuditLog.actorEmail,
        createdAt: platformAdminAuditLog.createdAt,
        metadata: platformAdminAuditLog.metadata,
      })
      .from(platformAdminAuditLog)
      .leftJoin(business, eq(business.id, platformAdminAuditLog.businessId))
      .where(where)
      .orderBy(desc(platformAdminAuditLog.createdAt), desc(platformAdminAuditLog.id))
      .limit(PAGE_SIZE)
      .offset(offset);

    rows = resultRows.map((item) => ({
      ...item,
      metadata: (item.metadata as Record<string, unknown> | null) ?? null,
    }));
  } catch (error) {
    auditAvailable = false;
    console.error("Failed to load Platform Admin audit log", error);
  }

  return {
    filters,
    logs: rows,
    auditAvailable,
    pagination: { total, page, pageSize: PAGE_SIZE, totalPages, from, to },
  };
}
