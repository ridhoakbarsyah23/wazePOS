import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cashExpense } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { canManageBusiness, getMembership } from "@/server/auth/auth-session";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Hanya Owner atau Admin yang boleh menghapus pengeluaran." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const [deleted] = await db
      .delete(cashExpense)
      .where(and(eq(cashExpense.id, id), eq(cashExpense.businessId, membership.businessId)))
      .returning({ id: cashExpense.id });

    if (!deleted) {
      return NextResponse.json({ message: "Pengeluaran tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Pengeluaran berhasil dihapus." });
  } catch (error) {
    console.error("Failed to delete expense", error);
    return NextResponse.json({ message: "Gagal menghapus pengeluaran." }, { status: 500 });
  }
}
