import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { category, inventoryStock, outlet, product, stockMovement } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { canManageBusiness, getMembership } from "@/lib/auth/auth-session";
import { isUniqueConstraintViolation } from "@/lib/shared/product-errors";
import { productSchema } from "@/lib/validation/catalog";

export async function POST(request: Request) {
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
    return NextResponse.json({ message: "Format produk tidak valid." }, { status: 400 });
  }

  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Periksa data produk." },
      { status: 422 },
    );
  }

  const [ownedOutlet] = await db
    .select({ id: outlet.id })
    .from(outlet)
    .where(and(eq(outlet.id, parsed.data.outletId), eq(outlet.businessId, membership.businessId)))
    .limit(1);
  if (!ownedOutlet) return NextResponse.json({ message: "Gerai tidak valid." }, { status: 422 });

  if (parsed.data.categoryId) {
    const [ownedCategory] = await db
      .select({ id: category.id })
      .from(category)
      .where(and(eq(category.id, parsed.data.categoryId), eq(category.businessId, membership.businessId)))
      .limit(1);
    if (!ownedCategory) return NextResponse.json({ message: "Kategori tidak valid." }, { status: 422 });
  }

  const productId = randomUUID();
  const initialStock = parsed.data.trackStock ? parsed.data.initialStock : 0;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(product).values({
        id: productId,
        businessId: membership.businessId,
        categoryId: parsed.data.categoryId,
        name: parsed.data.name,
        sku: parsed.data.sku || null,
        sellingPrice: parsed.data.sellingPrice,
        costPrice: parsed.data.costPrice,
        trackStock: parsed.data.trackStock,
        isActive: true,
      });

      await tx.insert(inventoryStock).values({
        id: randomUUID(),
        businessId: membership.businessId,
        outletId: parsed.data.outletId,
        productId,
        quantity: initialStock,
        lowStockThreshold: parsed.data.lowStockThreshold,
      });

      if (initialStock > 0) {
        await tx.insert(stockMovement).values({
          id: randomUUID(),
          businessId: membership.businessId,
          outletId: parsed.data.outletId,
          productId,
          userId: session.user.id,
          type: "restock",
          quantity: initialStock,
          note: "Stok awal produk",
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return NextResponse.json({ message: "SKU tersebut sudah digunakan oleh produk lain." }, { status: 409 });
    }
    console.error("Failed to create product", error);
    return NextResponse.json({ message: "Produk gagal disimpan." }, { status: 500 });
  }

  return NextResponse.json({ message: "Produk berhasil ditambahkan.", id: productId }, { status: 201 });
}
