import { randomUUID } from "node:crypto";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { customer, sale } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { getBusinessSubscription, getMembership } from "@/lib/auth/auth-session";
import { getMaxCustomers } from "@/lib/billing/plans";
import { customerSchema } from "@/lib/validation/customer";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";

  const rows = await db
    .select({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      note: customer.note,
      createdAt: customer.createdAt,
      transactionCount: sql<number>`count(${sale.id})::int`,
      totalSpent: sql<number>`coalesce(sum(case when ${sale.status} = 'completed' then ${sale.total} else 0 end), 0)::int`,
      lastVisitAt: sql<Date | null>`max(${sale.createdAt})`,
    })
    .from(customer)
    .leftJoin(
      sale,
      and(eq(sale.customerId, customer.id), eq(sale.businessId, membership.businessId)),
    )
    .where(
      and(
        eq(customer.businessId, membership.businessId),
        ...(query
          ? [
              or(
                ilike(customer.name, `%${query}%`),
                ilike(customer.phone, `%${query}%`),
                ilike(customer.email, `%${query}%`),
              ),
            ]
          : []),
      ),
    )
    .groupBy(customer.id)
    .orderBy(customer.name);

  return NextResponse.json({ customers: rows, query });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  // Kasir pun diizinkan menambah pelanggan: pendaftaran member terjadi langsung di kasir (POS).

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

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  const maxCustomers = getMaxCustomers(currentSubscription?.plan);
  if (maxCustomers < 9999) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customer)
      .where(eq(customer.businessId, membership.businessId));
    if (count >= maxCustomers) {
      return NextResponse.json(
        {
          message: `Kapasitas daftar pelanggan untuk paket Anda sudah penuh (maksimal ${maxCustomers} pelanggan).`,
          code: "PLAN_LIMIT_REACHED",
        },
        { status: 403 },
      );
    }
  }

  try {
    const id = randomUUID();
    const [created] = await db
      .insert(customer)
      .values({
        id,
        businessId: membership.businessId,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        note: parsed.data.note || null,
      })
      .returning({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        note: customer.note,
        createdAt: customer.createdAt,
      });

    // Bentuk respons = CustomerListItem di UI: pelanggan baru memiliki nol
    // transaksi sehingga kartu di dashboard pelanggan bisa langsung dirender.
    return NextResponse.json(
      {
        message: `Pelanggan "${created.name}" berhasil ditambahkan.`,
        customer: {
          ...created,
          transactionCount: 0,
          totalSpent: 0,
          lastVisitAt: null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { message: "Nomor telepon tersebut sudah terdaftar untuk pelanggan lain." },
        { status: 409 },
      );
    }
    console.error("Failed to create customer", error);
    return NextResponse.json({ message: "Pelanggan belum berhasil disimpan." }, { status: 500 });
  }
}
