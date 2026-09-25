import { randomUUID } from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, businessMember, user } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { canManageStaff, getBusinessSubscription, getMembership } from "@/lib/auth/auth-session";
import { getPlanLimits, hasPlanFeature, normalizePlan, plans } from "@/lib/billing/plans";
import { checkRateLimit, rateLimitResponse } from "@/lib/shared/rate-limit";

export async function GET() {
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

  const staffList = await db
    .select({
      id: businessMember.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: businessMember.role,
      createdAt: businessMember.createdAt,
    })
    .from(businessMember)
    .innerJoin(user, eq(user.id, businessMember.userId))
    .where(eq(businessMember.businessId, membership.businessId))
    .orderBy(desc(businessMember.createdAt));

  return NextResponse.json({ staff: staffList });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi telah berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership || !canManageStaff(membership.role)) {
    return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
  }

  // Pembuatan akun itu mahal (hash + insert): batasi 10 per user per 10 menit.
  const rate = checkRateLimit({ key: `staff-create:${session.user.id}`, limit: 10, windowSeconds: 600 });
  if (!rate.ok) return rateLimitResponse(rate.retryAfterSeconds);

  const subscription = await getBusinessSubscription(membership.businessId);
  if (!hasPlanFeature(subscription?.plan, "staffManagement")) {
    return NextResponse.json(
      { message: "Manajemen karyawan hanya tersedia pada Paket Bisnis.", code: "PLAN_FEATURE_REQUIRED" },
      { status: 403 },
    );
  }
  const planLimits = getPlanLimits(subscription?.plan);
  const planName = plans[normalizePlan(subscription?.plan)].name;

  const [staffCountResult] = await db
    .select({ count: count() })
    .from(businessMember)
    .where(eq(businessMember.businessId, membership.businessId));

  const currentCount = Number(staffCountResult?.count ?? 0);
  if (currentCount >= planLimits.maxStaff) {
    return NextResponse.json(
      {
        message: `Batas kuota ${planLimits.maxStaff} akun staf pada Paket ${planName} telah tercapai. Upgrade ke Paket Bisnis untuk mengelola staf kasir tanpa batas.`,
        code: "PLAN_LIMIT_REACHED",
      },
      { status: 403 }
    );
  }

  let body: { name?: unknown; email?: unknown; password?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Format request tidak valid." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "admin" ? "admin" : body.role === "cashier" ? "cashier" : null;

  if (!name || name.length < 2 || name.length > 80) {
    return NextResponse.json({ message: "Nama karyawan wajib diisi (2-80 karakter)." }, { status: 422 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ message: "Alamat email tidak valid." }, { status: 422 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ message: "Kata sandi minimal 8 karakter." }, { status: 422 });
  }

  if (!role) {
    return NextResponse.json({ message: "Peran harus berupa Admin atau Kasir." }, { status: 422 });
  }

  // Hanya Owner yang boleh mengangkat Admin
  if (role === "admin" && membership.role !== "owner") {
    return NextResponse.json({ message: "Hanya Pemilik Usaha yang dapat menambahkan Admin." }, { status: 403 });
  }

  // Cek apakah email sudah terdaftar
  const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existingUser) {
    return NextResponse.json({ message: "Email sudah terdaftar pada sistem." }, { status: 409 });
  }

  const newUserId = randomUUID();
  const newMemberId = randomUUID();
  const createdAt = new Date();
  const hashedPassword = await hashPassword(password);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: newUserId,
        name,
        email,
        emailVerified: true,
      });

      await tx.insert(account).values({
        id: randomUUID(),
        accountId: newUserId,
        providerId: "credential",
        userId: newUserId,
        password: hashedPassword,
      });

      await tx.insert(businessMember).values({
        id: newMemberId,
        businessId: membership.businessId,
        userId: newUserId,
        role,
        createdAt,
        updatedAt: createdAt,
      });
    });

    return NextResponse.json(
      {
        message: `Karyawan ${name} (${role === "admin" ? "Admin" : "Kasir"}) berhasil ditambahkan.`,
        staff: {
          id: newMemberId,
          userId: newUserId,
          name,
          email,
          role,
          createdAt: createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Gagal menambahkan staf:", error);
    return NextResponse.json({ message: "Gagal menyimpan akun karyawan." }, { status: 500 });
  }
}
