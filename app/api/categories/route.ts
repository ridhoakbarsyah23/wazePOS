import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { category, product } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { canManageBusiness, getMembership } from "@/server/auth/auth-session";
import { categorySchema } from "@/shared/validation/catalog";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });

  const categories = await db
    .select({
      id: category.id,
      name: category.name,
      productCount: sql<number>`COUNT(${product.id})::int`,
    })
    .from(category)
    .leftJoin(product, and(eq(product.categoryId, category.id), eq(product.businessId, membership.businessId)))
    .where(eq(category.businessId, membership.businessId))
    .groupBy(category.id, category.name)
    .orderBy(category.name);

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki izin mengelola kategori." }, { status: 403 });
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

  try {
    const id = randomUUID();
    await db.insert(category).values({
      id,
      businessId: membership.businessId,
      name: parsed.data.name,
    });

    return NextResponse.json({
      message: `Kategori "${parsed.data.name}" berhasil dibuat.`,
      category: { id, name: parsed.data.name, productCount: 0 },
    }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json({ message: "Kategori dengan nama tersebut sudah ada." }, { status: 409 });
    }
    console.error("Failed to create category", error);
    return NextResponse.json({ message: "Gagal menyimpan kategori." }, { status: 500 });
  }
}
