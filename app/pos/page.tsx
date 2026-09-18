import { and, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { category, inventoryStock, outlet, product, sale } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { PosTerminal } from "@/components/pos-terminal";
import { SubscriptionLockout } from "@/components/subscription-lockout";
import { getBusinessSubscription, getMembership, requireSession } from "@/lib/auth-session";
import { getSubscriptionStatusDetails, hasPlanFeature, normalizePlan } from "@/lib/plans";

export default async function PosPage({ searchParams }: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");

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
  const allowNonCashPayments = hasPlanFeature(selectedPlan, "allPaymentMethods");

  const outlets = await db
    .select({ id: outlet.id, name: outlet.name })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId))
    .orderBy(outlet.name);

  const requestedOutletId = (await searchParams).outlet;
  const activeOutlet = outlets.find((item) => item.id === requestedOutletId) ?? outlets[0];
  if (!activeOutlet) redirect("/dashboard");

  const products = await db
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
    .orderBy(product.name);

  const recentSales = await db
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
    .limit(8);

  return (
    <AppHeader
      businessName={membership.businessName}
      outletName={activeOutlet.name}
      outlets={outlets}
      activeOutletId={activeOutlet.id}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
    >
      <section className="mx-auto w-[min(1280px,calc(100%-32px))] py-8 animate-page-enter">
        <span className="section-kicker">Point of Sale</span>
        <h1 className="mt-3 mb-2 text-3xl tracking-[-1.2px]">Mulai transaksi</h1>
        <p className="m-0 text-sm leading-7 text-[#627069]">Pilih produk, masukkan pembayaran, lalu stok akan berkurang otomatis setelah transaksi berhasil.</p>

        <div className="mt-7">
          <PosTerminal
            key={activeOutlet.id}
            businessName={membership.businessName}
            products={products.map((item) => ({ ...item, stock: Number(item.stock ?? 0) }))}
            outlets={[activeOutlet]}
            initialOutletId={activeOutlet.id}
            allowNonCashPayments={allowNonCashPayments}
          />
        </div>
        <section className="mt-8 rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_24px_rgba(16,65,48,.06)]">
          <h2 className="text-lg font-extrabold">Transaksi terbaru</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e7efea] text-[#627069]">
                  <th className="px-3 py-2">Invoice</th>
                  <th className="px-3 py-2">Waktu</th>
                  <th className="px-3 py-2">Pembayaran</th>
                  <th className="px-3 py-2 text-right">Total</th>
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
                    <td className="px-3 py-3 font-semibold">
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
                    <td className="px-3 py-3 text-[#627069]">
                      {new Date(item.createdAt).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-3 uppercase">{item.paymentMethod}</td>
                    <td
                      className={`px-3 py-3 text-right font-bold ${
                        item.status === "voided" ? "text-rose-600 line-through" : ""
                      }`}
                    >
                      Rp {Number(item.total).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
                {recentSales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-5 text-[#627069]">
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AppHeader>
  );
}
