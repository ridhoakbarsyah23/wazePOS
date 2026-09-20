import { and, desc, eq } from "drizzle-orm";
import {
  ArrowRight,
  Boxes,
  History,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { inventoryStock, outlet, product, stockMovement } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { StockAdjustmentForm } from "@/components/stock-adjustment-form";
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

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; outlet?: string; product?: string }>;
}) {
  const filters = await searchParams;
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

  const [outlets, products, stocks, movements] = await Promise.all([
    db.select({ id: outlet.id, name: outlet.name }).from(outlet).where(eq(outlet.businessId, membership.businessId)).orderBy(outlet.name),
    db.select({ id: product.id, name: product.name }).from(product).where(and(eq(product.businessId, membership.businessId), eq(product.isActive, true))).orderBy(product.name),
    db.select({
      id: inventoryStock.id,
      outletId: inventoryStock.outletId,
      productId: inventoryStock.productId,
      outletName: outlet.name,
      productName: product.name,
      quantity: inventoryStock.quantity,
      lowStockThreshold: inventoryStock.lowStockThreshold,
    }).from(inventoryStock)
      .innerJoin(outlet, eq(outlet.id, inventoryStock.outletId))
      .innerJoin(product, eq(product.id, inventoryStock.productId))
      .where(eq(inventoryStock.businessId, membership.businessId))
      .orderBy(product.name),
    db.select({
      id: stockMovement.id,
      productName: product.name,
      outletName: outlet.name,
      type: stockMovement.type,
      quantity: stockMovement.quantity,
      note: stockMovement.note,
      createdAt: stockMovement.createdAt,
    }).from(stockMovement)
      .innerJoin(product, eq(product.id, stockMovement.productId))
      .innerJoin(outlet, eq(outlet.id, stockMovement.outletId))
      .where(eq(stockMovement.businessId, membership.businessId))
      .orderBy(desc(stockMovement.createdAt))
      .limit(15),
  ]);

  const selectedOutletId = outlets.some((item) => item.id === filters.outlet)
    ? filters.outlet!
    : "all";
  const selectedProductId = products.some((item) => item.id === filters.product)
    ? filters.product!
    : "";
  const showLowStockOnly = filters.status === "low";
  const outletStocks =
    selectedOutletId === "all"
      ? stocks
      : stocks.filter((item) => item.outletId === selectedOutletId);
  const lowStockRows = outletStocks.filter(
    (item) => Number(item.quantity) <= Number(item.lowStockThreshold)
  );
  const visibleStocks = showLowStockOnly ? lowStockRows : outletStocks;
  const selectedStock = stocks.find(
    (item) =>
      item.productId === selectedProductId &&
      (selectedOutletId === "all" || item.outletId === selectedOutletId)
  );
  const adjustmentOutletId = selectedStock?.outletId ?? (selectedOutletId === "all" ? outlets[0]?.id ?? "" : selectedOutletId);
  const adjustmentProductId = selectedStock?.productId || selectedProductId || products[0]?.id || "";
  const inventoryOutlets = [{ id: "all", name: "Semua Gerai" }, ...outlets];

  return (
    <AppHeader
      businessName={membership.businessName}
      outletName={
        selectedOutletId === "all"
          ? "Semua Gerai"
          : outlets.find((item) => item.id === selectedOutletId)?.name
      }
      outlets={inventoryOutlets}
      activeOutletId={selectedOutletId}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
    >
      <section className="mx-auto w-[min(1140px,calc(100%-32px))] py-8 sm:py-10 animate-page-enter">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <Boxes className="size-3.5" /> Inventory & Stock
            </Badge>
            {lowStockRows.length > 0 && (
              <Badge variant="warning">
                {lowStockRows.length} Stok Gerai Perlu Restock
              </Badge>
            )}
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-1.2px] text-[#15211d] sm:text-4xl">
            Kelola Stok Gerai
          </h1>
          <p className="m-0 text-sm leading-relaxed text-[#627069]">
            Sesuaikan stok fisik aktual per gerai, pantau batas minimum, dan audit riwayat pergerakan stok harian.
          </p>
        </div>

        <form className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(16,65,48,.04)] sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1.5 text-xs font-bold text-[#52645c]">
            Filter gerai
            <select
              name="outlet"
              defaultValue={selectedOutletId}
              className="h-10 rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none focus:border-[#198760]"
            >
              {inventoryOutlets.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="grid flex-1 gap-1.5 text-xs font-bold text-[#52645c]">
            Status stok
            <select
              name="status"
              defaultValue={showLowStockOnly ? "low" : "all"}
              className="h-10 rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none focus:border-[#198760]"
            >
              <option value="all">Semua status</option>
              <option value="low">Stok rendah</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Terapkan Filter</Button>
            {(showLowStockOnly || selectedOutletId !== "all" || selectedProductId) && (
              <Button asChild size="sm" variant="outline">
                <Link href="/inventory">Reset</Link>
              </Button>
            )}
          </div>
        </form>

        {/* Form Penyesuaian Stok */}
        <Card id="stock-adjustment" className="mt-7 scroll-mt-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                <SlidersHorizontal className="size-5" />
              </span>
              <div>
                <CardTitle className="text-lg">Penyesuaian Stok (Stock Opname)</CardTitle>
                <CardDescription className="text-xs">
                  Gunakan saat menerima kiriman barang baru, penyesuaian fisik berkala, atau retur stok rusak.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StockAdjustmentForm
              key={`${adjustmentOutletId}:${adjustmentProductId}`}
              outlets={outlets}
              products={products}
              stockSettings={stocks.map((item) => ({
                outletId: item.outletId,
                productId: item.productId,
                lowStockThreshold: Number(item.lowStockThreshold),
              }))}
              initialOutletId={adjustmentOutletId}
              initialProductId={adjustmentProductId}
            />
          </CardContent>
        </Card>

        {/* Tabel Stok Per Outlet */}
        <Card className="mt-7">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                  <Boxes className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-lg">Stok per Gerai</CardTitle>
                  <CardDescription className="text-xs">
                    Posisi stok real-time yang tersedia untuk transaksi kasir.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">{visibleStocks.length} Baris Stok</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Produk</TableHead>
                    <TableHead className="font-bold">Gerai</TableHead>
                    <TableHead className="text-right font-bold">Stok Saat Ini</TableHead>
                    <TableHead className="text-center font-bold">Status Stok</TableHead>
                    <TableHead className="text-right font-bold">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleStocks.map((item) => {
                    const isLow = item.quantity <= item.lowStockThreshold;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold text-[#15211d]">
                          {item.productName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-[#52645c]">
                            <Store className="size-3 text-[#198760]" />
                            <span>{item.outletName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-base text-[#15211d]">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={isLow ? "warning" : "default"}>
                            {isLow ? "Stok Rendah" : "Aman"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isLow ? (
                            <Button asChild size="sm" variant="outline" className="h-8 text-xs text-amber-800 hover:bg-amber-50">
                              <Link
                                href={`/inventory?status=low&outlet=${encodeURIComponent(item.outletId)}&product=${encodeURIComponent(item.productId)}#stock-adjustment`}
                              >
                                Restock <ArrowRight className="size-3.5" />
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-[#8a9b92]">Tidak diperlukan</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visibleStocks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-[#627069]">
                        {showLowStockOnly
                          ? "Tidak ada stok rendah untuk filter yang dipilih."
                          : "Belum ada data stok produk."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Riwayat Pergerakan Stok */}
        <Card className="mt-7">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                <History className="size-5" />
              </span>
              <div>
                <CardTitle className="text-lg">Riwayat Pergerakan Stok</CardTitle>
                <CardDescription className="text-xs">
                  Audit 15 log perubahan stok terakhir (penjualan kasir, penyesuaian manual, atau pembatalan void).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Produk</TableHead>
                    <TableHead className="font-bold">Gerai</TableHead>
                    <TableHead className="font-bold">Tipe & Catatan</TableHead>
                    <TableHead className="text-right font-bold">Perubahan</TableHead>
                    <TableHead className="text-right font-bold">Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((item) => {
                    const isPositive = Number(item.quantity) > 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold text-[#15211d]">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-xs text-[#52645c]">
                          {item.outletName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold">
                              {item.type}
                            </Badge>
                            <span className="text-xs text-[#627069]">
                              {item.note ?? "Pergerakan stok"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          <span className={isPositive ? "text-[#198760]" : "text-rose-600"}>
                            {isPositive ? `+${item.quantity}` : item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-[#627069]">
                          {new Date(item.createdAt).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-[#627069]">
                        Belum ada riwayat pergerakan stok.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppHeader>
  );
}
