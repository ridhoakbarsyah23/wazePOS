import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  Ban,
  Banknote,
  BarChart3,
  CreditCard,
  ExternalLink,
  QrCode,
  Receipt,
  ShoppingBag,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { outlet, sale, saleItem } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { SubscriptionLockout } from "@/components/subscription-lockout";
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
import { canManageBusiness, getBusinessSubscription, getMembership, requireSession } from "@/lib/auth-session";
import { getSubscriptionStatusDetails } from "@/lib/plans";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");
  if (!canManageBusiness(membership.role)) redirect("/pos");

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

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const outlets = await db
    .select({ id: outlet.id, name: outlet.name })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId))
    .orderBy(outlet.name);
  const requestedOutletId = (await searchParams).outlet;
  const activeOutlet = outlets.find((item) => item.id === requestedOutletId) ?? null;
  const reportOutlets = [{ id: "all", name: "Semua Gerai" }, ...outlets];
  const reportFilters = [
    eq(sale.businessId, membership.businessId),
    gte(sale.createdAt, start),
    lt(sale.createdAt, end),
    ...(activeOutlet ? [eq(sale.outletId, activeOutlet.id)] : []),
  ];

  const [sales, topProducts, voidedSales] = await Promise.all([
    db
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
      .orderBy(desc(sale.createdAt)),

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
      .where(and(...reportFilters, eq(sale.status, "voided")))
      .orderBy(desc(sale.createdAt)),
  ]);

  const total = sales.reduce((sum, item) => sum + Number(item.total), 0);
  const totalItemsSold = topProducts.reduce((sum, item) => sum + Number(item.quantity), 0);
  const paymentTotals = sales.reduce<Record<string, number>>((result, item) => {
    result[item.paymentMethod] = (result[item.paymentMethod] ?? 0) + Number(item.total);
    return result;
  }, {});

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
      outletName={activeOutlet?.name ?? "Semua Gerai"}
      outlets={reportOutlets}
      activeOutletId={activeOutlet?.id ?? "all"}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
    >
      <section className="mx-auto w-[min(1140px,calc(100%-32px))] py-8 sm:py-10 animate-page-enter">
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="w-fit">
            <BarChart3 className="size-3.5" /> Analytics & Reports
          </Badge>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-1.2px] text-[#15211d] sm:text-4xl">
            Laporan Penjualan Hari Ini
          </h1>
          <p className="m-0 text-sm leading-relaxed text-[#627069]">
            {start.toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* 3 Fintech Summary Cards */}
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
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
                {sales.length}
              </h2>
              <p className="mt-1 text-xs text-[#758a80]">Struk penjualan selesai tercatat</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-[#dfe8e3] bg-white">
            <div className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <ShoppingBag className="size-5" />
            </div>
            <CardContent className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#627069]">
                Produk Terjual
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#15211d]">
                {totalItemsSold}
              </h2>
              <p className="mt-1 text-xs text-[#758a80]">Total kuantiti item menu keluar</p>
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
                  <CardTitle className="text-base">Produk Terlaris Hari Ini</CardTitle>
                  <CardDescription className="text-xs">
                    Peringkat menu dengan volume penjualan tertinggi.
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
                        Belum ada penjualan produk hari ini.
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
                    Belum ada pembayaran yang diterima hari ini.
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
                  <CardTitle className="text-lg">Transaksi Berhasil Hari Ini</CardTitle>
                  <CardDescription className="text-xs">
                    Klik nomor invoice untuk melihat rincian nota dan opsi cetak thermal atau kirim WhatsApp.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">{sales.length} Transaksi</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">No. Invoice</TableHead>
                    <TableHead className="font-bold">Gerai</TableHead>
                    <TableHead className="font-bold">Waktu Transaksi</TableHead>
                    <TableHead className="font-bold">Metode</TableHead>
                    <TableHead className="text-right font-bold">Total Pembayaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((item) => (
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
                        {new Date(item.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
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
                  {sales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-[#627069]">
                        Belum ada transaksi berhasil hari ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Audit Transaksi Dibatalkan (VOID) jika ada */}
        {voidedSales.length > 0 && (
          <Card className="mt-7 border-rose-200 bg-rose-50/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
                  <Ban className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-lg text-rose-900">
                    Transaksi Dibatalkan (VOID) Hari Ini
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
                      <TableHead className="text-right font-bold text-rose-900">Nominal Void</TableHead>
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
                              VOID
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-[#52645c]">
                          {item.outletName}
                        </TableCell>
                        <TableCell className="text-xs text-[#627069]">
                          {new Date(item.createdAt).toLocaleTimeString("id-ID")}
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
