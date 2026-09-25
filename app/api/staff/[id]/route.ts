import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { businessMember } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { canManageStaff, getBusinessSubscription, getMembership } from "@/lib/auth/auth-session";
import { hasPlanFeature } from "@/lib/billing/plans";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi telah berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership || !canManageStaff(membership.role)) {
    return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
  }
  const subscription = await getBusinessSubscription(membership.businessId);
  if (!hasPlanFeature(subscription?.plan, "staffManagement")) {
    return NextResponse.json(
      { message: "Manajemen karyawan hanya tersedia pada Paket Bisnis.", code: "PLAN_FEATURE_REQUIRED" },
      { status: 403 },
    );
  }

  const { id: memberId } = await params;
  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format request tidak valid." }, { status: 400 });
  }

  const newRole = body.role === "admin" ? "admin" : body.role === "cashier" ? "cashier" : null;
  if (!newRole) {
    return NextResponse.json({ message: "Peran harus berupa Admin atau Kasir." }, { status: 422 });
  }

  // Hanya owner yang boleh mengubah peran
  if (membership.role !== "owner") {
    return NextResponse.json({ message: "Hanya Pemilik Usaha yang dapat mengubah peran staf." }, { status: 403 });
  }

  const [targetMember] = await db
    .select({ id: businessMember.id, role: businessMember.role, userId: businessMember.userId })
    .from(businessMember)
    .where(and(eq(businessMember.id, memberId), eq(businessMember.businessId, membership.businessId)))
    .limit(1);

  if (!targetMember) {
    return NextResponse.json({ message: "Data anggota staf tidak ditemukan." }, { status: 404 });
  }

  if (targetMember.role === "owner") {
    return NextResponse.json({ message: "Peran Pemilik Usaha tidak dapat diubah." }, { status: 400 });
  }

  await db
    .update(businessMember)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(businessMember.id, memberId));

  return NextResponse.json({ message: "Peran staf berhasil diperbarui." });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi telah berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership || !canManageStaff(membership.role)) {
    return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
  }
  const subscription = await getBusinessSubscription(membership.businessId);
  if (!hasPlanFeature(subscription?.plan, "staffManagement")) {
    return NextResponse.json(
      { message: "Manajemen karyawan hanya tersedia pada Paket Bisnis.", code: "PLAN_FEATURE_REQUIRED" },
      { status: 403 },
    );
  }

  const { id: memberId } = await params;

  const [targetMember] = await db
    .select({ id: businessMember.id, role: businessMember.role, userId: businessMember.userId })
    .from(businessMember)
    .where(and(eq(businessMember.id, memberId), eq(businessMember.businessId, membership.businessId)))
    .limit(1);

  if (!targetMember) {
    return NextResponse.json({ message: "Data anggota staf tidak ditemukan." }, { status: 404 });
  }

  if (targetMember.role === "owner") {
    return NextResponse.json({ message: "Akun Pemilik Usaha tidak dapat dihapus." }, { status: 400 });
  }

  if (targetMember.userId === session.user.id) {
    return NextResponse.json({ message: "Anda tidak dapat menghapus akun sendiri." }, { status: 400 });
  }

  // Admin tidak boleh menghapus sesama Admin, hanya boleh menghapus Kasir
  if (membership.role === "admin" && targetMember.role === "admin") {
    return NextResponse.json({ message: "Admin hanya dapat mengelola staf Kasir." }, { status: 403 });
  }

  await db.delete(businessMember).where(eq(businessMember.id, memberId));

  return NextResponse.json({ message: "Akses staf berhasil dicabut." });
}
