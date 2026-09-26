import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { customer } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { canManageBusiness, getMembership } from "@/server/auth/auth-session";
import { customerSchema } from "@/shared/validation/customer";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki izin mengubah pelanggan." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format tidak valid." }, { status: 400 });
  }

  const parsed = customerSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Data pelanggan tidak valid." },
      { status: 422 },
    );
  }

  const { id } = await params;

  try {
    const [updated] = await db
      .update(customer)
      .set({
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        note: parsed.data.note || null,
        updatedAt: new Date(),
      })
      .where(and(eq(customer.id, id), eq(customer.businessId, membership.businessId)))
      .returning({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        note: customer.note,
      });

    if (!updated) {
      return NextResponse.json({ message: "Pelanggan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Pelanggan berhasil diperbarui.", customer: updated });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { message: "Nomor telepon tersebut sudah terdaftar untuk pelanggan lain." },
        { status: 409 },
      );
    }
    console.error("Failed to update customer", error);
    return NextResponse.json({ message: "Gagal memperbarui data pelanggan." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki izin menghapus pelanggan." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const [deleted] = await db
      .delete(customer)
      .where(and(eq(customer.id, id), eq(customer.businessId, membership.businessId)))
      .returning({ id: customer.id });

    if (!deleted) {
      return NextResponse.json({ message: "Pelanggan tidak ditemukan." }, { status: 404 });
    }

    // Riwayat penjualan dipertahankan: FK sale.customer_id memakai ON DELETE SET NULL,
    // sehingga laporan keuangan tidak ikut hilang.
    return NextResponse.json({ message: "Pelanggan berhasil dihapus." });
  } catch (error) {
    console.error("Failed to delete customer", error);
    return NextResponse.json({ message: "Gagal menghapus pelanggan." }, { status: 500 });
  }
}
