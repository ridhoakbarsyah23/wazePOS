import { and, eq, sql } from "drizzle-orm";
import { Tag } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { CategoryManager } from "@/components/catalog/category-manager";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { category, outlet, product } from "@/db/schema";
import { requireDashboardAccess } from "@/lib/access/dashboard-access";
import { normalizePlan } from "@/lib/billing/plans";

export default async function CategoriesPage() {
  const access = await requireDashboardAccess({ rule: "manageBusiness" });
  if (!access.ok) return access.lockout;
  const { session, membership, currentSubscription, subDetails, allowDarkMode } = access;

  const [categories, outlets] = await Promise.all([
    db
      .select({
        id: category.id,
        name: category.name,
        productCount: sql<number>`COUNT(${product.id})::int`,
      })
      .from(category)
      .leftJoin(
        product,
        and(eq(product.categoryId, category.id), eq(product.businessId, membership.businessId)),
      )
      .where(eq(category.businessId, membership.businessId))
      .groupBy(category.id, category.name)
      .orderBy(category.name),
    db
      .select({ id: outlet.id, name: outlet.name, slug: outlet.slug })
      .from(outlet)
      .where(eq(outlet.businessId, membership.businessId))
      .orderBy(outlet.name),
  ]);

  return (
    <AppHeader
      businessName={membership.businessName}
      userName={session.user.name}
      outletName={outlets[0]?.name}
      outlets={outlets}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
      plan={normalizePlan(currentSubscription?.plan)}
    >
      <section className="mx-auto w-[min(1140px,calc(100%-24px))] py-6 animate-page-enter sm:w-[min(1140px,calc(100%-40px))] sm:py-8">
        <header className="flex items-start gap-3">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border border-[#cfe0d7] bg-white text-[#187c59]">
            <Tag className="size-5" />
          </span>
          <div>
            <Badge variant="outline" className="mb-2 w-fit">
              Master data produk
            </Badge>
            <h1 className="text-2xl font-bold tracking-[-0.7px] text-[#17211d] sm:text-3xl">
              Kelola Kategori
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6c7a73]">
              Buat kategori yang membantu produk lebih mudah dicari, dipilih di kasir, dan dipahami saat membuat laporan.
            </p>
          </div>
        </header>

        <div className="mt-6">
          <CategoryManager
            initialCategories={categories.map((item) => ({
              id: item.id,
              name: item.name,
              productCount: Number(item.productCount),
            }))}
          />
        </div>
      </section>
    </AppHeader>
  );
}
