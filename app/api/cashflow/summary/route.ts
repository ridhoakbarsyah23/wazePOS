import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cashExpense, outlet, sale } from "@/db/schema";
import { isMissingSchemaError } from "@/server/db/schema-errors";
import { getBusinessSubscription, getMembership } from "@/server/auth/auth-session";
import { hasPlanFeature } from "@/shared/billing/plans";
import { auth } from "@/server/auth/auth";

const dayInMilliseconds = 86_400_000;
const jakartaDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date) {
  const parts = Object.fromEntries(
    jakartaDateFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function startOfJakartaDay(date: Date) {
  return new Date(`${dateKey(date)}T00:00:00+07:00`);
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });
  }

  const membership = await getMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  }

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  if (!hasPlanFeature(currentSubscription?.plan, "cashflow")) {
    return NextResponse.json(
      { message: "Arus kas tersedia pada wazePOS Business.", code: "PLAN_FEATURE_REQUIRED" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period");
  const outletParam = url.searchParams.get("outlet");
  const periodKey = period === "today" || period === "30d" ? period : "7d";
  const periodDays = periodKey === "today" ? 1 : periodKey === "7d" ? 7 : 30;

  const now = new Date();
  const periodStart = new Date(startOfJakartaDay(now).getTime() - (periodDays - 1) * dayInMilliseconds);

  let outletId: string | null = null;
  if (outletParam && outletParam !== "all") {
    const [found] = await db
      .select({ id: outlet.id })
      .from(outlet)
      .where(and(eq(outlet.id, outletParam), eq(outlet.businessId, membership.businessId)))
      .limit(1);
    if (!found) {
      return NextResponse.json({ message: "Gerai tidak ditemukan." }, { status: 422 });
    }
    outletId = found.id;
  }

  const saleFilters = [
    eq(sale.businessId, membership.businessId),
    eq(sale.status, "completed"),
    gte(sale.createdAt, periodStart),
    lt(sale.createdAt, now),
    ...(outletId ? [eq(sale.outletId, outletId)] : []),
  ];

  const expenseFilters = [
    eq(cashExpense.businessId, membership.businessId),
    gte(cashExpense.spentAt, periodStart),
    lt(cashExpense.spentAt, now),
    ...(outletId ? [eq(cashExpense.outletId, outletId)] : []),
  ];

  const [saleRows, expenseResults] = await Promise.all([
    db
      .select({
        total: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(sale)
      .where(and(...saleFilters)),
    // Tabel cash_expense dibuat migrasi 0022; production yang belum dimigrasi
    // tetap mengembalikan ringkasan uang masuk + flag unavailable.
    (async () => {
      try {
        const [expenseRows, recentRows] = await Promise.all([
          db
            .select({
              total: sql<number>`COALESCE(SUM(${cashExpense.amount}), 0)::int`,
              count: sql<number>`COUNT(*)::int`,
            })
            .from(cashExpense)
            .where(and(...expenseFilters)),
          db
            .select({
              id: cashExpense.id,
              amount: cashExpense.amount,
              category: cashExpense.category,
              note: cashExpense.note,
              spentAt: cashExpense.spentAt,
              outletId: cashExpense.outletId,
            })
            .from(cashExpense)
            .where(
              and(
                eq(cashExpense.businessId, membership.businessId),
                gte(cashExpense.spentAt, periodStart),
                lt(cashExpense.spentAt, now),
                ...(outletId ? [eq(cashExpense.outletId, outletId)] : []),
              ),
            )
            .orderBy(desc(cashExpense.spentAt), desc(cashExpense.createdAt))
            .limit(5),
        ]);
        return { expenseRows, recentRows, unavailable: false };
      } catch (error) {
        if (!isMissingSchemaError(error)) throw error;
        console.error("Cashflow summary tanpa pengeluaran: tabel cash_expense belum dimigrasi.", error);
        return { expenseRows: [], recentRows: [], unavailable: true };
      }
    })(),
  ]);
  const expenseRows = expenseResults.expenseRows;
  const recentRows = expenseResults.recentRows;

  const incomeTotal = Number(saleRows[0]?.total ?? 0);
  const incomeCount = Number(saleRows[0]?.count ?? 0);
  const expenseTotal = Number(expenseRows[0]?.total ?? 0);
  const expenseCount = Number(expenseRows[0]?.count ?? 0);

  return NextResponse.json({
    period: periodKey,
    outletId: outletId ?? "all",
    incomeTotal,
    incomeCount,
    expenseTotal,
    expenseCount,
    expenseUnavailable: expenseResults.unavailable,
    netTotal: incomeTotal - expenseTotal,
    recent: recentRows.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      category: row.category,
      note: row.note,
      spentAt: row.spentAt instanceof Date ? row.spentAt.toISOString() : row.spentAt,
      outletId: row.outletId,
    })),
    updatedAt: now.toISOString(),
  });
}
