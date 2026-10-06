import "server-only";

import { and, asc, count, desc, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { lead } from "@/db/schema";
import { requirePlatformAdmin } from "@/server/admin/platform-admin";
import { leadStatuses, type LeadStatus, type LeadUpdateInput } from "@/shared/admin/platform-admin-leads";
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
  status?: SearchParam;
  followUp?: SearchParam;
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

function getDateBoundaryIso(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeLeadSort(value: string | undefined): LeadSort {
  return value === "oldest" || value === "name_asc" ? value : "newest";
}

function normalizeLeadStatus(value: string | undefined): PlatformAdminLeadFilters["status"] {
  return leadStatuses.includes(value as LeadStatus) ? (value as LeadStatus) : "all";
}

function normalizeFollowUpFilter(value: string | undefined): PlatformAdminLeadFilters["followUp"] {
  return value === "due" ? "due" : "all";
}

function getTodayWIBDateString(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function normalizePlatformAdminLeadFilters(input: PlatformAdminLeadInput = {}): PlatformAdminLeadFilters {
  return {
    query: getFirstSearchParam(input.q)?.trim().slice(0, 100) ?? "",
    source: getFirstSearchParam(input.source)?.trim().slice(0, 50) ?? "",
    status: normalizeLeadStatus(getFirstSearchParam(input.status)),
    followUp: normalizeFollowUpFilter(getFirstSearchParam(input.followUp)),
    createdFrom: normalizeDateInput(getFirstSearchParam(input.createdFrom)),
    createdTo: normalizeDateInput(getFirstSearchParam(input.createdTo)),
    sort: normalizeLeadSort(getFirstSearchParam(input.sort)),
  };
}

function getLeadWhere(filters: PlatformAdminLeadFilters, today: string) {
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
  if (filters.status !== "all") conditions.push(sql`${lead.status} = ${filters.status}`);
  if (filters.followUp === "due") {
    conditions.push(and(
      sql`${lead.followUpDate} is not null`,
      sql`${lead.followUpDate} <= ${today}`,
      sql`${lead.status} <> 'not_qualified'`,
    )!);
  }

  const createdFrom = getDateBoundaryIso(filters.createdFrom);
  const createdTo = getDateBoundaryIso(filters.createdTo, true);
  if (createdFrom) conditions.push(sql`${lead.createdAt} >= ${createdFrom}::timestamptz`);
  if (createdTo) conditions.push(sql`${lead.createdAt} <= ${createdTo}::timestamptz`);

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
  const businessDate = getTodayWIBDateString();
  const leadWhere = getLeadWhere(filters, businessDate);
  const todayStart = getDateBoundaryIso(businessDate)!;
  const todayEnd = getDateBoundaryIso(businessDate, true)!;

  const [countRows, summaryRows] = await Promise.all([
    db.select({ value: count() }).from(lead).where(leadWhere),
    db
      .select({
        total: count(),
        today: sql<number>`count(*) filter (where ${lead.createdAt} >= ${todayStart}::timestamptz and ${lead.createdAt} <= ${todayEnd}::timestamptz)::int`,
        followUpDue: sql<number>`count(*) filter (where ${lead.followUpDate} is not null and ${lead.followUpDate} <= ${businessDate} and ${lead.status} <> 'not_qualified')::int`,
        webhookDelivered: sql<number>`count(*) filter (where ${lead.webhookDeliveredAt} is not null)::int`,
        new: sql<number>`count(*) filter (where ${lead.status} = 'new')::int`,
        contacted: sql<number>`count(*) filter (where ${lead.status} = 'contacted')::int`,
        interested: sql<number>`count(*) filter (where ${lead.status} = 'interested')::int`,
        notQualified: sql<number>`count(*) filter (where ${lead.status} = 'not_qualified')::int`,
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
      status: lead.status,
      followUpNote: lead.followUpNote,
      followUpDate: lead.followUpDate,
      statusUpdatedAt: lead.statusUpdatedAt,
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
    businessDate,
    followUpDue: Number((summarySource as { followUpDue?: number }).followUpDue ?? 0),
    webhookDelivered: Number(summarySource.webhookDelivered ?? 0),
    new: Number((summarySource as { new?: number }).new ?? 0),
    contacted: Number((summarySource as { contacted?: number }).contacted ?? 0),
    interested: Number((summarySource as { interested?: number }).interested ?? 0),
    notQualified: Number((summarySource as { notQualified?: number }).notQualified ?? 0),
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

export async function updatePlatformAdminLead(leadId: string, input: LeadUpdateInput) {
  await requirePlatformAdmin();

  const [updated] = await db
    .update(lead)
    .set({
      status: input.status,
      followUpNote: input.followUpNote && input.followUpNote.trim().length > 0 ? input.followUpNote.trim() : null,
      followUpDate: input.followUpDate,
      statusUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(sql`${lead.id} = ${leadId}`)
    .returning({
      id: lead.id,
      status: lead.status,
      followUpNote: lead.followUpNote,
      followUpDate: lead.followUpDate,
      statusUpdatedAt: lead.statusUpdatedAt,
    });

  if (!updated) return null;
  return updated;
}
