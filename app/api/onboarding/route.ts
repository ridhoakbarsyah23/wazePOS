import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { business, businessMember, outlet, subscription, user } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { getMembership } from "@/server/auth/auth-session";
import { slugifyOutletName } from "@/shared/outlet-slug";
import { onboardingSchema } from "@/shared/validation/onboarding";
import { TRIAL_DURATION_DAYS } from "@/shared/billing/plans";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ message: "Sesi Anda sudah berakhir. Silakan masuk kembali." }, { status: 401 });
  }

  // Pendaftar manual wajib menyelesaikan OTP sebelum membuat profil usaha.
  if (!session.user.emailVerified) {
    return NextResponse.json(
      { message: "Verifikasi email Anda terlebih dahulu melalui kode 6 digit yang kami kirim." },
      { status: 403 },
    );
  }

  if (await getMembership(session.user.id)) {
    return NextResponse.json({ message: "Profil usaha Anda sudah tersedia." }, { status: 409 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format data tidak valid." }, { status: 400 });
  }

  const result = onboardingSchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json(
      { message: result.error.issues[0]?.message ?? "Periksa kembali data usaha Anda." },
      { status: 422 },
    );
  }

  const businessId = randomUUID();
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(business).values({
        id: businessId,
        name: result.data.businessName,
        type: result.data.businessType,
        onboardingCompleted: true,
      });
      await tx.insert(businessMember).values({
        id: randomUUID(),
        businessId,
        userId: session.user.id,
        role: "owner",
      });
      await tx.insert(outlet).values({
        id: randomUUID(),
        businessId,
        name: result.data.outletName,
        slug: slugifyOutletName(result.data.outletName),
        address: result.data.address || null,
      });
      await tx.insert(subscription).values({
        id: randomUUID(),
        businessId,
        plan: result.data.plan,
        status: "trialing",
        trialEndsAt,
      });
      // Catat persetujuan Kebijakan Privasi (checkbox onboarding, lolos
      // validasi z.literal(true) di atas) dalam transaksi yang sama agar
      // profil usaha tidak terbentuk tanpa bukti persetujuan.
      const consentAt = new Date();
      await tx
        .update(user)
        .set({ privacyAcceptedAt: consentAt, updatedAt: consentAt })
        .where(eq(user.id, session.user.id));
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json({ message: "Profil usaha Anda sudah tersedia." }, { status: 409 });
    }

    console.error("Failed to complete onboarding", error);
    return NextResponse.json(
      { message: "Profil usaha belum berhasil disimpan. Silakan coba kembali." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Profil usaha berhasil dibuat." }, { status: 201 });
}
