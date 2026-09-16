import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { inventoryStock, outlet, product, stockMovement } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { StockAdjustmentForm } from "@/components/stock-adjustment-form";
import { SubscriptionLockout } from "@/components/subscription-lockout";
import { canManageBusiness, getBusinessSubscription, getMembership, requireSession } from "@/lib/auth-session";
import { getSubscriptionStatusDetails } from "@/lib/plans";

export default async function InventoryPage() {
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
      .limit(12),
  ]);

  return (
    <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
      <AppHeader
        businessName={membership.businessName}
        role={membership.role}
        trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      />
      <section className="mx-auto w-[min(1180px,calc(100%-32px))] py-10 animate-page-enter">
        <span className="section-kicker">Inventory</span>
        <h1 className="mt-3 mb-2 text-3xl tracking-[-1.2px]">Kelola stok</h1>
        <p className="m-0 max-w-2xl text-sm leading-7 text-[#627069]">Sesuaikan stok aktual per outlet dan simpan riwayat koreksi agar operasional tetap terlacak.</p>
        <section className="mt-7 rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-[0_8px_24px_rgba(16,65,48,.06)]">
          <h2 className="text-lg font-extrabold">Penyesuaian stok</h2>
          <p className="mt-1 text-sm text-[#627069]">Gunakan saat stock opname atau menerima stok baru.</p>
          <div className="mt-5"><StockAdjustmentForm outlets={outlets} products={products} /></div>
        </section>
        <section className="mt-7 rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-[0_8px_24px_rgba(16,65,48,.06)]">
          <h2 className="text-lg font-extrabold">Stok per outlet</h2>
          <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-[#e7efea] text-[#627069]"><th className="px-3 py-2">Produk</th><th className="px-3 py-2">Outlet</th><th className="px-3 py-2">Stok</th><th className="px-3 py-2">Status</th></tr></thead><tbody>
            {stocks.map((item) => <tr key={item.id} className="border-b border-[#f0f4f1]"><td className="px-3 py-3 font-semibold">{item.productName}</td><td className="px-3 py-3">{item.outletName}</td><td className="px-3 py-3 font-bold">{item.quantity}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.quantity <= item.lowStockThreshold ? "bg-[#fff0e5] text-[#a35f12]" : "bg-[#eaf7f0] text-[#198760]"}`}>{item.quantity <= item.lowStockThreshold ? "Stok rendah" : "Aman"}</span></td></tr>)}
            {stocks.length === 0 && <tr><td colSpan={4} className="px-3 py-5 text-[#627069]">Belum ada data stok.</td></tr>}
          </tbody></table></div>
        </section>
        <section className="mt-7 rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-[0_8px_24px_rgba(16,65,48,.06)]">
          <h2 className="text-lg font-extrabold">Riwayat pergerakan stok</h2>
          <div className="mt-4 space-y-3">{movements.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f7faf8] px-4 py-3 text-sm"><div><strong>{item.productName}</strong><p className="m-0 text-xs text-[#627069]">{item.outletName} · {item.note ?? "Penyesuaian stok"}</p></div><div className="text-right"><strong>{item.quantity}</strong><p className="m-0 text-xs text-[#627069]">{new Date(item.createdAt).toLocaleString("id-ID")}</p></div></div>)}{movements.length === 0 && <p className="m-0 text-sm text-[#627069]">Belum ada riwayat stok.</p>}</div>
        </section>
      </section>
    </main>
  );
}
