import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { category, product } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { canManageBusiness, getMembership } from "@/lib/auth/auth-session";
import { categorySchema } from "@/lib/validation/catalog";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki izin mengubah kategori." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format tidak valid." }, { status: 400 });
  }

  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Data kategori tidak valid." }, { status: 422 });
  }

  const { id } = await params;

  try {
    const [updated] = await db
      .update(category)
      .set({ name: parsed.data.name, updatedAt: new Date() })
      .where(and(eq(category.id, id), eq(category.businessId, membership.businessId)))
      .returning({ id: category.id, name: category.name });

    if (!updated) {
      return NextResponse.json({ message: "Kategori tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Kategori berhasil diperbarui.", category: updated });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json({ message: "Kategori dengan nama tersebut sudah ada." }, { status: 409 });
    }
    console.error("Failed to update category", error);
    return NextResponse.json({ message: "Gagal memperbarui kategori." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki izin menghapus kategori." }, { status: 403 });
  }

  const { id } = await params;

  // Unlink products in this category (set to null) so products remain safe
  await db
    .update(product)
    .set({ categoryId: null, updatedAt: new Date() })
    .where(and(eq(product.categoryId, id), eq(product.businessId, membership.businessId)));

  // Delete category
  const [deleted] = await db
    .delete(category)
    .where(and(eq(category.id, id), eq(category.businessId, membership.businessId)))
    .returning({ id: category.id, name: category.name });

  if (!deleted) {
    return NextResponse.json({ message: "Kategori tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ message: `Kategori "${deleted.name}" berhasil dihapus.` });
}
