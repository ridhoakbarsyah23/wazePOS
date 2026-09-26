import { and, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ReceiptText, ShoppingCart } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { SubscriptionLockout } from "@/components/subscription/subscription-lockout";
import { db } from "@/db";
import { business, category, inventoryStock, outlet, product, sale } from "@/db/schema";
import { getWorkspaceContext, requireSession } from "@/server/auth/auth-session";
import { paymentLabel } from "@/shared/billing/payment";
import { getSubscriptionStatusDetails, hasPlanFeature, normalizePlan } from "@/shared/billing/plans";
import { normalizeReceiptSettings } from "@/shared/validation/receipt-settings";

export async function PosPageContent({
  outletSlug,
  legacyOutletId,
}: {
  outletSlug?: string;
  legacyOutletId?: string;
}) {
  const session = await requireSession();
  const { membership, currentSubscription } = await getWorkspaceContext(session.user.id);
  if (!membership) redirect("/onboarding");
  const subDetails = getSubscriptionStatusDetails(currentSubscription);

  if (!subDetails.isValid) {
    if (membership.role === "owner") redirect("/subscription?expired=1");
    return (
      <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
        <AppHeader
          businessName={membership.businessName}
          userName={session.user.name}
          role={membership.role}
          plan={normalizePlan(currentSubscription?.plan)}
        />
        <SubscriptionLockout businessName={membership.businessName} role={membership.role} reason={subDetails.message} />
      </main>
    );
  }

  const selectedPlan = normalizePlan(currentSubscription?.plan);
  const allowNonCashPayments = hasPlanFeature(selectedPlan, "allPaymentMethods");
  const allowQrisPayments = hasPlanFeature(selectedPlan, "qrisPayments");
  const canManageInventory = hasPlanFeature(selectedPlan, "inventoryStock");
  const allowDarkMode = hasPlanFeature(selectedPlan, "darkMode");
  const outlets = await db
    .select({ id: outlet.id, name: outlet.name, slug: outlet.slug })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId))
    .orderBy(outlet.name);

  if (legacyOutletId) {
    const legacyOutlet = outlets.find((item) => item.id === legacyOutletId);
    if (legacyOutlet) redirect(`/pos/${encodeURIComponent(legacyOutlet.slug)}`);
    redirect("/pos");
  }

  const activeOutlet = outletSlug ? outlets.find((item) => item.slug === outletSlug) : outlets[0];
  if (outletSlug && !activeOutlet) notFound();
  if (!activeOutlet) redirect("/dashboard");

  const [businessRow, products, recentSales] = await Promise.all([
    db
      .select({ receiptSettings: business.receiptSettings })
      .from(business)
      .where(eq(business.id, membership.businessId))
      .limit(1),
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
      .select({ id: sale.id, invoiceNumber: sale.invoiceNumber, status: sale.status, total: sale.total, paymentMethod: sale.paymentMethod, createdAt: sale.createdAt })
      .from(sale)
      .where(and(eq(sale.businessId, membership.businessId), eq(sale.outletId, activeOutlet.id)))
      .orderBy(desc(sale.createdAt))
      .limit(8),
  ]);

  return (
    <AppHeader businessName={membership.businessName} userName={session.user.name} outletName={activeOutlet.name} outlets={outlets} activeOutletId={activeOutlet.id} role={membership.role} trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null} allowDarkMode={allowDarkMode}
      plan={selectedPlan}>
      <section className="mx-auto w-[min(1400px,calc(100%-24px))] py-5 animate-page-enter sm:w-[min(1400px,calc(100%-40px))] sm:py-6">
        <header className="relative overflow-hidden rounded-3xl border border-[#d8e8df] bg-gradient-to-br from-white via-[#f8fcfa] to-[#eaf7f0] p-5 shadow-[0_10px_35px_rgba(16,65,48,.07)] sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#198760] to-[#126b4b] text-white shadow-[0_8px_20px_rgba(25,135,96,.25)]">
                <ShoppingCart className="size-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-[-1px] text-[#15211d] sm:text-3xl">Kasir</h1>
                <p className="mt-0.5 text-sm text-[#627069]">Cari produk, lampirkan member pelanggan, lalu selesaikan pembayaran.</p>
              </div>
            </div>
            <p className="m-0 inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
              <CheckCircle2 className="size-3.5 shrink-0" />
              {canManageInventory
                 ? "Stok diperbarui otomatis setelah transaksi tersimpan"
                 : "Transaksi tetap berjalan tanpa fitur manajemen stok"}
            </p>
          </div>
        </header>
        <div className="mt-5">
          <PosTerminal key={activeOutlet.id} businessName={membership.businessName} products={products.map((item) => ({
             ...item,
             stock: Number(item.stock ?? 0),
             trackStock: canManageInventory && item.trackStock,
           }))} outlets={[activeOutlet]} initialOutletId={activeOutlet.id} allowCustomerLookup={hasPlanFeature(selectedPlan, "customerLookup")} allowNonCashPayments={allowNonCashPayments} allowQrisPayments={allowQrisPayments} allowInventory={canManageInventory} checkoutDisabledReason={null} receiptSettings={normalizeReceiptSettings(businessRow[0]?.receiptSettings)} />
        </div>
        <details className="group mt-4 overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white shadow-[0_4px_20px_rgba(16,65,48,.04)]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-black text-[#15211d] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><ReceiptText className="size-4 text-[#198760]" /> Transaksi terakhir</span><span className="text-xs font-semibold text-[#78857f] group-open:hidden">Lihat {recentSales.length} transaksi</span><span className="hidden text-xs font-semibold text-[#78857f] group-open:inline">Tutup daftar</span>
          </summary>
          <div className="overflow-x-auto border-t border-[#edf2ee]">
            <table className="min-w-full text-left text-sm">
              <thead><tr className="border-b border-[#e7efea] bg-[#fafbfa] text-xs font-semibold text-[#6c7a73]"><th className="px-4 py-2.5">Invoice</th><th className="px-4 py-2.5">Waktu</th><th className="px-4 py-2.5">Pembayaran</th><th className="px-4 py-2.5 text-right">Total</th></tr></thead>
              <tbody>
                {recentSales.map((item) => (
                  <tr key={item.invoiceNumber} className={`border-b border-[#f0f4f1] transition ${item.status === "voided" ? "bg-rose-50/40 opacity-75" : ""}`}>
                    <td className="px-4 py-3 font-semibold"><div className="flex items-center gap-2"><Link href={`/sales/${item.id}`} className={`underline ${item.status === "voided" ? "text-rose-600 line-through" : "text-[#198760]"}`}>{item.invoiceNumber}</Link>{item.status === "voided" && <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-700">BATAL</span>}</div></td>
                    <td className="px-4 py-3 text-[#627069]">{new Date(item.createdAt).toLocaleString("id-ID")}</td><td className="px-4 py-3"><span className="rounded-full bg-[#f0f5f2] px-2 py-0.5 text-[11px] font-bold text-[#44534c]">{paymentLabel(item.paymentMethod)}</span></td><td className={`px-4 py-3 text-right font-bold ${item.status === "voided" ? "text-rose-600 line-through" : ""}`}>Rp {Number(item.total).toLocaleString("id-ID")}</td>
                  </tr>
                ))}
                {recentSales.length === 0 && <tr><td colSpan={4} className="px-4 py-5 text-[#627069]">Belum ada transaksi.</td></tr>}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </AppHeader>
  );
}
