import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { outlet } from "@/db/schema";
import { auth } from "@/lib/auth";
import { canManageBusiness, getMembership } from "@/lib/auth-session";
import { outletSchema } from "@/lib/validation/catalog";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });

  const outlets = await db
    .select({
      id: outlet.id,
      name: outlet.name,
      address: outlet.address,
    })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId))
    .orderBy(outlet.name);

  return NextResponse.json({ outlets });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki izin mengelola gerai." }, { status: 403 });
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

  try {
    const id = randomUUID();
    await db.insert(outlet).values({
      id,
      businessId: membership.businessId,
      name: parsed.data.name,
      address: parsed.data.address || null,
    });

    return NextResponse.json({
      message: `Gerai "${parsed.data.name}" berhasil ditambahkan.`,
      outlet: { id, name: parsed.data.name, address: parsed.data.address || null },
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create outlet", error);
    return NextResponse.json({ message: "Gagal menyimpan data gerai." }, { status: 500 });
  }
}
