import { and, eq, gte, lt, sql } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Calculator,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  Package,
  Plus,
  ReceiptText,
  Settings2,
  ShoppingCart,
  Sparkles,
  Store,
  Tags,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createCategory, createOutlet, createProduct } from "@/app/dashboard/actions";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button";
import { DashboardSalesChart } from "@/components/dashboard-sales-chart";
import { ShiftPanel } from "@/components/shift-panel";
import { SubscriptionLockout } from "@/components/subscription-lockout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { cashShift, category, inventoryStock, outlet, product, sale } from "@/db/schema";
import { getBusinessSubscription, getMembership, requireSession } from "@/lib/auth-session";
import { getSubscriptionStatusDetails, hasPlanFeature, normalizePlan, plans } from "@/lib/plans";

type PeriodKey = "today" | "7d" | "30d";

const dayInMilliseconds = 86_400_000;
const selectClassName = "h-11 w-full rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3 text-sm text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10";
const jakartaDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
});

function dateKey(date: Date) {
  const parts = Object.fromEntries(jakartaDateFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function startOfJakartaDay(date: Date) {
  return new Date(`${dateKey(date)}T00:00:00+07:00`);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function comparisonLabel(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "Mulai tercatat periode ini" : "Belum ada transaksi";
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return "Sama dengan periode lalu";
  return `${change > 0 ? "Naik" : "Turun"} ${Math.abs(change)}% dari periode lalu`;
}

function dashboardHref(period: PeriodKey, outletId: string) {
  const params = new URLSearchParams({ period });
  if (outletId !== "all") params.set("outlet", outletId);
  return `/dashboard?${params.toString()}`;
}

export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<{ status?: string; message?: string; period?: string; outlet?: string }>;
}) {
  const feedback = await searchParams;
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");
  if (membership.role === "cashier") redirect("/pos");

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  const subDetails = getSubscriptionStatusDetails(currentSubscription);

  if (!subDetails.isValid) {
    if (membership.role === "owner") {
      redirect("/subscription?expired=1");
    }
    return (
      <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
        <AppHeader
          businessName={membership.businessName}
          role={membership.role}
        />
        <SubscriptionLockout
          businessName={membership.businessName}
          role={membership.role}
          reason={subDetails.message}
        />
      </main>
    );
  }

  const selectedPlan = normalizePlan(currentSubscription?.plan);
  const shiftManagementEnabled = hasPlanFeature(selectedPlan, "shiftManagement");
  const selectedPeriod: PeriodKey = feedback.period === "today" || feedback.period === "30d" ? feedback.period : "7d";

  const [categories, outlets, productRows] = await Promise.all([
    db.select().from(category).where(eq(category.businessId, membership.businessId)).orderBy(category.name),
    db.select().from(outlet).where(eq(outlet.businessId, membership.businessId)).orderBy(outlet.name),
    db.select({
      id: product.id, name: product.name, sku: product.sku, sellingPrice: product.sellingPrice,
      isActive: product.isActive, categoryName: category.name,
      stockTotal: sql<number>`COALESCE(SUM(${inventoryStock.quantity}), 0)::int`,
    }).from(product)
      .leftJoin(category, eq(category.id, product.categoryId))
      .leftJoin(inventoryStock, eq(inventoryStock.productId, product.id))
      .where(eq(product.businessId, membership.businessId))
      .groupBy(product.id, product.name, product.sku, product.sellingPrice, product.isActive, category.name, product.createdAt)
      .orderBy(product.createdAt),
  ]);

  const selectedOutletId = feedback.outlet && outlets.some((item) => item.id === feedback.outlet) ? feedback.outlet : "all";
  const selectedOutlet = outlets.find((item) => item.id === selectedOutletId);
  const now = new Date();
  const periodDays = selectedPeriod === "today" ? 1 : selectedPeriod === "7d" ? 7 : 30;
  const periodStart = new Date(startOfJakartaDay(now).getTime() - (periodDays - 1) * dayInMilliseconds);
  const previousStart = new Date(periodStart.getTime() - periodDays * dayInMilliseconds);
  const previousEnd = new Date(now.getTime() - periodDays * dayInMilliseconds);
  const currentFilters = [eq(sale.businessId, membership.businessId), eq(sale.status, "completed"), gte(sale.createdAt, periodStart), lt(sale.createdAt, now)];
  const previousFilters = [eq(sale.businessId, membership.businessId), eq(sale.status, "completed"), gte(sale.createdAt, previousStart), lt(sale.createdAt, previousEnd)];
  if (selectedOutletId !== "all") {
    currentFilters.push(eq(sale.outletId, selectedOutletId));
    previousFilters.push(eq(sale.outletId, selectedOutletId));
  }

  const bucketExpression = selectedPeriod === "today"
    ? sql<string>`to_char(timezone('Asia/Jakarta', ${sale.createdAt}), 'HH24')`
    : sql<string>`to_char(timezone('Asia/Jakarta', ${sale.createdAt}), 'YYYY-MM-DD')`;
  const stockFilters = [eq(inventoryStock.businessId, membership.businessId), eq(product.businessId, membership.businessId), eq(product.trackStock, true)];
  if (selectedOutletId !== "all") stockFilters.push(eq(inventoryStock.outletId, selectedOutletId));

  const [currentTotals, previousTotals, trendRows, stockRows, currentShift] = await Promise.all([
    db.select({ revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`, transactions: sql<number>`COUNT(*)::int` }).from(sale).where(and(...currentFilters)),
    db.select({ revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`, transactions: sql<number>`COUNT(*)::int` }).from(sale).where(and(...previousFilters)),
    db.select({ bucket: bucketExpression, revenue: sql<number>`COALESCE(SUM(${sale.total}), 0)::int`, transactions: sql<number>`COUNT(*)::int` })
      .from(sale).where(and(...currentFilters)).groupBy(bucketExpression).orderBy(bucketExpression),
    db.select({ quantity: inventoryStock.quantity, threshold: inventoryStock.lowStockThreshold }).from(inventoryStock)
      .innerJoin(product, eq(product.id, inventoryStock.productId)).where(and(...stockFilters)),
    shiftManagementEnabled
      ? db.select({ id: cashShift.id, outletId: cashShift.outletId, openingCash: cashShift.openingCash, openedAt: cashShift.openedAt }).from(cashShift)
          .where(and(eq(cashShift.businessId, membership.businessId), eq(cashShift.cashierId, session.user.id), eq(cashShift.status, "open"))).limit(1)
      : Promise.resolve([]),
  ]);

  const currentRevenue = Number(currentTotals[0]?.revenue ?? 0);
  const currentTransactions = Number(currentTotals[0]?.transactions ?? 0);
  const previousRevenue = Number(previousTotals[0]?.revenue ?? 0);
  const previousTransactions = Number(previousTotals[0]?.transactions ?? 0);
  const currentAverage = currentTransactions > 0 ? Math.round(currentRevenue / currentTransactions) : 0;
  const previousAverage = previousTransactions > 0 ? Math.round(previousRevenue / previousTransactions) : 0;
  const totalStock = stockRows.reduce((sum, item) => sum + Number(item.quantity), 0);
  const lowStockCount = stockRows.filter((item) => Number(item.quantity) <= Number(item.threshold)).length;
  const trendMap = new Map(trendRows.map((item) => [item.bucket, item]));
  const currentJakartaHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", hourCycle: "h23" }).format(now));
  const chartPoints = selectedPeriod === "today"
    ? Array.from({ length: currentJakartaHour + 1 }, (_, hour) => {
        const key = hour.toString().padStart(2, "0");
        const point = trendMap.get(key);
        return { key, label: `${key}.00`, revenue: Number(point?.revenue ?? 0), transactions: Number(point?.transactions ?? 0) };
      })
    : Array.from({ length: periodDays }, (_, index) => {
        const date = new Date(periodStart.getTime() + index * dayInMilliseconds);
        const key = dateKey(date);
        const point = trendMap.get(key);
        const label = new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Jakarta",
          ...(selectedPeriod === "7d" ? { weekday: "short" as const } : { day: "numeric" as const, month: "short" as const }),
        }).format(date);
        return { key, label, revenue: Number(point?.revenue ?? 0), transactions: Number(point?.transactions ?? 0) };
      });

  const periodLabels: Record<PeriodKey, string> = { today: "Hari Ini", "7d": "7 Hari Terakhir", "30d": "30 Hari Terakhir" };
  const trialEndLabel = currentSubscription?.status === "trialing"
    ? currentSubscription.trialEndsAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : null;
  const currentOutletName = selectedOutlet?.name ?? (selectedOutletId === "all" ? "Semua Gerai" : outlets[0]?.name ?? "Gerai Utama");

  const currentDateFormatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const revenueChangePercent =
    previousRevenue === 0
      ? currentRevenue > 0
        ? 100
        : 0
      : Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100);

  return (
    <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
      <AppHeader
        businessName={membership.businessName}
        outletName={currentOutletName}
        role={membership.role}
        trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      />

      <div className="mx-auto w-[min(1240px,calc(100%-32px))] py-8 sm:py-10 animate-page-enter space-y-7">
        {/* Top Hero Greeting & Overview Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-[#d8e8de] bg-gradient-to-br from-white via-[#fbfdfc] to-[#eaf5ef]/60 p-6 sm:p-8 shadow-[0_10px_30px_rgba(20,107,79,0.05)]">
          {/* Ambient light glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[#198760]/10 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-[#23a473]/10 blur-3xl" aria-hidden="true" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  <Store className="size-3.5 text-emerald-600" />
                  {membership.businessName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8e3] bg-white px-3 py-1 text-xs font-semibold text-[#556961]">
                  <Calendar className="size-3.5 text-[#198760]" />
                  {currentDateFormatted}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1 text-xs font-bold text-amber-800">
                  <Crown className="size-3.5 text-amber-600" />
                  Paket {plans[selectedPlan].name}
                  {trialEndLabel ? ` · Trial s/d ${trialEndLabel}` : ""}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-[-1px] text-[#15211d]">
                Halo, {session.user.name || "Pemilik Usaha"} 👋
              </h1>
              <p className="m-0 text-sm leading-relaxed text-[#627069] max-w-xl">
                Berikut ringkasan performa penjualan dan operasional toko Anda di <strong className="text-[#15211d]">{currentOutletName}</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <DashboardRefreshButton />
              <Button
                asChild
                size="lg"
                className="h-11 gap-2 rounded-xl bg-gradient-to-r from-[#198760] to-[#126b4d] px-5 text-sm font-bold text-white shadow-md shadow-[#198760]/25 transition-all duration-200 hover:from-[#147554] hover:to-[#0c533b] hover:shadow-lg active:scale-95"
              >
                <Link href={selectedOutletId === "all" ? "/pos" : `/pos?outlet=${encodeURIComponent(selectedOutletId)}`}>
                  <ShoppingCart className="size-4" />
                  <span>Buka Kasir POS</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Alert if present */}
        {feedback.message && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold shadow-sm transition-all ${
              feedback.status === "success"
                ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348]"
                : "border-[#f2d4b9] bg-[#fff0e5] text-[#a35f12]"
            }`}
          >
            {feedback.status === "success" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#198760]" />
            ) : (
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#a35f12]" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Floating Filter Control Bar (Periode & Gerai) */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#dfe8e3] bg-white/90 p-3 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          {/* Segmented Period Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-[#eef5f1] p-1 overflow-x-auto scrollbar-none">
            {(["today", "7d", "30d"] as const).map((period) => (
              <Link
                key={period}
                href={dashboardHref(period, selectedOutletId)}
                className={`rounded-lg px-3.5 py-2 text-xs font-extrabold transition-all duration-200 ${
                  selectedPeriod === period
                    ? "bg-white text-[#198760] shadow-sm shadow-[#198760]/10 scale-[1.02]"
                    : "text-[#556961] hover:text-[#15211d] hover:bg-white/50"
                }`}
              >
                {periodLabels[period]}
              </Link>
            ))}
          </div>

          {/* Outlet Filter Form */}
          <form method="get" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="period" value={selectedPeriod} />
            <div className="relative flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MapPin className="size-4 text-[#198760]" />
              </div>
              <Label htmlFor="dashboard-outlet" className="sr-only">Pilih Gerai</Label>
              <select
                id="dashboard-outlet"
                name="outlet"
                defaultValue={selectedOutletId}
                className="h-10 w-48 rounded-xl border border-[#dbe5df] bg-white pl-9 pr-3 text-xs font-bold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-2 focus:ring-[#23a473]/20"
              >
                <option value="all">Semua Gerai Usaha</option>
                {outlets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-10 rounded-xl px-3 text-xs font-bold">
              <Settings2 className="size-3.5" /> Terapkan
            </Button>
          </form>
        </div>

        {/* 4 Main KPI Cards with Distinct Color Identifiers */}
        <section aria-label="Ringkasan Kinerja Penjualan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Card 1: Total Omzet */}
          <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-white to-emerald-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#627069]">
                  Total Omzet
                </p>
                <p className="mt-1.5 truncate text-2xl sm:text-3xl font-black tracking-tight text-[#15211d]">
                  {formatRupiah(currentRevenue)}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold ${
                      revenueChangePercent >= 0
                        ? "bg-emerald-100/80 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {revenueChangePercent >= 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {Math.abs(revenueChangePercent)}%
                  </span>
                  <span className="text-[11px] text-[#75857e]">
                    vs periode lalu
                  </span>
                </div>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-[#198760] text-white shadow-md shadow-emerald-600/25 transition-transform duration-300 group-hover:scale-105">
                <TrendingUp className="size-6" />
              </span>
            </div>
          </div>

          {/* Card 2: Total Transaksi */}
          <div className="group relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white via-white to-blue-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#627069]">
                  Total Transaksi
                </p>
                <p className="mt-1.5 truncate text-2xl sm:text-3xl font-black tracking-tight text-[#15211d]">
                  {currentTransactions.toLocaleString("id-ID")}{" "}
                  <span className="text-sm font-bold text-[#75857e]">struk</span>
                </p>
                <p className="mt-2.5 text-xs text-[#75857e]">
                  {comparisonLabel(currentTransactions, previousTransactions)}
                </p>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-600/25 transition-transform duration-300 group-hover:scale-105">
                <ReceiptText className="size-6" />
              </span>
            </div>
          </div>

          {/* Card 3: Rata-rata Transaksi (AOV) */}
          <div className="group relative overflow-hidden rounded-2xl border border-purple-200/80 bg-gradient-to-br from-white via-white to-purple-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#627069]">
                  Rata-rata Transaksi
                </p>
                <p className="mt-1.5 truncate text-2xl sm:text-3xl font-black tracking-tight text-[#15211d]">
                  {formatRupiah(currentAverage)}
                </p>
                <p className="mt-2.5 text-xs text-[#75857e]">
                  Nilai belanja rata-rata per transaksi
                </p>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md shadow-purple-600/25 transition-transform duration-300 group-hover:scale-105">
                <Calculator className="size-6" />
              </span>
            </div>
          </div>

          {/* Card 4: Stok Tersedia */}
          <div className="group relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#627069]">
                  Stok Tersedia
                </p>
                <p className="mt-1.5 truncate text-2xl sm:text-3xl font-black tracking-tight text-[#15211d]">
                  {totalStock.toLocaleString("id-ID")}{" "}
                  <span className="text-sm font-bold text-[#75857e]">unit</span>
                </p>
                <div className="mt-2.5">
                  {lowStockCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                      <AlertTriangle className="size-3 text-amber-600" />
                      {lowStockCount} stok rendah
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      Stok aman
                    </span>
                  )}
                </div>
              </div>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-600/25 transition-transform duration-300 group-hover:scale-105">
                <Boxes className="size-6" />
              </span>
            </div>
          </div>
        </section>

        {/* Analytics & Quick Actions Grid (2 Columns: 1.6fr / 0.9fr) */}
        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          {/* Left Column: Sales Chart */}
          <div className="space-y-6">
            <Card className="border-[#dbe5df] shadow-sm">
              <CardHeader className="flex-row items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <BarChart3 className="size-4 text-[#198760]" /> Tren Omzet Penjualan
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {periodLabels[selectedPeriod]} · {currentOutletName}. Sentuh atau arahkan batang untuk rincian.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 font-bold">
                  {currentTransactions} transaksi
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <DashboardSalesChart points={chartPoints} />
              </CardContent>
            </Card>

            {/* Product Catalog Overview Table */}
            <Card className="border-[#dbe5df] shadow-sm">
              <CardHeader className="flex-row items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="text-base font-extrabold flex items-center gap-2">
                    <Package className="size-4 text-[#198760]" /> Katalog Produk Teratas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ringkasan harga dan ketersediaan stok produk Anda
                  </CardDescription>
                </div>
                <Badge variant={lowStockCount > 0 ? "warning" : "default"} className="font-bold">
                  {lowStockCount > 0 ? (
                    <>
                      <AlertTriangle className="size-3" />
                      {lowStockCount} stok perlu perhatian
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3" />
                      Semua stok aman
                    </>
                  )}
                </Badge>
              </CardHeader>
              <CardContent className="pt-3">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-[#edf2ee]">
                      <TableHead className="text-xs font-bold text-[#627069]">Produk</TableHead>
                      <TableHead className="text-xs font-bold text-[#627069]">Kategori</TableHead>
                      <TableHead className="text-xs font-bold text-[#627069]">SKU</TableHead>
                      <TableHead className="text-xs font-bold text-[#627069]">Harga Jual</TableHead>
                      <TableHead className="text-xs font-bold text-[#627069]">Total Stok</TableHead>
                      <TableHead className="text-xs font-bold text-[#627069]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productRows.length > 0 ? (
                      productRows.slice(0, 5).map((item) => (
                        <TableRow key={item.id} className="hover:bg-[#f7faf8]">
                          <TableCell className="font-bold text-xs">{item.name}</TableCell>
                          <TableCell className="text-xs text-[#627069]">{item.categoryName ?? "Umum"}</TableCell>
                          <TableCell className="text-xs text-[#75857e]">{item.sku || "-"}</TableCell>
                          <TableCell className="text-xs font-bold text-emerald-700">
                            {formatRupiah(Number(item.sellingPrice))}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                                Number(item.stockTotal ?? 0) <= 5
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-50 text-emerald-800"
                              }`}
                            >
                              {Number(item.stockTotal ?? 0)} unit
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.isActive ? "default" : "warning"} className="text-[10px]">
                              {item.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-xs text-[#627069]">
                          Belum ada data produk. Tambahkan produk pertama Anda untuk mulai berjualan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="mt-3.5 flex justify-end">
                  <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-[#198760]">
                    <Link href="/products" className="flex items-center gap-1">
                      Kelola Semua Produk <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Quick Action Tiles & Shift Operations */}
          <div className="space-y-6">
            {/* Quick Action Tiles Grid */}
            <Card className="border-[#dbe5df] shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Sparkles className="size-4 text-[#198760]" /> Aksi Cepat
                </CardTitle>
                <CardDescription className="text-xs">
                  Akses instan modul yang sering digunakan
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href={selectedOutletId === "all" ? "/pos" : `/pos?outlet=${encodeURIComponent(selectedOutletId)}`}
                    className="group flex flex-col justify-between rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-emerald-100/30 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 active:scale-95"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm transition-transform group-hover:scale-105">
                      <ShoppingCart className="size-4" />
                    </span>
                    <div className="mt-3">
                      <span className="block text-xs font-bold text-[#15211d] group-hover:text-emerald-700">
                        Kasir POS
                      </span>
                      <span className="block text-[11px] text-[#627069]">
                        Buka kasir jualan
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/products"
                    className="group flex flex-col justify-between rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/60 to-blue-100/30 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 active:scale-95"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-blue-600 text-white shadow-sm transition-transform group-hover:scale-105">
                      <Package className="size-4" />
                    </span>
                    <div className="mt-3">
                      <span className="block text-xs font-bold text-[#15211d] group-hover:text-blue-700">
                        Katalog Produk
                      </span>
                      <span className="block text-[11px] text-[#627069]">
                        Atur menu & harga
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/inventory"
                    className="group flex flex-col justify-between rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-amber-100/30 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 active:scale-95"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-amber-600 text-white shadow-sm transition-transform group-hover:scale-105">
                      <Warehouse className="size-4" />
                    </span>
                    <div className="mt-3">
                      <span className="block text-xs font-bold text-[#15211d] group-hover:text-amber-700">
                        Stok Opname
                      </span>
                      <span className="block text-[11px] text-[#627069]">
                        Koreksi stok gerai
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/reports"
                    className="group flex flex-col justify-between rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/60 to-purple-100/30 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-purple-300 active:scale-95"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-purple-600 text-white shadow-sm transition-transform group-hover:scale-105">
                      <BarChart3 className="size-4" />
                    </span>
                    <div className="mt-3">
                      <span className="block text-xs font-bold text-[#15211d] group-hover:text-purple-700">
                        Laporan
                      </span>
                      <span className="block text-[11px] text-[#627069]">
                        Rekap omzet harian
                      </span>
                    </div>
                  </Link>

                  <Link
                    href="/staff"
                    className="group flex flex-col justify-between rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/60 to-teal-100/30 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-teal-300 active:scale-95"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-teal-600 text-white shadow-sm transition-transform group-hover:scale-105">
                      <Users className="size-4" />
                    </span>
                    <div className="mt-3">
                      <span className="block text-xs font-bold text-[#15211d] group-hover:text-teal-700">
                        Karyawan
                      </span>
                      <span className="block text-[11px] text-[#627069]">
                        Akses kasir & admin
                      </span>
                    </div>
                  </Link>

                  <a
                    href="#setup-usaha"
                    className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/60 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 active:scale-95"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-slate-700 text-white shadow-sm transition-transform group-hover:scale-105">
                      <Settings2 className="size-4" />
                    </span>
                    <div className="mt-3">
                      <span className="block text-xs font-bold text-[#15211d] group-hover:text-slate-900">
                        Data Usaha
                      </span>
                      <span className="block text-[11px] text-[#627069]">
                        Tambah gerai/kategori
                      </span>
                    </div>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Shift Operational Panel */}
            {shiftManagementEnabled ? (
              <ShiftPanel
                outlets={outlets}
                currentShift={
                  currentShift[0]
                    ? {
                        ...currentShift[0],
                        openingCash: Number(currentShift[0].openingCash),
                        openedAt: currentShift[0].openedAt.toISOString(),
                      }
                    : null
                }
              />
            ) : (
              <Card className="border-[#d7e7df] bg-gradient-to-br from-white to-[#f2faf6] shadow-sm">
                <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e5f4ec] text-[#198760]">
                      <LockKeyhole className="size-5" />
                    </span>
                    <div>
                      <p className="mb-1 font-bold text-sm text-[#15211d]">
                        Manajemen Shift Kasir
                      </p>
                      <p className="m-0 text-xs leading-5 text-[#627069]">
                        Tersedia di Paket Bisnis untuk mengunci saldo awal dan rekap pergantian kasir.
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-9 shrink-0 text-xs font-bold">
                    <Link href="/subscription">
                      Upgrade Paket <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Business Data Setup Accordion */}
        <details
          id="setup-usaha"
          className="group scroll-mt-24 rounded-3xl border border-[#dfe8e3] bg-white shadow-[0_8px_24px_rgba(16,65,48,.06)] transition-all"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 marker:content-none select-none">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Settings2 className="size-5" />
              </span>
              <div>
                <span className="block text-base font-extrabold text-[#15211d]">
                  Pengaturan Data Usaha Cepat
                </span>
                <span className="mt-0.5 block text-xs text-[#627069]">
                  Tambah kategori, gerai baru, atau produk langsung tanpa berpindah halaman.
                </span>
              </div>
            </div>
            <Badge variant="outline" className="group-open:bg-[#eaf7f0] group-open:text-emerald-800 font-bold text-xs">
              <Settings2 className="size-3.5" />
              <span className="group-open:hidden">Buka Formulir</span>
              <span className="hidden group-open:inline">Tutup Formulir</span>
            </Badge>
          </summary>

          <div className="grid gap-6 border-t border-[#edf2ee] p-6 xl:grid-cols-3">
            {/* Form 1: Tambah Kategori */}
            <Card className="border-[#dfe8e3] shadow-none">
              <CardHeader className="pb-3">
                <Tags className="size-5 text-[#198760] mb-1" />
                <CardTitle className="text-sm font-bold">Tambah Kategori</CardTitle>
                <CardDescription className="text-xs">Kelompokkan menu atau item toko Anda</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <form action={createCategory} className="space-y-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="category-name" className="text-xs font-bold">Nama Kategori</Label>
                    <Input id="category-name" name="name" required maxLength={80} placeholder="Contoh: Minuman" />
                  </div>
                  <Button type="submit" size="sm" className="w-full font-bold">
                    <Plus className="size-4" /> Simpan Kategori
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Form 2: Tambah Gerai */}
            <Card className="border-[#dfe8e3] shadow-none">
              <CardHeader className="pb-3">
                <MapPin className="size-5 text-[#198760] mb-1" />
                <CardTitle className="text-sm font-bold">Tambah Gerai / Cabang</CardTitle>
                <CardDescription className="text-xs">Daftarkan outlet baru untuk bisnis Anda</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <form action={createOutlet} className="space-y-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="outlet-name" className="text-xs font-bold">Nama Gerai</Label>
                    <Input id="outlet-name" name="name" required maxLength={100} placeholder="Contoh: Gerai Cabang Bintaro" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="outlet-address" className="text-xs font-bold">Alamat Gerai</Label>
                    <Input id="outlet-address" name="address" maxLength={200} placeholder="Opsional" />
                  </div>
                  <Button type="submit" size="sm" className="w-full font-bold">
                    <Plus className="size-4" /> Simpan Gerai
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Form 3: Tambah Produk */}
            <Card className="border-[#dfe8e3] shadow-none">
              <CardHeader className="pb-3">
                <Package className="size-5 text-[#198760] mb-1" />
                <CardTitle className="text-sm font-bold">Tambah Produk Cepat</CardTitle>
                <CardDescription className="text-xs">Masukkan item baru ke daftar katalog</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <form action={createProduct} className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="product-name" className="text-xs font-bold">Nama Produk</Label>
                    <Input id="product-name" name="name" required maxLength={120} placeholder="Contoh: Kopi Susu Aren" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="product-category" className="text-xs font-bold">Kategori</Label>
                      <select id="product-category" className={`${selectClassName} text-xs`} name="categoryId" defaultValue="">
                        <option value="">Umum</option>
                        {categories.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="product-outlet" className="text-xs font-bold">Gerai</Label>
                      <select id="product-outlet" className={`${selectClassName} text-xs`} name="outletId" required defaultValue="">
                        <option value="" disabled>Pilih</option>
                        {outlets.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="selling-price" className="text-xs font-bold">Harga Jual</Label>
                      <Input id="selling-price" name="sellingPrice" type="number" min="0" step="100" required placeholder="0" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="cost-price" className="text-xs font-bold">Harga Modal</Label>
                      <Input id="cost-price" name="costPrice" type="number" min="0" step="100" defaultValue={0} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="initial-stock" className="text-xs font-bold">Stok Awal</Label>
                      <Input id="initial-stock" name="initialStock" type="number" min="0" step="1" defaultValue={0} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="stock-threshold" className="text-xs font-bold">Batas Min.</Label>
                      <Input id="stock-threshold" name="lowStockThreshold" type="number" min="0" step="1" defaultValue={5} />
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="w-full font-bold mt-1">
                    <Plus className="size-4" /> Simpan Produk
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </details>
      </div>

      <AppFooter businessName={membership.businessName} />
    </main>
  );
}
