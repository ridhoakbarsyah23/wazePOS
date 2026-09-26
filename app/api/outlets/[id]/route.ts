import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryStock, outlet, sale, stockMovement } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { canManageBusiness, getMembership } from "@/server/auth/auth-session";
import { outletSchema } from "@/shared/validation/catalog";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki izin mengubah gerai." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format tidak valid." }, { status: 400 });
  }

  const parsed = outletSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Data gerai tidak valid." }, { status: 422 });
  }

  const { id } = await params;

  try {
    const [updated] = await db
      .update(outlet)
      .set({
        name: parsed.data.name,
        address: parsed.data.address || null,
        updatedAt: new Date(),
      })
      .where(and(eq(outlet.id, id), eq(outlet.businessId, membership.businessId)))
      .returning({ id: outlet.id, name: outlet.name, address: outlet.address });

    if (!updated) {
      return NextResponse.json({ message: "Gerai tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Gerai berhasil diperbarui.", outlet: updated });
  } catch (error) {
    console.error("Failed to update outlet", error);
    return NextResponse.json({ message: "Gagal memperbarui data gerai." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki izin menghapus gerai." }, { status: 403 });
  }

  const { id } = await params;

  // 0. Pastikan gerai memang milik usaha pemanggil sebelum menyentuh data apa pun.
  // Tanpa cek ini, id gerai usaha lain bisa lolos ke penghapusan stok di bawah.
  const [ownedOutlet] = await db
    .select({ id: outlet.id })
    .from(outlet)
    .where(and(eq(outlet.id, id), eq(outlet.businessId, membership.businessId)))
    .limit(1);

  if (!ownedOutlet) {
    return NextResponse.json({ message: "Gerai tidak ditemukan." }, { status: 404 });
  }

  // 1. Check total outlets - business must keep at least 1 outlet
  const totalOutlets = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId));

  if ((totalOutlets[0]?.count ?? 0) <= 1) {
    return NextResponse.json(
      { message: "Bisnis harus memiliki minimal 1 gerai aktif. Anda tidak dapat menghapus gerai terakhir." },
      { status: 400 }
    );
  }

  // 2. Check if outlet has transaction records in `sale`
  const [hasSales] = await db
    .select({ id: sale.id })
    .from(sale)
    .where(and(eq(sale.outletId, id), eq(sale.businessId, membership.businessId)))
    .limit(1);

  if (hasSales) {
    return NextResponse.json(
      {
        message: "Gerai ini sudah memiliki riwayat transaksi penjualan kasir sehingga tidak dapat dihapus untuk menjaga keakuratan laporan keuangan. Anda dapat mengubah nama gerai jika dibutuhkan.",
      },
      { status: 400 }
    );
  }

  try {
    await db.transaction(async (tx) => {
      // Clean up stock movement and inventory stock for this unused outlet.
      // Semua delete dibatasi businessId agar tidak menghapus data tenant lain.
      await tx
        .delete(stockMovement)
        .where(and(eq(stockMovement.outletId, id), eq(stockMovement.businessId, membership.businessId)));
      await tx
        .delete(inventoryStock)
        .where(and(eq(inventoryStock.outletId, id), eq(inventoryStock.businessId, membership.businessId)));
      await tx.delete(outlet).where(and(eq(outlet.id, id), eq(outlet.businessId, membership.businessId)));
    });

    return NextResponse.json({ message: "Gerai berhasil dihapus." });
  } catch (error) {
    console.error("Failed to delete outlet", error);
    return NextResponse.json({ message: "Gagal menghapus gerai." }, { status: 500 });
  }
}
