import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { cashExpense, outlet } from "@/db/schema";
import { isMissingSchemaError } from "@/server/db/schema-errors";
import { getBusinessSubscription, getMembership } from "@/server/auth/auth-session";
import { hasPlanFeature } from "@/shared/billing/plans";
import { auth } from "@/server/auth/auth";
import { canManageBusiness } from "@/server/auth/auth-session";
import { checkRateLimit, rateLimitResponse } from "@/server/rate-limit";
import { expenseSchema } from "@/shared/validation/expense";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Sesi Anda sudah berakhir. Silakan masuk kembali." }, { status: 401 });
  }

  const membership = await getMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  }

  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Hanya Owner atau Admin yang boleh mencatat pengeluaran." }, { status: 403 });
  }

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  if (!hasPlanFeature(currentSubscription?.plan, "cashflow")) {
    return NextResponse.json(
      { message: "Arus kas tersedia pada Paket Bisnis.", code: "PLAN_FEATURE_REQUIRED" },
      { status: 403 },
    );
  }

  const rate = checkRateLimit({ key: `expenses:${session.user.id}`, limit: 60, windowSeconds: 60 });
  if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format pengeluaran tidak valid." }, { status: 400 });
  }

  const parsed = expenseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Periksa data pengeluaran." }, { status: 422 });
  }

  const [selectedOutlet] = await db
    .select({ id: outlet.id })
    .from(outlet)
    .where(and(eq(outlet.id, parsed.data.outletId), eq(outlet.businessId, membership.businessId)))
    .limit(1);

  if (!selectedOutlet) {
    return NextResponse.json({ message: "Gerai tidak ditemukan." }, { status: 422 });
  }

  // Batas tanggal: tidak boleh lebih dari 1 hari ke depan (zona WIB toleran).
  const spentAt = parsed.data.spentAt ? new Date(parsed.data.spentAt) : new Date();
  if (Number.isNaN(spentAt.getTime())) {
    return NextResponse.json({ message: "Tanggal pengeluaran tidak valid." }, { status: 422 });
  }
  if (spentAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return NextResponse.json({ message: "Tanggal pengeluaran tidak boleh di masa depan." }, { status: 422 });
  }

  try {
    const id = randomUUID();
    await db.insert(cashExpense).values({
      id,
      businessId: membership.businessId,
      outletId: parsed.data.outletId,
      createdById: session.user.id,
      category: parsed.data.category,
      amount: parsed.data.amount,
      note: parsed.data.note ?? null,
      spentAt,
    });

    return NextResponse.json(
      { id, message: "Pengeluaran berhasil dicatat." },
      { status: 201 },
    );
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.error("Failed to create expense: tabel cash_expense belum dimigrasi.", error);
      return NextResponse.json(
        { message: "Fitur uang keluar belum aktif. Jalankan migrasi database terbaru." },
        { status: 503 },
      );
    }
    console.error("Failed to create expense", error);
    return NextResponse.json({ message: "Pengeluaran gagal disimpan. Silakan coba lagi." }, { status: 500 });
  }
}
