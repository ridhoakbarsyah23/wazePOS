// @vitest-environment node
import { and, eq, gte, lt, or, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { sale } from "@/db/schema";

// ID tetap agar pembersihan antar-run idempoten.
const BUSINESS_ID = "itest-dash-business";
const OUTLET_ID = "itest-dash-outlet";
const USER_ID = "itest-dash-user";

let dbReady = false;
try {
  await db.execute(sql`select 1`);
  dbReady = true;
} catch {
  dbReady = false;
}

const dayInMilliseconds = 86_400_000;
const now = new Date();
const periodStart = new Date(now.getTime() - 6 * dayInMilliseconds);
const previousStart = new Date(periodStart.getTime() - 7 * dayInMilliseconds);
const previousEnd = new Date(now.getTime() - 7 * dayInMilliseconds);

async function cleanup() {
  await db.execute(sql`DELETE FROM sale WHERE business_id = ${BUSINESS_ID}`);
  await db.execute(sql`DELETE FROM outlet WHERE id = ${OUTLET_ID}`);
  await db.execute(sql`DELETE FROM "user" WHERE id = ${USER_ID}`);
  await db.execute(sql`DELETE FROM business WHERE id = ${BUSINESS_ID}`);
}

beforeAll(async () => {
  if (!dbReady) return;
  await cleanup();
  await db.execute(sql`INSERT INTO business (id, name, type) VALUES (${BUSINESS_ID}, ${"Bisnis Uji Dash"}, ${"f&b"})`);
  await db.execute(sql`INSERT INTO "user" (id, name, email) VALUES (${USER_ID}, ${"Kasir Uji"}, ${"itest-dash@example.com"})`);
  await db.execute(sql`INSERT INTO outlet (id, business_id, name, slug) VALUES (${OUTLET_ID}, ${BUSINESS_ID}, ${"Gerai Uji"}, ${"gerai-uji-dash"})`);
  await db.execute(sql`
    INSERT INTO sale (id, business_id, outlet_id, cashier_id, invoice_number, subtotal, total, paid_amount, change_amount, payment_method, status, created_at) VALUES
      (${ "itest-dash-sale-1" }, ${BUSINESS_ID}, ${OUTLET_ID}, ${USER_ID}, 'ITEST-DASH-1', 10000, 10000, 10000, 0, 'cash', 'completed', ${new Date(now.getTime() - dayInMilliseconds).toISOString()}),
      (${ "itest-dash-sale-2" }, ${BUSINESS_ID}, ${OUTLET_ID}, ${USER_ID}, 'ITEST-DASH-2', 5000, 5000, 5000, 0, 'cash', 'completed', ${new Date(now.getTime() - 8 * dayInMilliseconds).toISOString()})
  `);
});

afterAll(async () => {
  if (dbReady) await cleanup();
  await db.$client.end({ timeout: 2 });
});

describe.runIf(dbReady)("query gabungan dashboard (integration)", () => {
  it("menghitung totals current + previous dalam satu query", async () => {
    const combinedTotalsFilters = [
      eq(sale.businessId, BUSINESS_ID),
      eq(sale.status, "completed" as const),
      gte(sale.createdAt, previousStart),
      lt(sale.createdAt, now),
      or(gte(sale.createdAt, periodStart), lt(sale.createdAt, previousEnd)),
    ];

    const periodRows = await db
      .select({
        bucket: sql<string>`case
          when ${sale.createdAt} >= ${periodStart.toISOString()} then 'current'
          else 'previous' end`.as("period"),
        revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
        transactions: sql<number>`COUNT(*)::int`,
      })
      .from(sale)
      .where(and(...combinedTotalsFilters))
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const current = periodRows.find((item) => item.bucket === "current");
    const previous = periodRows.find((item) => item.bucket === "previous");
    expect(Number(current?.revenue ?? 0)).toBe(10_000);
    expect(Number(current?.transactions ?? 0)).toBe(1);
    expect(Number(previous?.revenue ?? 0)).toBe(5_000);
    expect(Number(previous?.transactions ?? 0)).toBe(1);
  });

  it("menghasilkan tren harian + jam dalam satu query grup ganda", async () => {
    const bucketExpression = sql<string>`to_char(timezone('Asia/Jakarta', ${sale.createdAt}), 'YYYY-MM-DD')`;
    const hourExpression = sql<string>`to_char(timezone('Asia/Jakarta', ${sale.createdAt}), 'HH24')`;

    const trendRows = await db
      .select({
        bucket: bucketExpression,
        hour: hourExpression,
        revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
        transactions: sql<number>`COUNT(*)::int`,
      })
      .from(sale)
      .where(and(eq(sale.businessId, BUSINESS_ID), eq(sale.status, "completed" as const)))
      .groupBy(bucketExpression, hourExpression)
      .orderBy(bucketExpression);

    expect(trendRows.length).toBe(2);
    const totalRevenue = trendRows.reduce((sum, row) => sum + Number(row.revenue), 0);
    expect(totalRevenue).toBe(15_000);
  });
});
