import "server-only";

import { and, asc, count, desc, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { lead } from "@/db/schema";
import { requirePlatformAdmin } from "@/server/admin/platform-admin";
import type {
  PlatformAdminLeadFilters,
  PlatformAdminLeadItem,
  PlatformAdminLeadSummary,
} from "@/shared/admin/platform-admin-types";

const PLATFORM_ADMIN_LEAD_PAGE_SIZE = 10;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type SearchParam = string | string[] | undefined;
type LeadSort = PlatformAdminLeadFilters["sort"];

export type PlatformAdminLeadInput = {
  q?: SearchParam;
  source?: SearchParam;
  createdFrom?: SearchParam;
  createdTo?: SearchParam;
  sort?: SearchParam;
  page?: SearchParam;
};

function getFirstSearchParam(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePageNumber(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeDateInput(value: string | undefined): string {
  const normalized = value?.trim() ?? "";
  if (!DATE_INPUT_PATTERN.test(normalized)) return "";
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "" : normalized;
}

function getDateBoundary(value: string, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeLeadSort(value: string | undefined): LeadSort {
  return value === "oldest" || value === "name_asc" ? value : "newest";
}

export function normalizePlatformAdminLeadFilters(input: PlatformAdminLeadInput = {}): PlatformAdminLeadFilters {
  return {
    query: getFirstSearchParam(input.q)?.trim().slice(0, 100) ?? "",
    source: getFirstSearchParam(input.source)?.trim().slice(0, 50) ?? "",
    createdFrom: normalizeDateInput(getFirstSearchParam(input.createdFrom)),
    createdTo: normalizeDateInput(getFirstSearchParam(input.createdTo)),
    sort: normalizeLeadSort(getFirstSearchParam(input.sort)),
  };
}

function getLeadWhere(filters: PlatformAdminLeadFilters) {
  const conditions: SQL[] = [];

  if (filters.query) {
    const search = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(lead.name, search),
        ilike(lead.whatsapp, search),
        ilike(lead.businessName, search),
        ilike(lead.businessType, search),
        ilike(lead.message, search),
      )!,
    );
  }

  if (filters.source) conditions.push(ilike(lead.source, `%${filters.source}%`));

  const createdFrom = getDateBoundary(filters.createdFrom);
  const createdTo = getDateBoundary(filters.createdTo, true);
  if (createdFrom) conditions.push(gte(lead.createdAt, createdFrom));
  if (createdTo) conditions.push(lte(lead.createdAt, createdTo));

  return conditions.length ? and(...conditions) : undefined;
}

function getOrderBy(sort: LeadSort) {
  switch (sort) {
    case "oldest":
      return [asc(lead.createdAt), asc(lead.id)];
    case "name_asc":
      return [asc(lead.name), desc(lead.createdAt), asc(lead.id)];
    default:
      return [desc(lead.createdAt), asc(lead.id)];
  }
}

function toLeadItem(item: PlatformAdminLeadItem): PlatformAdminLeadItem {
  return item;
}

export async function getPlatformAdminLeadData(input: PlatformAdminLeadInput = {}) {
  await requirePlatformAdmin();

  const filters = normalizePlatformAdminLeadFilters(input);
  const requestedPage = normalizePageNumber(getFirstSearchParam(input.page));
  const leadWhere = getLeadWhere(filters);
  const todayStart = getDateBoundary(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }))!;
  const todayEnd = getDateBoundary(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }), true)!;

  const [countRows, summaryRows] = await Promise.all([
    db.select({ value: count() }).from(lead).where(leadWhere),
    db
      .select({
        total: count(),
        today: sql<number>`count(*) filter (where ${lead.createdAt} >= ${todayStart} and ${lead.createdAt} <= ${todayEnd})::int`,
        webhookDelivered: sql<number>`count(*) filter (where ${lead.webhookDeliveredAt} is not null)::int`,
      })
      .from(lead),
  ]);

  const total = Number(countRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PLATFORM_ADMIN_LEAD_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * PLATFORM_ADMIN_LEAD_PAGE_SIZE;

  const rows = await db
    .select({
      id: lead.id,
      name: lead.name,
      whatsapp: lead.whatsapp,
      businessName: lead.businessName,
      businessType: lead.businessType,
      outlets: lead.outlets,
      message: lead.message,
      source: lead.source,
      webhookDeliveredAt: lead.webhookDeliveredAt,
      createdAt: lead.createdAt,
    })
    .from(lead)
    .where(leadWhere)
    .orderBy(...getOrderBy(filters.sort))
    .limit(PLATFORM_ADMIN_LEAD_PAGE_SIZE)
    .offset(offset);

  const summarySource = summaryRows[0] ?? { total: 0, today: 0, webhookDelivered: 0 };
  const summary: PlatformAdminLeadSummary = {
    total: Number(summarySource.total ?? 0),
    today: Number(summarySource.today ?? 0),
    webhookDelivered: Number(summarySource.webhookDelivered ?? 0),
  };

  return {
    filters,
    leads: rows.map(toLeadItem),
    summary,
    pagination: {
      total,
      page,
      pageSize: PLATFORM_ADMIN_LEAD_PAGE_SIZE,
      totalPages,
      from: total === 0 ? 0 : offset + 1,
      to: Math.min(offset + PLATFORM_ADMIN_LEAD_PAGE_SIZE, total),
    },
  };
}
