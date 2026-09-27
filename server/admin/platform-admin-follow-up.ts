import "server-only";

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { business, businessMember, platformAdminAuditLog, platformAdminFollowUp, user } from "@/db/schema";
import type { FollowUpInput } from "@/shared/admin/platform-admin-follow-up";
import type { PlatformAdminTodayFollowUps } from "@/shared/admin/platform-admin-types";

const PAGE_SIZE = 10;
const TODAY_FOLLOW_UP_LIMIT = 8;
const newestFirst = [desc(platformAdminFollowUp.createdAt), desc(platformAdminFollowUp.id)];

export function getTodayWIBDateString(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function getBusinessFollowUps(businessId: string, requestedPage = 1) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: business.id }).from(business).where(eq(business.id, businessId)).limit(1);
    if (!existing) return null;
    const where = eq(platformAdminFollowUp.businessId, businessId);
    const [totals] = await tx.select({ total: count() }).from(platformAdminFollowUp).where(where);
    const total = Number(totals.total);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(totalPages, Math.max(1, requestedPage));
    const entries = await tx.select().from(platformAdminFollowUp).where(where).orderBy(...newestFirst).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
    const latest = page === 1 ? entries[0] : (await tx.select().from(platformAdminFollowUp).where(where).orderBy(...newestFirst).limit(1))[0];
    return { latest: latest ?? null, entries, pagination: { page, total, totalPages } };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

export async function getTodayFollowUps(now: Date = new Date()): Promise<PlatformAdminTodayFollowUps> {
  const today = getTodayWIBDateString(now);

  const rankedFollowUps = db
    .select({
      businessId: platformAdminFollowUp.businessId,
      note: platformAdminFollowUp.note,
      status: platformAdminFollowUp.status,
      followUpDate: platformAdminFollowUp.followUpDate,
      authorName: platformAdminFollowUp.authorName,
      authorEmail: platformAdminFollowUp.authorEmail,
      createdAt: platformAdminFollowUp.createdAt,
      rowNumber:
        sql<number>`row_number() over (partition by ${platformAdminFollowUp.businessId} order by ${platformAdminFollowUp.createdAt} desc, ${platformAdminFollowUp.id} desc)`.as(
          "today_follow_up_row_number",
        ),
    })
    .from(platformAdminFollowUp)
    .as("platform_today_follow_up_ranked");

  const rankedOwners = db
    .select({
      businessId: businessMember.businessId,
      name: user.name,
      email: user.email,
      rowNumber:
        sql<number>`row_number() over (partition by ${businessMember.businessId} order by ${businessMember.createdAt} asc)`.as(
          "today_follow_up_owner_row_number",
        ),
    })
    .from(businessMember)
    .innerJoin(user, eq(user.id, businessMember.userId))
    .where(eq(businessMember.role, "owner"))
    .as("platform_today_follow_up_ranked_owners");

  const ownerRows = db
    .select({
      businessId: rankedOwners.businessId,
      name: rankedOwners.name,
      email: rankedOwners.email,
    })
    .from(rankedOwners)
    .where(eq(rankedOwners.rowNumber, 1))
    .as("platform_today_follow_up_owner");

  // Hanya status terbaru per usaha yang menentukan antrean hari ini.
  // Baris lama diabaikan agar tugas yang sudah selesai atau dijadwalkan ulang tidak muncul lagi.
  const currentWhere = and(
    eq(rankedFollowUps.rowNumber, 1),
    inArray(rankedFollowUps.status, ["open", "in_progress"]),
    sql`${rankedFollowUps.followUpDate} is not null and ${rankedFollowUps.followUpDate} <= ${today}`,
  );

  const [countRows, rows] = await Promise.all([
    db
      .select({ value: count() })
      .from(rankedFollowUps)
      .where(currentWhere),
    db
      .select({
        businessId: rankedFollowUps.businessId,
        businessName: business.name,
        ownerName: ownerRows.name,
        ownerEmail: ownerRows.email,
        note: rankedFollowUps.note,
        status: rankedFollowUps.status,
        followUpDate: rankedFollowUps.followUpDate,
        authorName: rankedFollowUps.authorName,
        authorEmail: rankedFollowUps.authorEmail,
        createdAt: rankedFollowUps.createdAt,
      })
      .from(rankedFollowUps)
      .innerJoin(business, eq(business.id, rankedFollowUps.businessId))
      .leftJoin(ownerRows, eq(ownerRows.businessId, rankedFollowUps.businessId))
      .where(currentWhere)
      .orderBy(
        rankedFollowUps.followUpDate,
        desc(rankedFollowUps.createdAt),
        business.name,
      )
      .limit(TODAY_FOLLOW_UP_LIMIT),
  ]);

  return {
    today,
    total: Number(countRows[0]?.value ?? 0),
    items: rows.map((item) => ({
      businessId: item.businessId,
      businessName: item.businessName,
      ownerName: item.ownerName,
      ownerEmail: item.ownerEmail,
      note: item.note,
      status: item.status,
      // followUpDate sudah disaring NOT NULL di query.
      followUpDate: item.followUpDate ?? today,
      authorName: item.authorName,
      authorEmail: item.authorEmail,
      createdAt: item.createdAt,
    })),
  };
}

export async function createBusinessFollowUp(
  businessId: string,
  input: FollowUpInput,
  actor: { id: string; name: string; email: string },
) {
  return db.transaction(async (tx) => {
    // Serialize writes for this business before checking the last version.
    const [existing] = await tx.select({ id: business.id }).from(business).where(eq(business.id, businessId)).for("update");
    if (!existing) return { outcome: "not_found" as const };
    const [latest] = await tx.select().from(platformAdminFollowUp).where(eq(platformAdminFollowUp.businessId, businessId)).orderBy(...newestFirst).limit(1);
    if ((latest?.id ?? null) !== input.expectedLatestId) return { outcome: "conflict" as const };
    const id = randomUUID();
    // Monotonic ordering also works for concurrent transactions started earlier.
    const createdAt = new Date(Math.max(Date.now(), (latest?.createdAt.getTime() ?? 0) + 1));
    const [entry] = await tx.insert(platformAdminFollowUp).values({
      id, businessId, note: input.note, status: input.status, followUpDate: input.followUpDate,
      authorUserId: actor.id, authorName: actor.name, authorEmail: actor.email, createdAt,
    }).returning();
    // A write and its audit record must commit together.
    await tx.insert(platformAdminAuditLog).values({
      id: randomUUID(), businessId, actorUserId: actor.id, actorName: actor.name, actorEmail: actor.email,
      action: "business_follow_up_created", entityType: "business", entityId: id,
      metadata: { status: input.status, followUpDate: input.followUpDate },
    });
    return { outcome: "created" as const, entry };
  });
}
