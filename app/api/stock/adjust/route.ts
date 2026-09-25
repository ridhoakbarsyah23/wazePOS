import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryStock, outlet, product, stockMovement } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { canManageBusiness, getWorkspaceContext } from "@/lib/auth/auth-session";
import { hasPlanFeature } from "@/lib/billing/plans";
import { stockAdjustmentSchema } from "@/lib/validation/stock";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });
  const context = await getWorkspaceContext(session.user.id);
  const membership = context.membership;
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  if (!canManageBusiness(membership.role)) return NextResponse.json({ message: "Anda tidak memiliki akses untuk menyesuaikan stok." }, { status: 403 });
  if (!hasPlanFeature(context.currentSubscription?.plan, "inventoryStock")) {
    return NextResponse.json(
      { message: "Manajemen stok hanya tersedia pada Paket Bisnis.", code: "PLAN_FEATURE_REQUIRED" },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format stok tidak valid." }, { status: 400 });
  }
  const parsed = stockAdjustmentSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Periksa stok." }, { status: 422 });

  try {
    await db.transaction(async (tx) => {
      const [validOutlet] = await tx.select({ id: outlet.id }).from(outlet)
        .where(and(eq(outlet.id, parsed.data.outletId), eq(outlet.businessId, membership.businessId))).limit(1);
      const [validProduct] = await tx.select({ id: product.id }).from(product)
        .where(and(eq(product.id, parsed.data.productId), eq(product.businessId, membership.businessId))).limit(1);
      if (!validOutlet || !validProduct) throw new Error("INVALID_REFERENCE");

      const [existing] = await tx.select({ id: inventoryStock.id, quantity: inventoryStock.quantity }).from(inventoryStock)
        .where(and(eq(inventoryStock.productId, parsed.data.productId), eq(inventoryStock.outletId, parsed.data.outletId))).limit(1);

      const previousQuantity = existing?.quantity ?? 0;

      if (existing) {
        await tx.update(inventoryStock).set({
          quantity: parsed.data.quantity,
          lowStockThreshold: parsed.data.lowStockThreshold,
          updatedAt: new Date(),
        }).where(eq(inventoryStock.id, existing.id));
      } else {
        await tx.insert(inventoryStock).values({
          id: randomUUID(),
          businessId: membership.businessId,
          outletId: parsed.data.outletId,
          productId: parsed.data.productId,
          quantity: parsed.data.quantity,
          lowStockThreshold: parsed.data.lowStockThreshold,
        });
      }

      await tx.insert(stockMovement).values({
        id: randomUUID(),
        businessId: membership.businessId,
        outletId: parsed.data.outletId,
        productId: parsed.data.productId,
        userId: session.user.id,
        type: "adjustment",
        quantity: parsed.data.quantity - previousQuantity,
        note: parsed.data.note || null,
      });
    });
    return NextResponse.json({ message: "Stok berhasil diperbarui." });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_REFERENCE") {
      return NextResponse.json({ message: "Produk atau gerai tidak valid." }, { status: 422 });
    }
    console.error("Failed to adjust stock", error);
    return NextResponse.json({ message: "Stok gagal diperbarui." }, { status: 500 });
  }
}
