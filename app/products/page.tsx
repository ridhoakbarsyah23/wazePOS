import { eq } from "drizzle-orm";
import { db } from "@/db";
import { category, outlet, product } from "@/db/schema";
import { Package } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ProductManager } from "@/components/product-manager";
import { Badge } from "@/components/ui/badge";
import { requireDashboardAccess } from "@/lib/dashboard-access";

export default async function ProductsPage() {
  const access = await requireDashboardAccess({ rule: "manageBusiness" });
  if (!access.ok) return access.lockout;
  const { membership, subDetails } = access;

  const [products, categories, outlets] = await Promise.all([
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
    db.select({ id: outlet.id, name: outlet.name }).from(outlet).where(eq(outlet.businessId, membership.businessId)).orderBy(outlet.name),
  ]);

  return (
    <AppHeader
      businessName={membership.businessName}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
    >
      <section className="mx-auto w-[min(1140px,calc(100%-32px))] py-8 sm:py-10 animate-page-enter">
        <div className="flex flex-col gap-2">
          <Badge variant="outline" className="w-fit">
            <Package className="size-3.5" /> Catalog & Menu
          </Badge>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-1.2px] text-[#15211d] sm:text-4xl">
            Kelola Produk
          </h1>
          <p className="m-0 text-sm leading-relaxed text-[#627069]">
            Perbarui nama, SKU, kategori, harga jual, dan status aktif produk tanpa menghapus riwayat transaksi lama.
          </p>
        </div>

        <div className="mt-7">
          <ProductManager products={products} categories={categories} outlets={outlets} />
        </div>
      </section>
    </AppHeader>
  );
}
