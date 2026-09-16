import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { category, product } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { ProductManager } from "@/components/product-manager";
import { SubscriptionLockout } from "@/components/subscription-lockout";
import { canManageBusiness, getBusinessSubscription, getMembership, requireSession } from "@/lib/auth-session";
import { getSubscriptionStatusDetails } from "@/lib/plans";

export default async function ProductsPage() {
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

  const [products, categories] = await Promise.all([
    db.select({
      id: product.id,
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      sellingPrice: product.sellingPrice,
      costPrice: product.costPrice,
      trackStock: product.trackStock,
      isActive: product.isActive,
    }).from(product).where(eq(product.businessId, membership.businessId)).orderBy(product.name),
    db.select({ id: category.id, name: category.name }).from(category).where(eq(category.businessId, membership.businessId)).orderBy(category.name),
  ]);

  return (
    <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
      <AppHeader
        businessName={membership.businessName}
        role={membership.role}
        trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      />
      <section className="mx-auto w-[min(1000px,calc(100%-32px))] py-10 animate-page-enter">
        <span className="section-kicker">Catalog</span>
        <h1 className="mt-3 mb-2 text-3xl tracking-[-1.2px]">Kelola produk</h1>
        <p className="m-0 text-sm leading-7 text-[#627069]">Perbarui nama, SKU, kategori, harga, dan status produk tanpa menghapus riwayat transaksi.</p>
        <section className="mt-7 rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-[0_8px_24px_rgba(16,65,48,.06)]"><ProductManager products={products} categories={categories} /></section>
      </section>
    </main>
  );
}
