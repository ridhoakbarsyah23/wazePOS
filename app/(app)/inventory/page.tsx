import { and, desc, eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Filter,
  History,
  Search,
  SlidersHorizontal,
  Store,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { inventoryStock, outlet, product, stockMovement } from "@/db/schema";
import { AppHeader } from "@/components/shared/app-header";
import { PlanFeatureNotice } from "@/components/subscription/plan-feature-notice";
import { StockAdjustmentForm } from "@/components/inventory/stock-adjustment-form";
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
import { hasPlanFeature, normalizePlan } from "@/shared/billing/plans";
import {
  INVENTORY_PAGE_SIZE,
  getPageNumbers,
  pageDisabledClass,
  pageLinkClass,
} from "@/shared/pagination";
import { parsePageParam } from "@/server/pos/sale-filters";

const movementTypeLabels: Record<string, string> = {
  adjustment: "Penyesuaian",
  restock: "Penambahan stok",
  sale: "Penjualan",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; outlet?: string; product?: string; q?: string; page?: string }>;
}) {
  const filters = await searchParams;
  const access = await requireDashboardAccess({ rule: "manageBusiness" });
  if (!access.ok) return access.lockout;
  const { session, membership, currentSubscription, subDetails, allowDarkMode } = access;
  const selectedPlan = normalizePlan(currentSubscription?.plan);

  if (!hasPlanFeature(selectedPlan, "inventoryStock")) {
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
          featureName="Manajemen stok"
          description="Pantau stok, atur stok awal, dan terima peringatan stok menipis tersedia di Paket Bisnis."
        />
      </AppHeader>
    );
  }

  const [outlets, products, stocks, movements] = await Promise.all([
    db.select({ id: outlet.id, name: outlet.name, slug: outlet.slug }).from(outlet).where(eq(outlet.businessId, membership.businessId)).orderBy(outlet.name),
    db.select({ id: product.id, name: product.name }).from(product).where(and(eq(product.businessId, membership.businessId), eq(product.isActive, true))).orderBy(product.name),
    db.select({
      id: inventoryStock.id,
      outletId: inventoryStock.outletId,
      productId: inventoryStock.productId,
      outletName: outlet.name,
      productName: product.name,
      productIsActive: product.isActive,
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
  const productQuery = (filters.q ?? "").trim().slice(0, 80);
  const outletStocks =
    selectedOutletId === "all"
      ? stocks
      : stocks.filter((item) => item.outletId === selectedOutletId);
  const matchingStocks = productQuery
    ? outletStocks.filter((item) => item.productName.toLowerCase().includes(productQuery.toLowerCase()))
    : outletStocks;
  const lowStockRows = outletStocks.filter(
    (item) => Number(item.quantity) <= Number(item.lowStockThreshold)
  );
  const filteredStocks = showLowStockOnly
    ? matchingStocks.filter((item) => Number(item.quantity) <= Number(item.lowStockThreshold))
    : matchingStocks;
  const totalPages = Math.max(Math.ceil(filteredStocks.length / INVENTORY_PAGE_SIZE), 1);
  const page = Math.min(parsePageParam(filters.page), totalPages);
  const visibleStocks = filteredStocks.slice(
    (page - 1) * INVENTORY_PAGE_SIZE,
    page * INVENTORY_PAGE_SIZE,
  );
  const rangeStart = filteredStocks.length === 0 ? 0 : (page - 1) * INVENTORY_PAGE_SIZE + 1;
  const rangeEnd = rangeStart + visibleStocks.length - 1;
  const pageNumbers = getPageNumbers(page, totalPages);
  const selectedStock = stocks.find(
    (item) =>
      item.productId === selectedProductId &&
      (selectedOutletId === "all" || item.outletId === selectedOutletId)
  );
  const adjustmentOutletId = selectedStock?.outletId ?? (selectedOutletId === "all" ? outlets[0]?.id ?? "" : selectedOutletId);
  const adjustmentProductId = selectedStock?.productId || selectedProductId || products[0]?.id || "";
  const inventoryOutlets = [{ id: "all", name: "Semua Gerai" }, ...outlets];
  const monitoredStocks = selectedOutletId === "all" ? stocks : stocks.filter((item) => item.outletId === selectedOutletId);
  const totalStockQuantity = monitoredStocks.reduce(
    (total, item) => total + Number(item.quantity),
    0,
  );
  const visibleOutletCount = selectedOutletId === "all" ? outlets.length : outlets.length > 0 ? 1 : 0;
  const activeFilterCount =
    Number(selectedOutletId !== "all") + Number(showLowStockOnly) + Number(Boolean(productQuery));

  function pageHref(targetPage: number) {
    const search = new URLSearchParams();
    if (selectedOutletId !== "all") search.set("outlet", selectedOutletId);
    if (showLowStockOnly) search.set("status", "low");
    if (productQuery) search.set("q", productQuery);
    if (targetPage > 1) search.set("page", String(targetPage));
    const queryString = search.toString();
    return queryString ? `/inventory?${queryString}` : "/inventory";
  }

  function adjustmentHref(outletId: string, productId: string) {
    const search = new URLSearchParams({ outlet: outletId, product: productId });
    return `/inventory?${search.toString()}#stock-adjustment`;
  }

  const emptyStateMessage = productQuery
    ? "Tidak ada produk yang cocok dengan kata kunci pencarian. Periksa kembali ejaan nama produk."
    : showLowStockOnly
      ? "Tidak ada stok yang mencapai batas minimum. Seluruh stok berada dalam kondisi aman."
      : "Belum ada stok produk yang tercatat. Tambahkan produk terlebih dahulu untuk mulai memantau persediaan.";

  return (
    <AppHeader
      businessName={membership.businessName}
      userName={session.user.name}
      outletName={
        selectedOutletId === "all"
          ? "Semua Gerai"
          : outlets.find((item) => item.id === selectedOutletId)?.name
      }
      outlets={inventoryOutlets}
      activeOutletId={selectedOutletId}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
      plan={normalizePlan(currentSubscription?.plan)}
    >
      <section className="mx-auto w-[min(1240px,calc(100%-24px))] py-6 sm:w-[min(1240px,calc(100%-40px))] sm:py-10 animate-page-enter">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-[#f7faf8]">
              <Boxes className="size-3.5" /> Manajemen Stok
            </Badge>
            {lowStockRows.length > 0 && (
              <Badge variant="warning">
                <AlertTriangle className="size-3.5" />
                {lowStockRows.length} produk perlu restok
              </Badge>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.8px] text-[#15211d] sm:text-4xl sm:tracking-[-1.2px]">
            Stok dan Persediaan
          </h1>
          <p className="m-0 max-w-3xl text-sm leading-6 text-[#627069]">
            Pantau ketersediaan produk di setiap gerai, tangani stok yang menipis lebih awal, dan catat penyesuaian persediaan secara akurat.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(16,65,48,.04)]">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                <Boxes className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-xs font-semibold text-[#71857c]">Total unit stok</p>
                <p className="m-0 mt-0.5 text-xl font-extrabold text-[#15211d]">{totalStockQuantity.toLocaleString("id-ID")}</p>
                <p className="m-0 text-[11px] text-[#8a9b92]">
                  {monitoredStocks.length} produk terdaftar di {visibleOutletCount === 1 ? "gerai terpilih" : `${visibleOutletCount} gerai`}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(16,65,48,.04)]">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                <Store className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-xs font-semibold text-[#71857c]">Gerai dipantau</p>
                <p className="m-0 mt-0.5 text-xl font-extrabold text-[#15211d]">{visibleOutletCount}</p>
                <p className="m-0 text-[11px] text-[#8a9b92]">
                  {selectedOutletId === "all" ? "Menampilkan seluruh gerai" : "Menampilkan gerai terpilih"}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(16,65,48,.04)]">
            <div className="flex items-center gap-3">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${lowStockRows.length > 0 ? "bg-[#fff0e5] text-[#a35f12]" : "bg-[#eaf7f0] text-[#198760]"}`}>
                <AlertTriangle className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-xs font-semibold text-[#71857c]">Perlu restok</p>
                <p className="m-0 mt-0.5 text-xl font-extrabold text-[#15211d]">{lowStockRows.length}</p>
                <p className="m-0 text-[11px] text-[#8a9b92]">
                  {lowStockRows.length > 0 ? "Segera lakukan penambahan stok" : "Seluruh stok dalam kondisi aman"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <form className="mt-5 rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(16,65,48,.04)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-[#198760]" />
              <h2 className="m-0 text-sm font-extrabold text-[#15211d]">Filter stok</h2>
            </div>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} filter aktif</Badge>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr_auto] xl:items-end">
            <label className="grid gap-1.5 text-xs font-bold text-[#52645c]">
              Gerai
              <select
                name="outlet"
                defaultValue={selectedOutletId}
                className="h-11 rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#198760] focus:ring-4 focus:ring-[#198760]/10"
              >
                {inventoryOutlets.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#52645c]">
              Kondisi stok
              <select
                name="status"
                defaultValue={showLowStockOnly ? "low" : "all"}
                className="h-11 rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#198760] focus:ring-4 focus:ring-[#198760]/10"
              >
                <option value="all">Semua status</option>
                <option value="low">Mencapai atau di bawah batas minimum</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-[#52645c]">
              Cari produk
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a9b92]" />
                <input
                  type="search"
                  name="q"
                  defaultValue={productQuery}
                  maxLength={80}
                  placeholder="Nama produk..."
                  className="h-11 w-full rounded-xl border border-[#dbe5df] bg-white pl-9 pr-3 text-sm font-semibold text-[#15211d] outline-none transition placeholder:font-normal placeholder:text-[#9aa69f] focus:border-[#198760] focus:ring-4 focus:ring-[#198760]/10"
                />
              </span>
            </label>
            <div className="flex gap-2 md:col-span-2 xl:col-span-1">
              <Button type="submit" size="sm" className="h-11 flex-1 lg:flex-none">Terapkan filter</Button>
              {(showLowStockOnly || selectedOutletId !== "all" || selectedProductId || productQuery) && (
                <Button asChild size="sm" variant="outline" className="h-11 flex-1 lg:flex-none">
                  <Link href="/inventory">
                    <XCircle className="size-3.5" /> Hapus filter
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Form Penyesuaian Stok */}
        <Card id="stock-adjustment" className="mt-6 scroll-mt-6 overflow-hidden">
          <CardHeader className="border-b border-[#edf2ee] bg-[#fafcfb] px-4 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                <SlidersHorizontal className="size-5" />
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg">Penyesuaian stok</CardTitle>
                <CardDescription className="mt-0.5 text-xs leading-5">
                  Perbarui jumlah stok aktual setelah penerimaan barang, stok opname, retur, atau kerusakan produk.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <StockAdjustmentForm
              key={`${adjustmentOutletId}:${adjustmentProductId}`}
              outlets={outlets}
              products={products}
              stockSettings={stocks.map((item) => ({
                outletId: item.outletId,
                productId: item.productId,
                currentQuantity: Number(item.quantity),
                lowStockThreshold: Number(item.lowStockThreshold),
              }))}
              initialOutletId={adjustmentOutletId}
              initialProductId={adjustmentProductId}
              showSelectionHint={Boolean(filters.product && selectedStock)}
            />
          </CardContent>
        </Card>

        {/* Ringkasan stok */}
        <Card className="mt-6 overflow-hidden">
          <CardHeader className="border-b border-[#edf2ee] bg-[#fafcfb] px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                  <Boxes className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-base sm:text-lg">Daftar stok</CardTitle>
                  <CardDescription className="mt-0.5 text-xs leading-5">
                    Jumlah stok yang tersedia untuk transaksi di setiap gerai.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">{filteredStocks.length} data stok ditemukan</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2 xl:hidden">
              {visibleStocks.map((item) => {
                const isLow = Number(item.quantity) <= Number(item.lowStockThreshold);
                return (
                  <article key={item.id} className="rounded-2xl border border-[#e1ebe5] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="m-0 truncate text-sm font-extrabold text-[#15211d]">{item.productName}</h3>
                        <p className="m-0 mt-1 flex items-center gap-1.5 text-xs text-[#627069]">
                          <Store className="size-3.5 shrink-0 text-[#198760]" />
                          <span className="truncate">{item.outletName}</span>
                        </p>
                      </div>
                      <Badge variant={isLow ? "warning" : "default"}>
                        {isLow ? "Perlu restok" : "Tersedia"}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f7faf8] p-3">
                      <div>
                        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-[#82928a]">Stok saat ini</p>
                        <p className="m-0 mt-0.5 text-lg font-extrabold text-[#15211d]">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-[#82928a]">Batas minimum</p>
                        <p className="m-0 mt-0.5 text-lg font-extrabold text-[#15211d]">{item.lowStockThreshold}</p>
                      </div>
                    </div>
                    {item.productIsActive ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className={`mt-3 h-10 w-full text-xs ${isLow ? "text-amber-800 hover:bg-amber-50" : "text-[#187c59] hover:bg-[#f1f8f4]"}`}
                      >
                        <Link href={adjustmentHref(item.outletId, item.productId)}>
                          Sesuaikan stok <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <p className="m-0 mt-3 text-center text-xs font-semibold text-[#8a9b92]">Produk nonaktif</p>
                    )}
                  </article>
                );
              })}
              {visibleStocks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#dbe5df] px-4 py-10 text-center md:col-span-2">
                  <Boxes className="mx-auto size-7 text-[#9aa69f]" />
                  <p className="m-0 mt-3 text-sm font-bold text-[#52645c]">Data stok tidak ditemukan</p>
                  <p className="m-0 mt-1 text-xs text-[#82928a]">{emptyStateMessage}</p>
                </div>
              )}
            </div>

            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Produk</TableHead>
                    <TableHead className="font-bold">Gerai</TableHead>
                    <TableHead className="text-right font-bold">Stok saat ini</TableHead>
                    <TableHead className="text-center font-bold">Kondisi</TableHead>
                    <TableHead className="text-right font-bold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleStocks.map((item) => {
                    const isLow = Number(item.quantity) <= Number(item.lowStockThreshold);
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
                        <TableCell className="text-right">
                          <span className="block text-base font-extrabold text-[#15211d]">{item.quantity}</span>
                          <span className="block text-[10px] text-[#8a9b92]">Batas {item.lowStockThreshold}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={isLow ? "warning" : "default"}>
                            {isLow ? "Perlu restok" : "Tersedia"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.productIsActive ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className={`h-8 text-xs ${isLow ? "text-amber-800 hover:bg-amber-50" : "text-[#187c59] hover:bg-[#f1f8f4]"}`}
                            >
                              <Link href={adjustmentHref(item.outletId, item.productId)}>
                                Sesuaikan <ArrowRight className="size-3.5" />
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs font-semibold text-[#8a9b92]">Produk nonaktif</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {visibleStocks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-[#627069]">
                        {emptyStateMessage}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredStocks.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-[#e5ebe8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="m-0 text-xs text-[#71857c]">
                  Menampilkan <span className="font-semibold text-[#405148]">{rangeStart}&ndash;{rangeEnd}</span> dari{" "}
                  <span className="font-semibold text-[#405148]">{filteredStocks.length}</span> data stok
                </p>
                <nav className="flex flex-wrap items-center gap-1" aria-label="Navigasi halaman stok">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)} className={pageLinkClass}>Sebelumnya</Link>
                  ) : (
                    <span aria-disabled className={pageDisabledClass}>Sebelumnya</span>
                  )}
                  {pageNumbers.map((item, index) =>
                    item === "ellipsis" ? (
                      <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#9aa69f]">&hellip;</span>
                    ) : item === page ? (
                      <span key={item} aria-current="page" className="grid size-8 place-items-center rounded-lg bg-[#eaf7f0] text-xs font-bold text-[#187c59]">
                        {item}
                      </span>
                    ) : (
                      <Link key={item} href={pageHref(item)} className="grid size-8 place-items-center rounded-lg text-xs font-semibold text-[#68766f] transition hover:bg-[#f3f8f5] hover:text-[#187c59]">
                        {item}
                      </Link>
                    ),
                  )}
                  {page < totalPages ? (
                    <Link href={pageHref(page + 1)} className={pageLinkClass}>Berikutnya</Link>
                  ) : (
                    <span aria-disabled className={pageDisabledClass}>Berikutnya</span>
                  )}
                </nav>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Riwayat perubahan stok */}
        <Card className="mt-6 overflow-hidden">
          <CardHeader className="border-b border-[#edf2ee] bg-[#fafcfb] px-4 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                <History className="size-5" />
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg">Riwayat perubahan stok</CardTitle>
                <CardDescription className="mt-0.5 text-xs leading-5">
                  15 perubahan terbaru dari penjualan, penyesuaian manual, dan pembatalan transaksi.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2 xl:hidden">
              {movements.map((item) => {
                const isPositive = Number(item.quantity) > 0;
                return (
                  <article key={item.id} className="rounded-2xl border border-[#e1ebe5] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="m-0 truncate text-sm font-extrabold text-[#15211d]">{item.productName}</h3>
                        <p className="m-0 mt-1 truncate text-xs text-[#627069]">{item.outletName}</p>
                      </div>
                      <span className={`shrink-0 text-base font-extrabold ${isPositive ? "text-[#198760]" : "text-rose-600"}`}>
                        {isPositive ? `+${item.quantity}` : item.quantity}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {movementTypeLabels[item.type] ?? "Perubahan stok"}
                      </Badge>
                      <span className="text-xs text-[#627069]">{item.note ?? "Tanpa catatan tambahan"}</span>
                    </div>
                    <time className="mt-3 block text-[11px] text-[#8a9b92]" dateTime={new Date(item.createdAt).toISOString()}>
                      {new Date(item.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </article>
                );
              })}
              {movements.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#dbe5df] px-4 py-10 text-center md:col-span-2">
                  <History className="mx-auto size-7 text-[#9aa69f]" />
                  <p className="m-0 mt-3 text-sm font-bold text-[#52645c]">Belum ada perubahan stok</p>
                  <p className="m-0 mt-1 text-xs text-[#82928a]">Aktivitas stok terbaru akan ditampilkan di sini.</p>
                </div>
              )}
            </div>

            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Produk</TableHead>
                    <TableHead className="font-bold">Gerai</TableHead>
                    <TableHead className="font-bold">Jenis dan catatan</TableHead>
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
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {movementTypeLabels[item.type] ?? "Perubahan stok"}
                            </Badge>
                            <span className="text-xs text-[#627069]">
                              {item.note ?? "Tanpa catatan tambahan"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          <span className={isPositive ? "text-[#198760]" : "text-rose-600"}>
                            {isPositive ? `+${item.quantity}` : item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-[#627069]">
                          <time dateTime={new Date(item.createdAt).toISOString()}>
                            {new Date(item.createdAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </time>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-[#627069]">
                        Belum ada perubahan stok yang tercatat. Riwayat akan terisi otomatis setelah ada penjualan atau penyesuaian stok.
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
