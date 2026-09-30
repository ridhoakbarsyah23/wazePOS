import "server-only";

import { count, desc, eq, ilike, or, max, inArray } from "drizzle-orm";
import { db } from "@/db";
import { business, businessMember, user, session } from "@/db/schema";
import { requirePlatformAdmin } from "@/server/admin/platform-admin";
import { isPlatformAdminUser } from "@/shared/admin/platform-admin-access";

type SearchParam = string | string[] | undefined;
const first = (value: SearchParam) => Array.isArray(value) ? value[0] : value;
const PAGE_SIZE = 10;

export async function getPlatformAdminUsers(input: { q?: SearchParam; page?: SearchParam }) {
  await requirePlatformAdmin();

  const query = (first(input.q) ?? "").trim().slice(0, 100);
  const search = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const where = query ? or(ilike(user.name, search), ilike(user.email, search)) : undefined;
  const [totals] = await db.select({ total: count() }).from(user).where(where);
  const total = Number(totals?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requestedPage = Number(first(input.page));
  const page = Math.min(totalPages, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Membership is unique per user. Left joins retain accounts without a business.
  const users = await db.select({
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    privacyAcceptedAt: user.privacyAcceptedAt,
    businessName: business.name,
    role: businessMember.role,
  })
    .from(user)
    .leftJoin(businessMember, eq(businessMember.userId, user.id))
    .leftJoin(business, eq(business.id, businessMember.businessId))
    .where(where)
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(PAGE_SIZE)
    .offset(offset);

  const userIds = users.map((u) => u.id);
  const lastActiveMap = new Map<string, Date>();

  if (userIds.length > 0) {
    const activeSessions = await db.select({
      userId: session.userId,
      lastActiveAt: max(session.updatedAt),
    })
      .from(session)
      .where(inArray(session.userId, userIds))
      .groupBy(session.userId);

    for (const s of activeSessions) {
      if (s.lastActiveAt) {
        lastActiveMap.set(s.userId, new Date(s.lastActiveAt as string | Date));
      }
    }
  }

  return {
    query,
    users: users.map((item) => ({
      ...item,
      isPlatformAdmin: isPlatformAdminUser(item, process.env.PLATFORM_ADMIN_EMAILS),
      lastActiveAt: lastActiveMap.get(item.id) ?? null,
    })),
    pagination: { total, page, totalPages, from: total ? offset + 1 : 0, to: Math.min(offset + PAGE_SIZE, total) },
  };
}
