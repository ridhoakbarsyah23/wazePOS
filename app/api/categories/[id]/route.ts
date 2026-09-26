import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { category, product } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { canManageBusiness, getMembership } from "@/server/auth/auth-session";
import { categorySchema } from "@/shared/validation/catalog";

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

  try {
    // Hapus kategori dan lepas kaitannya dari produk dalam satu transaksi agar
    // kegagalan di tengah tidak meninggalkan produk tanpa kategori.
    const deleted = await db.transaction(async (tx) => {
      const [removed] = await tx
        .delete(category)
        .where(and(eq(category.id, id), eq(category.businessId, membership.businessId)))
        .returning({ id: category.id, name: category.name });

      if (!removed) throw new Error("CATEGORY_NOT_FOUND");

      // Unlink products in this category (set to null) so products remain safe
      await tx
        .update(product)
        .set({ categoryId: null, updatedAt: new Date() })
        .where(and(eq(product.categoryId, id), eq(product.businessId, membership.businessId)));

      return removed;
    });

    return NextResponse.json({ message: `Kategori "${deleted.name}" berhasil dihapus.` });
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return NextResponse.json({ message: "Kategori tidak ditemukan." }, { status: 404 });
    }
    console.error("Failed to delete category", error);
    return NextResponse.json({ message: "Gagal menghapus kategori." }, { status: 500 });
  }
}
