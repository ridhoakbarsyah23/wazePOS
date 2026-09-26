import { and, desc, eq, sql } from "drizzle-orm";
import {
  Ban,
  Banknote,
  BarChart3,
  CalendarDays,
  CreditCard,
  ExternalLink,
  FileSpreadsheet,
  QrCode,
  Receipt,
  RotateCcw,
  Search,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { outlet, sale, saleItem } from "@/db/schema";
import { AppHeader } from "@/components/shared/app-header";
import { PlanFeatureNotice } from "@/components/subscription/plan-feature-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireDashboardAccess } from "@/server/access/dashboard-access";
import { REPORTS_PAGE_SIZE, getPageNumbers, pageDisabledClass, pageLinkClass } from "@/shared/pagination";
import { hasPlanFeature, normalizePlan } from "@/shared/billing/plans";
import { formatReportRange } from "@/server/pos/reporting";
import {
  buildSaleFilterConditions,
  buildSaleFilterQuery,
  parseSaleFilterParams,
} from "@/server/pos/sale-filters";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    outlet?: string;
    date?: string;
    from?: string;
    to?: string;
    payment?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const access = await requireDashboardAccess({ rule: "manageBusiness" });
  if (!access.ok) return access.lockout;
  const { session, membership, currentSubscription, subDetails, allowDarkMode } = access;
  const selectedPlan = normalizePlan(currentSubscription?.plan);

  if (!hasPlanFeature(selectedPlan, "onscreenReports")) {
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
          featureName="Laporan penjualan di layar"
          description="Ringkasan omzet, produk terlaris, dan laporan penjualan di layar tersedia di Paket Bisnis."
        />
      </AppHeader>
    );
  }

  const params = await searchParams;
  const saleFilters = parseSaleFilterParams(params);
  const { fromKey, toKey, paymentMethod, transactionStatus: reportStatus, invoiceQuery, currentPage } = saleFilters;

  const outlets = await db
    .select({ id: outlet.id, name: outlet.name, slug: outlet.slug })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId))
    .orderBy(outlet.name);
  const requestedOutletId = params.outlet;
  const activeOutlet = outlets.find((item) => item.id === requestedOutletId) ?? null;
  const reportOutlets = [{ id: "all", name: "Semua Gerai" }, ...outlets];
  const reportFilters = buildSaleFilterConditions(saleFilters, {
    businessId: membership.businessId,
    outletId: activeOutlet?.id ?? null,
  });

  const [completedSummary, topProducts, itemTotals, paymentRows, voidedSales] = await Promise.all([
    db
      .select({
        revenue: sql<number>`coalesce(sum(${sale.total}), 0)::int`,
        discount: sql<number>`coalesce(sum(${sale.discount}), 0)::int`,
        transactions: sql<number>`count(*)::int`,
      })
      .from(sale)
      .where(and(...reportFilters, eq(sale.status, "completed"))),

    db
      .select({
        productName: saleItem.productName,
        quantity: sql<number>`sum(${saleItem.quantity})::int`,
        revenue: sql<number>`sum(${saleItem.subtotal})::int`,
      })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .where(and(...reportFilters, eq(sale.status, "completed")))
      .groupBy(saleItem.productName)
      .orderBy(desc(sql`sum(${saleItem.quantity})`))
      .limit(8),

    db
      .select({ quantity: sql<number>`coalesce(sum(${saleItem.quantity}), 0)::int` })
      .from(saleItem)
      .innerJoin(sale, eq(sale.id, saleItem.saleId))
      .where(and(...reportFilters, eq(sale.status, "completed"))),

    db
      .select({
        paymentMethod: sale.paymentMethod,
        total: sql<number>`coalesce(sum(${sale.total}), 0)::int`,
      })
      .from(sale)
      .where(and(...reportFilters, eq(sale.status, "completed")))
      .groupBy(sale.paymentMethod),

    db
      .select({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        outletName: outlet.name,
        createdAt: sale.createdAt,
        voidedAt: sale.voidedAt,
      })
      .from(sale)
      .innerJoin(outlet, eq(outlet.id, sale.outletId))
      .where(and(...reportFilters, eq(sale.status, "voided")))
      .orderBy(desc(sql`coalesce(${sale.voidedAt}, ${sale.createdAt})`))
      .limit(100),
  ]);

  const total = Number(completedSummary[0]?.revenue ?? 0);
  const totalDiscount = Number(completedSummary[0]?.discount ?? 0);
  const totalTransactions = Number(completedSummary[0]?.transactions ?? 0);
  const totalItemsSold = Number(itemTotals[0]?.quantity ?? 0);
  const averageTransaction = totalTransactions > 0 ? Math.round(total / totalTransactions) : 0;

  const totalPages = Math.max(Math.ceil(totalTransactions / REPORTS_PAGE_SIZE), 1);
  const page = Math.min(currentPage, totalPages);
  const hasNext = page < totalPages;

  const pageRows = await db
    .select({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      outletName: outlet.name,
      createdAt: sale.createdAt,
    })
    .from(sale)
    .innerJoin(outlet, eq(outlet.id, sale.outletId))
    .where(and(...reportFilters, eq(sale.status, "completed")))
    .orderBy(desc(sale.createdAt))
    .limit(REPORTS_PAGE_SIZE)
    .offset((page - 1) * REPORTS_PAGE_SIZE);

  const rangeStart = totalTransactions === 0 ? 0 : (page - 1) * REPORTS_PAGE_SIZE + 1;
  const rangeEnd = rangeStart + pageRows.length - 1;

  function pageHref(targetPage: number) {
    const search = buildSaleFilterQuery(saleFilters, { outletId: activeOutlet?.id ?? null });
    if (targetPage > 1) search.set("page", String(targetPage));
    const queryString = search.toString();
    return queryString ? `/reports?${queryString}` : "/reports";
  }

  const pageNumbers = getPageNumbers(page, totalPages);
  const paymentTotals = Object.fromEntries(
    paymentRows.map((item) => [item.paymentMethod, Number(item.total)]),
  );
  const canExportReports = hasPlanFeature(currentSubscription?.plan, "exportReports");
  const exportParams = buildSaleFilterQuery(saleFilters, { outletId: activeOutlet?.id ?? null });
  const selectedPeriodLabel = formatReportRange(fromKey, toKey);

  function getPaymentIcon(method: string) {
    switch (method.toLowerCase()) {
      case "cash":
      case "tunai":
        return <Banknote className="size-3.5 text-[#198760]" />;
      case "qris":
        return <QrCode className="size-3.5 text-blue-600" />;
      default:
        return <CreditCard className="size-3.5 text-indigo-600" />;
    }
  }

  return (
    <AppHeader
      businessName={membership.businessName}
      userName={session.user.name}
      outletName={activeOutlet?.name ?? "Semua Gerai"}
      outlets={reportOutlets}
      activeOutletId={activeOutlet?.id ?? "all"}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
      plan={normalizePlan(currentSubscription?.plan)}
    >
      <section className="mx-auto w-[min(1140px,calc(100%-32px))] py-8 sm:py-10 animate-page-enter">
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="w-fit">
            <BarChart3 className="size-3.5" /> Analytics & Reports
          </Badge>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-1.2px] text-[#15211d] sm:text-4xl">
            Laporan Penjualan
          </h1>
          <p className="m-0 text-sm leading-relaxed text-[#627069]">
            Periode {selectedPeriodLabel}
          </p>
        </div>

        <div className="mt-5 border border-[#dfe8e3] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#e5ebe8] px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-[#17211d]">Filter laporan</h2>
              <p className="mt-0.5 text-xs text-[#78857f]">Pilih periode dan rincian transaksi yang ingin ditampilkan.</p>
            </div>
            <Link href="/reports" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68766f] hover:text-[#187c59]">
              <RotateCcw className="size-3.5" /> Reset
            </Link>
          </div>

          <form action="/reports" method="get" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
              <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-[#198760]" /> Dari tanggal</span>
              <input
                type="date"
                name="from"
                defaultValue={fromKey}
                className="h-10 border border-[#dbe5df] bg-white px-3 text-sm text-[#15211d] outline-none focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/10"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
              Sampai tanggal
              <input
                type="date"
                name="to"
                defaultValue={toKey}
                className="h-10 border border-[#dbe5df] bg-white px-3 text-sm text-[#15211d] outline-none focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/10"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
              Gerai
              <select name="outlet" defaultValue={activeOutlet?.id ?? "all"} className="h-10 border border-[#dbe5df] bg-white px-3 text-sm text-[#15211d] outline-none focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/10">
                <option value="all">Semua gerai</option>
                {outlets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
              Pembayaran
              <select name="payment" defaultValue={paymentMethod ?? "all"} className="h-10 border border-[#dbe5df] bg-white px-3 text-sm text-[#15211d] outline-none focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/10">
                <option value="all">Semua metode</option>
                <option value="cash">Tunai</option>
                <option value="qris">QRIS</option>
                <option value="debit">Kartu debit</option>
                <option value="credit">Kartu kredit</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
              Status
              <select name="status" defaultValue={reportStatus ?? "all"} className="h-10 border border-[#dbe5df] bg-white px-3 text-sm text-[#15211d] outline-none focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/10">
                <option value="all">Semua status</option>
                <option value="completed">Selesai</option>
                <option value="voided">Dibatalkan</option>
              </select>
            </label>
            <Button type="submit" size="sm" className="h-10">
              Terapkan filter
            </Button>
            <label className="relative grid gap-1.5 text-xs font-semibold text-[#52645c] sm:col-span-2 lg:col-span-5">
              Cari nomor invoice
              <Search className="pointer-events-none absolute bottom-3 left-3 size-4 text-[#87928d]" />
              <input
                name="q"
                defaultValue={invoiceQuery}
                maxLength={80}
                placeholder="Contoh: INV-2026"
                className="h-10 border border-[#dbe5df] bg-white pl-9 pr-3 text-sm text-[#15211d] outline-none placeholder:text-[#9aa59f] focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/10"
              />
            </label>
          </form>

          <div className="flex flex-col gap-2 border-t border-[#e5ebe8] bg-[#fafbfa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#6c7a73]">Ekspor mengikuti seluruh filter yang sedang aktif.</p>
            {canExportReports ? (
              <Button asChild size="sm">
                <a href={`/api/reports/export?${exportParams.toString()}`} download>
                  <FileSpreadsheet className="size-4" /> Ekspor Excel
                </a>
              </Button>
            ) : membership.role === "owner" ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/subscription">Ekspor Excel tersedia di Paket Bisnis</Link>
              </Button>
            ) : (
              <span className="text-xs font-semibold text-[#627069]">Ekspor Excel tersedia di Paket Bisnis.</span>
            )}
          </div>
        </div>

        {/* Financial summary */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="relative overflow-hidden border-[#cae8d9] bg-white">
            <div className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
              <Wallet className="size-5" />
            </div>
            <CardContent className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#627069]">
                Omzet Bersih
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#198760]">
                Rp {total.toLocaleString("id-ID")}
              </h2>
              <p className="mt-1 text-xs text-[#758a80]">Total penerimaan transaksi sukses</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-[#dfe8e3] bg-white">
            <div className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="size-5" />
            </div>
            <CardContent className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#627069]">
                Transaksi Berhasil
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#15211d]">
                {totalTransactions}
              </h2>
              <p className="mt-1 text-xs text-[#758a80]">Struk penjualan selesai tercatat</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-[#dfe8e3] bg-white">
            <div className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="size-5" />
            </div>
            <CardContent className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#627069]">
                Rata-rata Transaksi
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#15211d]">
                Rp {averageTransaction.toLocaleString("id-ID")}
              </h2>
              <p className="mt-1 text-xs text-[#758a80]">Nilai rata-rata setiap transaksi</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-[#dfe8e3] bg-white">
            <div className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Receipt className="size-5" />
            </div>
            <CardContent className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#627069]">Total Diskon</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#15211d]">
                Rp {totalDiscount.toLocaleString("id-ID")}
              </h2>
              <p className="mt-1 text-xs text-[#758a80]">Potongan pada transaksi berhasil</p>
            </CardContent>
          </Card>
        </div>

        {/* 2 Grid: Produk Terlaris & Metode Pembayaran */}
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          {/* Produk Terlaris */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                  <TrendingUp className="size-4" />
                </span>
                <div>
                  <CardTitle className="text-base">Produk Terlaris</CardTitle>
                  <CardDescription className="text-xs">
                    Peringkat dari {totalItemsSold.toLocaleString("id-ID")} item yang terjual.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center font-bold">#</TableHead>
                    <TableHead className="font-bold">Menu</TableHead>
                    <TableHead className="text-center font-bold">Qty</TableHead>
                    <TableHead className="text-right font-bold">Total Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((item, idx) => (
                    <TableRow key={item.productName}>
                      <TableCell className="text-center font-bold text-xs text-[#71857c]">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-[#15211d]">
                        {item.productName}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.quantity} item
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#198760]">
                        Rp {Number(item.revenue).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-[#627069]">
                        Belum ada penjualan produk untuk filter ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Metode Pembayaran */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                  <CreditCard className="size-4" />
                </span>
                <div>
                  <CardTitle className="text-base">Metode Pembayaran</CardTitle>
                  <CardDescription className="text-xs">
                    Rincian omzet berdasarkan kanal pembayaran pelanggan.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(paymentTotals).map(([method, amount]) => {
                  const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;
                  return (
                    <div
                      key={method}
                      className="flex items-center justify-between rounded-xl border border-[#e8f1ec] bg-[#f9fbf9] p-3.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-lg bg-white border border-[#dfe8e3]">
                          {getPaymentIcon(method)}
                        </span>
                        <div>
                          <strong className="text-sm uppercase text-[#15211d]">{method}</strong>
                          <p className="m-0 text-[11px] text-[#71857c]">{percentage}% dari omzet</p>
                        </div>
                      </div>
                      <span className="font-extrabold text-sm text-[#198760]">
                        Rp {amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  );
                })}
                {Object.keys(paymentTotals).length === 0 && (
                  <p className="py-6 text-center text-sm text-[#627069]">
                    Belum ada pembayaran yang sesuai dengan filter.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabel Transaksi Berhasil */}
        <Card className="mt-7">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                  <Receipt className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">Transaksi Berhasil</CardTitle>
                  <CardDescription className="text-xs">
                    Klik nomor invoice untuk melihat rincian nota dan opsi cetak thermal atau kirim WhatsApp.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">
                {totalTransactions > 0 ? `Halaman ${page} dari ${totalPages}` : "Belum ada transaksi"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">No. Invoice</TableHead>
                    <TableHead className="font-bold">Gerai</TableHead>
                    <TableHead className="font-bold">Tanggal &amp; Waktu</TableHead>
                    <TableHead className="font-bold">Metode</TableHead>
                    <TableHead className="text-right font-bold">Total Pembayaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link
                          href={`/sales/${item.id}`}
                          className="inline-flex items-center gap-1 font-mono font-bold text-xs text-[#198760] hover:underline"
                        >
                          <span>{item.invoiceNumber}</span>
                          <ExternalLink className="size-3" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-[#52645c]">
                          <Store className="size-3 text-[#198760]" />
                          <span>{item.outletName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#627069]">
                        {new Date(item.createdAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {item.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#15211d]">
                        Rp {Number(item.total).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-[#627069]">
                        Belum ada transaksi berhasil yang sesuai dengan filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {pageRows.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-[#e5ebe8] px-1 py-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 text-xs text-[#78857f]">
                  Menampilkan <span className="font-semibold text-[#44534c]">{rangeStart}&ndash;{rangeEnd}</span> dari{" "}
                  <span className="font-semibold text-[#44534c]">{totalTransactions}</span> transaksi berhasil
                </p>
                <nav className="flex flex-wrap items-center gap-1" aria-label="Navigasi halaman">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)} className={pageLinkClass}>
                      Sebelumnya
                    </Link>
                  ) : (
                    <span aria-disabled className={pageDisabledClass}>
                      Sebelumnya
                    </span>
                  )}
                  {pageNumbers.map((item, index) =>
                    item === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#9aa69f]">
                        &hellip;
                      </span>
                    ) : item === page ? (
                      <span
                        key={item}
                        aria-current="page"
                        className="grid size-8 place-items-center rounded-lg bg-[#eaf7f0] text-xs font-bold text-[#187c59]"
                      >
                        {item}
                      </span>
                    ) : (
                      <Link
                        key={item}
                        href={pageHref(item)}
                        className="grid size-8 place-items-center rounded-lg text-xs font-semibold text-[#68766f] transition hover:bg-[#f3f8f5] hover:text-[#187c59]"
                      >
                        {item}
                      </Link>
                    ),
                  )}
                  {hasNext ? (
                    <Link href={pageHref(page + 1)} className={pageLinkClass}>
                      Berikutnya
                    </Link>
                  ) : (
                    <span aria-disabled className={pageDisabledClass}>
                      Berikutnya
                    </span>
                  )}
                </nav>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Transaksi Dibatalkan jika ada */}
        {voidedSales.length > 0 && (
          <Card className="mt-7 border-rose-200 bg-rose-50/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
                  <Ban className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-lg text-rose-900">
                    Transaksi Dibatalkan
                  </CardTitle>
                  <CardDescription className="text-xs text-rose-700">
                    Transaksi berikut telah dibatalkan oleh pengelola, stok barang telah otomatis dikembalikan, dan tidak dihitung ke dalam omzet.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-rose-200">
                      <TableHead className="font-bold text-rose-900">No. Invoice</TableHead>
                      <TableHead className="font-bold text-rose-900">Gerai</TableHead>
                      <TableHead className="font-bold text-rose-900">Waktu Pembatalan</TableHead>
                      <TableHead className="font-bold text-rose-900">Metode</TableHead>
                      <TableHead className="text-right font-bold text-rose-900">Nominal Dibatalkan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voidedSales.map((item) => (
                      <TableRow key={item.id} className="border-rose-100">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/sales/${item.id}`}
                              className="font-mono text-xs font-bold text-rose-600 line-through hover:underline"
                            >
                              {item.invoiceNumber}
                            </Link>
                            <Badge variant="destructive" className="text-[10px]">
                              BATAL
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-[#52645c]">
                          {item.outletName}
                        </TableCell>
                        <TableCell className="text-xs text-[#627069]">
                          {new Date(item.voidedAt ?? item.createdAt).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono uppercase text-[#627069]">
                            {item.paymentMethod}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-600 line-through">
                          Rp {Number(item.total).toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </AppHeader>
  );
}
