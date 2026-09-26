import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { category, inventoryStock, outlet, product } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { canManageBusiness, getBusinessSubscription, getMembership } from "@/server/auth/auth-session";
import { hasPlanFeature } from "@/shared/billing/plans";
import { isUniqueConstraintViolation } from "@/shared/product-errors";
import { productDeleteSchema, productUpdateSchema } from "@/shared/validation/catalog";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });
  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  if (!canManageBusiness(membership.role)) return NextResponse.json({ message: "Anda tidak memiliki akses untuk mengelola produk." }, { status: 403 });

  const subscription = await getBusinessSubscription(membership.businessId);
  const canManageInventory = hasPlanFeature(subscription?.plan, "inventoryStock");

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format produk tidak valid." }, { status: 400 });
  }
  const parsed = productUpdateSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Periksa data produk." }, { status: 422 });

  const { id } = await params;
  if (parsed.data.categoryId) {
    const [ownedCategory] = await db.select({ id: category.id }).from(category)
      .where(and(eq(category.id, parsed.data.categoryId), eq(category.businessId, membership.businessId))).limit(1);
    if (!ownedCategory) return NextResponse.json({ message: "Kategori tidak valid." }, { status: 422 });
  }

  const [currentProduct] = await db
    .select({ trackStock: product.trackStock })
    .from(product)
    .where(and(eq(product.id, id), eq(product.businessId, membership.businessId)))
    .limit(1);
  if (!currentProduct) return NextResponse.json({ message: "Produk tidak ditemukan." }, { status: 404 });

  const nextTrackStock = canManageInventory && parsed.data.trackStock;

  try {
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(product)
        .set({
          name: parsed.data.name,
          sku: parsed.data.sku || null,
          categoryId: parsed.data.categoryId,
          sellingPrice: parsed.data.sellingPrice,
          costPrice: parsed.data.costPrice,
          trackStock: nextTrackStock,
          isActive: parsed.data.isActive,
          updatedAt: new Date(),
        })
        .where(and(eq(product.id, id), eq(product.businessId, membership.businessId)))
        .returning({ id: product.id });

      if (!updated) throw new Error("PRODUCT_NOT_FOUND");

      // Selaraskan baris inventory_stock saat status pelacakan stok berubah,
      // agar daftar stok tidak menyisakan baris yatim / hilang tanpa baris.
      if (canManageInventory && nextTrackStock !== currentProduct.trackStock) {
        if (nextTrackStock) {
          const businessOutlets = await tx
            .select({ id: outlet.id })
            .from(outlet)
            .where(eq(outlet.businessId, membership.businessId));
          const existingStocks = await tx
            .select({ outletId: inventoryStock.outletId })
            .from(inventoryStock)
            .where(and(
              eq(inventoryStock.productId, id),
              eq(inventoryStock.businessId, membership.businessId),
            ));
          const existingOutletIds = new Set(existingStocks.map((row) => row.outletId));
          const missingOutlets = businessOutlets.filter((row) => !existingOutletIds.has(row.id));
          if (missingOutlets.length > 0) {
            await tx.insert(inventoryStock).values(
              missingOutlets.map((row) => ({
                id: randomUUID(),
                businessId: membership.businessId,
                outletId: row.id,
                productId: id,
                quantity: 0,
              })),
            );
          }
        } else {
          await tx
            .delete(inventoryStock)
            .where(and(
              eq(inventoryStock.productId, id),
              eq(inventoryStock.businessId, membership.businessId),
            ));
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ message: "Produk tidak ditemukan." }, { status: 404 });
    }
    if (isUniqueConstraintViolation(error)) {
      return NextResponse.json({ message: "SKU tersebut sudah digunakan oleh produk lain." }, { status: 409 });
    }
    console.error("Failed to update product", error);
    return NextResponse.json({ message: "Produk gagal diperbarui." }, { status: 500 });
  }

  return NextResponse.json({ message: "Produk berhasil diperbarui." });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki akses untuk mengelola produk." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Konfirmasi penghapusan tidak valid." }, { status: 400 });
  }

  const parsed = productDeleteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Konfirmasi penghapusan diperlukan." }, { status: 422 });
  }

  const { id } = await params;
  const [updated] = await db
    .update(product)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(product.id, id), eq(product.businessId, membership.businessId)))
    .returning({ id: product.id });

  if (!updated) return NextResponse.json({ message: "Produk tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ message: "Produk berhasil dinonaktifkan." });
}
