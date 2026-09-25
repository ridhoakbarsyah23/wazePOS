"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { category, inventoryStock, outlet, product, stockMovement } from "@/db/schema";
import { canManageBusiness, getBusinessSubscription, getMembership, requireSession } from "@/lib/auth/auth-session";
import { hasPlanFeature } from "@/lib/billing/plans";
import { createUniqueOutletSlug } from "@/lib/shared/outlet-slug";
import { categorySchema, outletSchema, productSchema } from "@/lib/validation/catalog";

async function getBusinessContext() {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);

  if (!membership) {
    redirect("/onboarding");
  }

  if (!canManageBusiness(membership.role)) {
    redirect("/dashboard");
  }

  const subscription = await getBusinessSubscription(membership.businessId);
  return {
    membership,
    userId: session.user.id,
    canManageOutlets: hasPlanFeature(subscription?.plan, "multiOutlet"),
    canManageInventory: hasPlanFeature(subscription?.plan, "inventoryStock"),
  };
}

function redirectToDashboard(status: "success" | "error", message: string): never {
  redirect(`/dashboard?status=${status}&message=${encodeURIComponent(message)}`);
}

export async function createCategory(formData: FormData) {
  const { membership } = await getBusinessContext();
  const rawValue = formData.get("name");

  const result = categorySchema.safeParse({ name: rawValue ?? "" });
  if (!result.success) {
    redirectToDashboard("error", result.error.issues[0]?.message ?? "Kategori tidak valid.");
  }

  try {
    await db.insert(category).values({
      id: randomUUID(),
      businessId: membership.businessId,
      name: result.data.name,
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      redirectToDashboard("error", "Kategori tersebut sudah tersedia.");
    }
    console.error("Failed to create category", error);
    redirectToDashboard("error", "Kategori belum berhasil disimpan.");
  }

  revalidatePath("/dashboard");
  redirectToDashboard("success", "Kategori berhasil ditambahkan.");
}

export async function createOutlet(formData: FormData) {
  const { membership, canManageOutlets } = await getBusinessContext();
  if (!canManageOutlets) {
    redirectToDashboard("error", "Multi-gerai hanya tersedia pada Paket Bisnis.");
  }
  const nameValue = formData.get("name");
  const addressValue = formData.get("address");

  const result = outletSchema.safeParse({
    name: typeof nameValue === "string" ? nameValue : "",
    address: typeof addressValue === "string" ? addressValue : "",
  });
  if (!result.success) {
    redirectToDashboard("error", result.error.issues[0]?.message ?? "Data gerai tidak valid.");
  }

  const existingOutlets = await db
    .select({ slug: outlet.slug })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId));

  await db.insert(outlet).values({
    id: randomUUID(),
    businessId: membership.businessId,
    name: result.data.name,
    slug: createUniqueOutletSlug(
      result.data.name,
      existingOutlets.map((item) => item.slug),
    ),
    address: result.data.address || null,
  });

  revalidatePath("/dashboard");
  redirectToDashboard("success", "Gerai berhasil ditambahkan.");
}

export async function createProduct(formData: FormData) {
  const { membership, userId, canManageInventory } = await getBusinessContext();
  const payload = {
    name: formData.get("name"),
    sku: formData.get("sku"),
    categoryId: formData.get("categoryId"),
    outletId: formData.get("outletId"),
    sellingPrice: formData.get("sellingPrice"),
    costPrice: formData.get("costPrice"),
    initialStock: formData.get("initialStock"),
    lowStockThreshold: formData.get("lowStockThreshold"),
    trackStock: formData.get("trackStock") === "on",
  };

  const result = productSchema.safeParse(payload);
  if (!result.success) {
    redirectToDashboard("error", result.error.issues[0]?.message ?? "Data produk tidak valid.");
  }

  const outletExists = await db.query.outlet.findFirst({
    where: and(eq(outlet.id, result.data.outletId), eq(outlet.businessId, membership.businessId)),
  });

  if (!outletExists) {
    redirectToDashboard("error", "Gerai tidak ditemukan pada bisnis Anda.");
  }

  const categoryExists = result.data.categoryId
    ? await db.query.category.findFirst({
        where: and(eq(category.id, result.data.categoryId), eq(category.businessId, membership.businessId)),
      })
    : null;

  if (!categoryExists && result.data.categoryId) {
    redirectToDashboard("error", "Kategori tidak ditemukan pada bisnis Anda.");
  }

  const productId = randomUUID();
  const trackStock = canManageInventory && result.data.trackStock;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(product).values({
        id: productId,
        businessId: membership.businessId,
        categoryId: result.data.categoryId,
        name: result.data.name,
        sku: result.data.sku || null,
        sellingPrice: result.data.sellingPrice,
        costPrice: result.data.costPrice,
        trackStock,
        isActive: true,
      });

      const initialStock = trackStock ? result.data.initialStock : 0;
      if (trackStock) {
        await tx.insert(inventoryStock).values({
          id: randomUUID(),
          businessId: membership.businessId,
          outletId: result.data.outletId,
          productId,
          quantity: initialStock,
          lowStockThreshold: result.data.lowStockThreshold,
        });

        if (initialStock > 0) {
          await tx.insert(stockMovement).values({
            id: randomUUID(),
            businessId: membership.businessId,
            outletId: result.data.outletId,
            productId,
            userId,
            type: "restock",
            quantity: initialStock,
            note: "Stok awal produk",
          });
        }
      }
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      redirectToDashboard("error", "SKU tersebut sudah digunakan oleh produk lain.");
    }
    console.error("Failed to create product", error);
    redirectToDashboard("error", "Produk belum berhasil disimpan.");
  }

  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/pos");
  redirectToDashboard(
    "success",
    trackStock ? "Produk dan stok awal berhasil ditambahkan." : "Produk berhasil ditambahkan.",
  );
}
