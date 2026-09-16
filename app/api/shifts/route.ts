import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cashShift, outlet, sale } from "@/db/schema";
import { getBusinessSubscription, getMembership } from "@/lib/auth-session";
import { hasPlanFeature } from "@/lib/plans";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });
  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  const currentSubscription = await getBusinessSubscription(membership.businessId);
  if (!hasPlanFeature(currentSubscription?.plan, "shiftManagement")) {
    return NextResponse.json({ message: "Manajemen shift tersedia pada Paket Bisnis.", code: "PLAN_FEATURE_REQUIRED" }, { status: 403 });
  }

  let body: { action?: unknown; outletId?: unknown; amount?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format shift tidak valid." }, { status: 400 });
  }
  const action = body.action;
  const outletId = typeof body.outletId === "string" ? body.outletId : "";
  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  if (!outletId || !Number.isInteger(amount) || amount < 0 || amount > 2_000_000_000) {
    return NextResponse.json({ message: "Gerai dan jumlah kas wajib valid." }, { status: 422 });
  }

  const [ownedOutlet] = await db.select({ id: outlet.id }).from(outlet)
    .where(and(eq(outlet.id, outletId), eq(outlet.businessId, membership.businessId))).limit(1);
  if (!ownedOutlet) return NextResponse.json({ message: "Gerai tidak valid." }, { status: 422 });

  if (action === "open") {
    const [existing] = await db.select({ id: cashShift.id }).from(cashShift)
      .where(and(eq(cashShift.businessId, membership.businessId), eq(cashShift.cashierId, session.user.id), eq(cashShift.status, "open"))).limit(1);
    if (existing) return NextResponse.json({ message: "Shift Anda masih terbuka." }, { status: 409 });
    try {
      const [created] = await db.insert(cashShift).values({
        id: randomUUID(), businessId: membership.businessId, outletId, cashierId: session.user.id, openingCash: amount, status: "open",
      }).returning({ id: cashShift.id });
      return NextResponse.json({ message: "Shift berhasil dibuka.", id: created.id }, { status: 201 });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        return NextResponse.json({ message: "Shift Anda masih terbuka." }, { status: 409 });
      }
      console.error("Failed to open shift", error);
      return NextResponse.json({ message: "Shift gagal dibuka." }, { status: 500 });
    }
  }

  if (action === "close") {
    const [current] = await db.select({ id: cashShift.id, openingCash: cashShift.openingCash }).from(cashShift)
      .where(and(eq(cashShift.businessId, membership.businessId), eq(cashShift.cashierId, session.user.id), eq(cashShift.outletId, outletId), eq(cashShift.status, "open"))).limit(1);
    if (!current) return NextResponse.json({ message: "Tidak ada shift terbuka." }, { status: 409 });
    const [sales] = await db.select({ total: sql<number>`coalesce(sum(${sale.total}), 0)::int` }).from(sale)
      .where(and(eq(sale.cashShiftId, current.id), eq(sale.status, "completed"), eq(sale.paymentMethod, "cash")));
    const expectedCash = Number(current.openingCash) + Number(sales?.total ?? 0);
    await db.update(cashShift).set({ closingCash: amount, expectedCash, status: "closed", closedAt: new Date(), updatedAt: new Date() }).where(eq(cashShift.id, current.id));
    return NextResponse.json({ message: "Shift berhasil ditutup.", expectedCash, difference: amount - expectedCash });
  }

  return NextResponse.json({ message: "Aksi shift tidak dikenal." }, { status: 400 });
}
