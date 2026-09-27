import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import Link from "next/link";
import { AppFooter } from "@/components/shared/app-footer";
import { AppHeader } from "@/components/shared/app-header";
import { CashflowManager } from "@/components/cashflow/cashflow-manager";
import { PlanFeatureNotice } from "@/components/subscription/plan-feature-notice";
import { db } from "@/db";
import { cashExpense, outlet, sale, user } from "@/db/schema";
import { isMissingSchemaError } from "@/server/db/schema-errors";
import { requireDashboardAccess } from "@/server/access/dashboard-access";
import { hasPlanFeature, normalizePlan } from "@/shared/billing/plans";
import { getReportDateRange } from "@/server/pos/reporting";
import { expenseCategoryLabels, type ExpenseCategory } from "@/shared/validation/expense";

const PAGE_SIZE = 15;

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isNaN(page) || page < 1 ? 1 : page;
}

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string; from?: string; to?: string; category?: string; page?: string }>;
}) {
  const access = await requireDashboardAccess({ rule: "manageBusiness" });
  if (!access.ok) return access.lockout;
  const { session, membership, currentSubscription, subDetails, allowDarkMode } = access;
  const selectedPlan = normalizePlan(currentSubscription?.plan);

  if (!hasPlanFeature(selectedPlan, "cashflow")) {
    return (
      <AppHeader
        businessName={membership.businessName}
        userName={session.user.name}
        role={membership.role}
        trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
        allowDarkMode={allowDarkMode}
        plan={selectedPlan}
      >
        <PlanFeatureNotice
          businessName={membership.businessName}
          role={membership.role}
          featureName="Arus kas"
          description="Catat uang keluar (belanja, gaji, sewa, operasional) dan pantau saldo bersih realtime tersedia di Paket Bisnis."
        />
      </AppHeader>
    );
  }

  const params = await searchParams;
  const { fromKey, toKey, start, end } = getReportDateRange(params.from, params.to);

  const outlets = await db
    .select({ id: outlet.id, name: outlet.name, slug: outlet.slug })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId))
    .orderBy(outlet.name);
  const activeOutlet = outlets.find((item) => item.id === params.outlet) ?? null;
  const categoryFilter: ExpenseCategory | null =
    params.category && params.category in expenseCategoryLabels
      ? (params.category as ExpenseCategory)
      : null;
  const page = parsePage(params.page);

  const saleFilters = [
    eq(sale.businessId, membership.businessId),
    eq(sale.status, "completed"),
    gte(sale.createdAt, start),
    lt(sale.createdAt, end),
    ...(activeOutlet ? [eq(sale.outletId, activeOutlet.id)] : []),
  ];
  const expenseFilters = [
    eq(cashExpense.businessId, membership.businessId),
    gte(cashExpense.spentAt, start),
    lt(cashExpense.spentAt, end),
    ...(activeOutlet ? [eq(cashExpense.outletId, activeOutlet.id)] : []),
    ...(categoryFilter ? [eq(cashExpense.category, categoryFilter)] : []),
  ];

  const incomeRows = await db
    .select({
      total: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(sale)
    .where(and(...saleFilters));

  // Tabel cash_expense dibuat migrasi 0022; production yang belum dimigrasi
  // tetap menampilkan uang masuk + banner migrasi, bukan error boundary.
  let expenseSummary: Array<{ total: number; count: number }> = [];
  let expenseCountRows: Array<{ count: number }> = [];
  let expenseUnavailable = false;
  try {
    const [summary, counts] = await Promise.all([
      db
        .select({
          total: sql<number>`COALESCE(SUM(${cashExpense.amount}), 0)::int`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(cashExpense)
        .where(and(...expenseFilters)),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(cashExpense)
        .where(and(...expenseFilters)),
    ]);
    expenseSummary = summary;
    expenseCountRows = counts;
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Halaman arus kas tanpa pengeluaran: tabel cash_expense belum dimigrasi.", error);
    expenseUnavailable = true;
  }

  const incomeTotal = Number(incomeRows[0]?.total ?? 0);
  const incomeCount = Number(incomeRows[0]?.count ?? 0);
  const expenseTotal = Number(expenseSummary[0]?.total ?? 0);
  const expenseCount = Number(expenseSummary[0]?.count ?? 0);
  const resultCount = Number(expenseCountRows[0]?.count ?? 0);
  const totalPages = Math.max(Math.ceil(resultCount / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages);

  type CashflowPageRow = {
    id: string;
    amount: number;
    category: string;
    note: string | null;
    spentAt: Date | string;
    outletName: string;
    creatorName: string;
  };
  let rows: CashflowPageRow[] = [];
  if (!expenseUnavailable) {
    rows = await db
      .select({
        id: cashExpense.id,
        amount: cashExpense.amount,
        category: cashExpense.category,
        note: cashExpense.note,
        spentAt: cashExpense.spentAt,
        outletName: outlet.name,
        creatorName: user.name,
      })
      .from(cashExpense)
      .innerJoin(outlet, eq(outlet.id, cashExpense.outletId))
      .innerJoin(user, eq(user.id, cashExpense.createdById))
      .where(and(...expenseFilters))
      .orderBy(desc(cashExpense.spentAt), desc(cashExpense.createdAt))
      .limit(PAGE_SIZE)
      .offset((safePage - 1) * PAGE_SIZE);
  }

  function pageHref(target: number) {
    const search = new URLSearchParams({
      from: fromKey,
      to: toKey,
      ...(activeOutlet ? { outlet: activeOutlet.id } : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(target > 1 ? { page: String(target) } : {}),
    });
    return `/cashflow?${search.toString()}`;
  }
  const prevHref = safePage > 1 ? pageHref(safePage - 1) : null;
  const nextHref = safePage < totalPages ? pageHref(safePage + 1) : null;

  return (
    <AppHeader
      businessName={membership.businessName}
      userName={session.user.name}
      outletName={activeOutlet?.name ?? "Semua Gerai"}
      outlets={[{ id: "all", name: "Semua Gerai" }, ...outlets]}
      activeOutletId={activeOutlet?.id ?? "all"}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
      plan={selectedPlan}
    >
      <section className="mx-auto w-[min(1180px,calc(100%-24px))] space-y-4 py-6 sm:w-[min(1180px,calc(100%-40px))] sm:py-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="m-0 text-xs font-bold text-[#198760]">Arus kas warung</p>
            <h1 className="m-0 mt-1 text-2xl font-black tracking-tight text-[#15211d]">Uang masuk & keluar</h1>
            <p className="m-0 mt-1 text-sm text-[#627069]">
              {fromKey === toKey ? `Periode ${fromKey}` : `Periode ${fromKey} sampai ${toKey}`} · {activeOutlet?.name ?? "Semua gerai"}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-fit items-center rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-bold text-[#627069] hover:border-[#b8d6c7] hover:text-[#15211d]"
          >
            Kembali ke dashboard
          </Link>
        </header>

        {expenseUnavailable && (
          <p className="m-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
            Fitur uang keluar belum aktif di database production. Jalankan migrasi terbaru lalu muat ulang
            halaman ini.
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-100 bg-[#f2faf6] p-3 sm:p-4">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#147554]">Masuk</p>
            <p className="m-0 mt-1 truncate text-sm font-bold text-[#15211d] sm:text-xl">Rp {incomeTotal.toLocaleString("id-ID")}</p>
            <p className="m-0 mt-1 text-[11px] text-[#627069]">{incomeCount} struk</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-[#fef6f6] p-3 sm:p-4">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.08em] text-rose-700">Keluar</p>
            <p className="m-0 mt-1 truncate text-sm font-bold text-[#15211d] sm:text-xl">Rp {expenseTotal.toLocaleString("id-ID")}</p>
            <p className="m-0 mt-1 text-[11px] text-[#627069]">{expenseCount} catatan</p>
          </div>
          <div className="rounded-2xl border border-[#dfe8e3] bg-white p-3 sm:p-4">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#627069]">Bersih</p>
            <p className={`m-0 mt-1 truncate text-sm font-bold sm:text-xl ${incomeTotal - expenseTotal >= 0 ? "text-[#14532d]" : "text-rose-700"}`}>
              Rp {(incomeTotal - expenseTotal).toLocaleString("id-ID")}
            </p>
            <p className="m-0 mt-1 text-[11px] text-[#627069]">Masuk - keluar</p>
          </div>
        </div>

        <CashflowManager
          outlets={outlets}
          activeOutletId={activeOutlet?.id ?? "all"}
          fromKey={fromKey}
          toKey={toKey}
          categoryFilter={categoryFilter}
          expenseUnavailable={expenseUnavailable}
          rows={rows.map((row) => ({
            id: row.id,
            amount: Number(row.amount),
            category: row.category,
            note: row.note,
            spentAt: row.spentAt instanceof Date ? row.spentAt.toISOString() : String(row.spentAt),
            outletName: row.outletName,
            creatorName: row.creatorName,
          }))}
          resultCount={resultCount}
          page={safePage}
          totalPages={totalPages}
          prevHref={prevHref}
          nextHref={nextHref}
        />
      </section>
      <AppFooter businessName={membership.businessName} />
    </AppHeader>
  );
}
