import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptionPayment } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { getBusinessSubscription, getMembership } from "@/server/auth/auth-session";
import { createSnapTransaction, isMidtransConfigured } from "@/server/billing/midtrans";
import { plans } from "@/shared/billing/plans";
import { changeTrialPlanSchema } from "@/shared/validation/subscription";

type PendingPayment = typeof subscriptionPayment.$inferSelect;

async function getPendingPayment(subscriptionId: string) {
  const [payment] = await db
    .select()
    .from(subscriptionPayment)
    .where(and(eq(subscriptionPayment.subscriptionId, subscriptionId), eq(subscriptionPayment.status, "pending")))
    .limit(1);
  return payment;
}

function pendingPaymentResponse(payment: PendingPayment, selectedPlan: PendingPayment["plan"]) {
  if (payment.plan === selectedPlan && payment.redirectUrl) {
    return NextResponse.json({ redirectUrl: payment.redirectUrl, orderId: payment.providerOrderId, reused: true });
  }

  return NextResponse.json(
    {
      message: payment.plan === selectedPlan
        ? "Checkout sedang disiapkan. Tunggu sebentar lalu coba kembali."
        : "Masih ada pembayaran paket lain yang tertunda. Selesaikan pembayaran tersebut sebelum memilih paket baru.",
    },
    { status: 409 },
  );
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  if (membership.role !== "owner") return NextResponse.json({ message: "Hanya pemilik usaha yang dapat melakukan pembayaran paket." }, { status: 403 });
  if (!isMidtransConfigured()) return NextResponse.json({ message: "Pembayaran Midtrans belum dikonfigurasi." }, { status: 503 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format checkout tidak valid." }, { status: 400 });
  }

  const parsed = changeTrialPlanSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Paket tidak valid." }, { status: 422 });

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  if (!currentSubscription) return NextResponse.json({ message: "Subscription usaha tidak ditemukan." }, { status: 404 });
  if (currentSubscription.status === "active") {
    return NextResponse.json({ message: "Subscription sudah aktif. Perpanjangan akan tersedia mendekati akhir periode." }, { status: 409 });
  }

  const selectedPlan = parsed.data.plan;
  const amount = plans[selectedPlan].annualPrice;
  const existingPayment = await getPendingPayment(currentSubscription.id);
  if (existingPayment) return pendingPaymentResponse(existingPayment, selectedPlan);

  const orderId = `WZP-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const paymentId = randomUUID();
  const configuredOrigin = process.env.BETTER_AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let appOrigin: string;
  try {
    appOrigin = configuredOrigin ? new URL(configuredOrigin).origin : new URL(request.url).origin;
  } catch {
    return NextResponse.json({ message: "Alamat aplikasi untuk pembayaran belum valid." }, { status: 500 });
  }

  try {
    await db.insert(subscriptionPayment).values({
      id: paymentId,
      businessId: membership.businessId,
      subscriptionId: currentSubscription.id,
      plan: selectedPlan,
      amount,
      providerOrderId: orderId,
      status: "pending",
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const concurrentPayment = await getPendingPayment(currentSubscription.id);
      if (concurrentPayment) return pendingPaymentResponse(concurrentPayment, selectedPlan);
    }
    console.error("Failed to prepare subscription payment", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ message: "Checkout belum dapat disiapkan. Silakan coba kembali." }, { status: 500 });
  }

  try {
    const snap = await createSnapTransaction({
      orderId,
      amount,
      planName: plans[selectedPlan].name,
      customerName: session.user.name,
      customerEmail: session.user.email,
      finishUrl: `${appOrigin}/subscription?payment=finish`,
    });
    await db.update(subscriptionPayment).set({ snapToken: snap.token, redirectUrl: snap.redirectUrl, updatedAt: new Date() }).where(eq(subscriptionPayment.id, paymentId));
    return NextResponse.json({ redirectUrl: snap.redirectUrl, orderId }, { status: 201 });
  } catch (error) {
    await db.update(subscriptionPayment).set({ status: "failed", updatedAt: new Date() }).where(eq(subscriptionPayment.id, paymentId));
    console.error("Failed to create Midtrans Snap transaction", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ message: "Checkout belum berhasil dibuat. Silakan coba kembali." }, { status: 502 });
  }
}
