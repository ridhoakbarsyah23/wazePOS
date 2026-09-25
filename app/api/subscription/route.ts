import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscription } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { getBusinessSubscription, getMembership } from "@/lib/auth/auth-session";
import { plans } from "@/lib/billing/plans";
import { changeTrialPlanSchema } from "@/lib/validation/subscription";

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  if (membership.role !== "owner") {
    return NextResponse.json({ message: "Hanya pemilik usaha yang dapat mengelola paket." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format perubahan paket tidak valid." }, { status: 400 });
  }

  const parsed = changeTrialPlanSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Paket tidak valid." }, { status: 422 });
  }

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  if (!currentSubscription) return NextResponse.json({ message: "Subscription usaha tidak ditemukan." }, { status: 404 });
  if (currentSubscription.status !== "trialing" || currentSubscription.trialEndsAt <= new Date()) {
    return NextResponse.json({ message: "Paket hanya dapat diganti langsung selama masa trial aktif." }, { status: 409 });
  }
  if (currentSubscription.plan === parsed.data.plan) {
    return NextResponse.json({ message: `Paket ${plans[parsed.data.plan].name} sudah digunakan.`, plan: parsed.data.plan });
  }

  const [updated] = await db
    .update(subscription)
    .set({ plan: parsed.data.plan, updatedAt: new Date() })
    .where(and(
      eq(subscription.id, currentSubscription.id),
      eq(subscription.businessId, membership.businessId),
      eq(subscription.status, "trialing"),
    ))
    .returning({ plan: subscription.plan });

  if (!updated) return NextResponse.json({ message: "Status subscription berubah. Muat ulang halaman lalu coba kembali." }, { status: 409 });
  return NextResponse.json({ message: `Uji coba Paket ${plans[updated.plan].name} berhasil diaktifkan.`, plan: updated.plan });
}
