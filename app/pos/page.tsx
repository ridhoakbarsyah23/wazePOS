import { and, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { category, inventoryStock, outlet, product, sale } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { PosTerminal } from "@/components/pos-terminal";
import { SubscriptionLockout } from "@/components/subscription-lockout";
import { getWorkspaceContext, requireSession } from "@/lib/auth-session";
import { getSubscriptionStatusDetails, hasPlanFeature, normalizePlan } from "@/lib/plans";

export default async function PosPage({ searchParams }: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const session = await requireSession();
  const { membership, currentSubscription } = await getWorkspaceContext(session.user.id);
  if (!membership) redirect("/onboarding");
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
  const allowNonCashPayments = hasPlanFeature(selectedPlan, "allPaymentMethods");
  const allowQrisPayments = hasPlanFeature(selectedPlan, "qrisPayments");

  const outlets = await db
    .select({ id: outlet.id, name: outlet.name })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId))
    .orderBy(outlet.name);

  const requestedOutletId = (await searchParams).outlet;
  const activeOutlet = outlets.find((item) => item.id === requestedOutletId) ?? outlets[0];
  if (!activeOutlet) redirect("/dashboard");

  const [products, recentSales] = await Promise.all([
    db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        sellingPrice: product.sellingPrice,
        trackStock: product.trackStock,
        categoryName: category.name,
        stock: sql<number>`COALESCE(${inventoryStock.quantity}, 0)::int`,
      })
      .from(product)
      .leftJoin(category, eq(category.id, product.categoryId))
      .leftJoin(inventoryStock, and(eq(inventoryStock.productId, product.id), eq(inventoryStock.outletId, activeOutlet.id)))
      .where(and(eq(product.businessId, membership.businessId), eq(product.isActive, true)))
      .orderBy(product.name),
    db
      .select({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        status: sale.status,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
      })
      .from(sale)
      .where(and(eq(sale.businessId, membership.businessId), eq(sale.outletId, activeOutlet.id)))
      .orderBy(desc(sale.createdAt))
      .limit(8),
  ]);

  return (
    <AppHeader
      businessName={membership.businessName}
      outletName={activeOutlet.name}
      outlets={outlets}
      activeOutletId={activeOutlet.id}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
    >
      <section className="mx-auto w-[min(1400px,calc(100%-24px))] py-5 animate-page-enter sm:w-[min(1400px,calc(100%-40px))] sm:py-6">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.7px] text-[#17211d]">Kasir</h1>
            <p className="mt-1 text-sm text-[#6c7a73]">Cari produk, cek pesanan, lalu selesaikan pembayaran.</p>
          </div>
          <p className="m-0 text-xs text-[#87928d]">Stok diperbarui otomatis setelah transaksi tersimpan.</p>
        </header>

        <div className="mt-5">
          <PosTerminal
            key={activeOutlet.id}
            businessName={membership.businessName}
            products={products.map((item) => ({ ...item, stock: Number(item.stock ?? 0) }))}
            outlets={[activeOutlet]}
            initialOutletId={activeOutlet.id}
            allowNonCashPayments={allowNonCashPayments}
            allowQrisPayments={allowQrisPayments}
            checkoutDisabledReason={null}
          />
        </div>
        <details className="group mt-4 border border-[#d9e2dd] bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[#33423b] [&::-webkit-details-marker]:hidden">
            <span>Transaksi terakhir</span>
            <span className="text-xs font-normal text-[#78857f] group-open:hidden">Lihat {recentSales.length} transaksi</span>
            <span className="hidden text-xs font-normal text-[#78857f] group-open:inline">Tutup daftar</span>
          </summary>
          <div className="overflow-x-auto border-t border-[#e5ebe8]">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e7efea] bg-[#fafbfa] text-xs font-semibold text-[#6c7a73]">
                  <th className="px-4 py-2.5">Invoice</th>
                  <th className="px-4 py-2.5">Waktu</th>
                  <th className="px-4 py-2.5">Pembayaran</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((item) => (
                  <tr
                    key={item.invoiceNumber}
                    className={`border-b border-[#f0f4f1] transition ${
                      item.status === "voided" ? "bg-rose-50/40 opacity-75" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/sales/${item.id}`}
                          className={`underline ${
                            item.status === "voided" ? "text-rose-600 line-through" : "text-[#198760]"
                          }`}
                        >
                          {item.invoiceNumber}
                        </a>
                        {item.status === "voided" && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-700">
                            VOID
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#627069]">
                      {new Date(item.createdAt).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 capitalize">{item.paymentMethod}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        item.status === "voided" ? "text-rose-600 line-through" : ""
                      }`}
                    >
                      Rp {Number(item.total).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
                {recentSales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-5 text-[#627069]">
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </AppHeader>
  );
}
