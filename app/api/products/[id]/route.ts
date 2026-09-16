import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { category, product } from "@/db/schema";
import { auth } from "@/lib/auth";
import { canManageBusiness, getMembership } from "@/lib/auth-session";
import { productUpdateSchema } from "@/lib/validation/catalog";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });
  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  if (!canManageBusiness(membership.role)) return NextResponse.json({ message: "Anda tidak memiliki akses untuk mengelola produk." }, { status: 403 });

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

  let updated: { id: string } | undefined;
  try {
    [updated] = await db.update(product).set({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      categoryId: parsed.data.categoryId,
      sellingPrice: parsed.data.sellingPrice,
      costPrice: parsed.data.costPrice,
      trackStock: parsed.data.trackStock,
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    }).where(and(eq(product.id, id), eq(product.businessId, membership.businessId))).returning({ id: product.id });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json({ message: "SKU tersebut sudah digunakan oleh produk lain." }, { status: 409 });
    }
    console.error("Failed to update product", error);
    return NextResponse.json({ message: "Produk gagal diperbarui." }, { status: 500 });
  }

  if (!updated) return NextResponse.json({ message: "Produk tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ message: "Produk berhasil diperbarui." });
}
