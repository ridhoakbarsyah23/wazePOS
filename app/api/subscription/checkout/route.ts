import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptionPayment } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { getBusinessSubscription, getMembership } from "@/server/auth/auth-session";
import { getBankTransferDestination, isBankTransferConfigured } from "@/shared/billing/bank-transfer";
import { plans } from "@/shared/billing/plans";
import { createBankTransferOrderSchema } from "@/shared/validation/subscription";

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
  const destination = getBankTransferDestination();
  if (payment.plan === selectedPlan) {
    return NextResponse.json({
      paymentId: payment.id,
      orderId: payment.providerOrderId,
      amount: payment.amount,
      destination,
      proofUploaded: Boolean(payment.transferProofData),
      reused: true,
    });
  }

  return NextResponse.json(
    {
      message: "Masih ada pembayaran paket lain yang tertunda. Selesaikan pembayaran tersebut sebelum memilih paket baru.",
    },
    { status: 409 },
  );
}

/**
 * Checkout transfer bank manual: buat pesanan `pending` berisi nominal resmi
 * dari `shared/billing/plans.ts` dan tampilkan rekening tujuan ke owner.
 * Nominal dari browser tidak pernah dipercaya; aktivasi menunggu verifikasi admin.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  if (membership.role !== "owner") return NextResponse.json({ message: "Hanya pemilik usaha yang dapat melakukan pembayaran paket." }, { status: 403 });
  if (!isBankTransferConfigured()) return NextResponse.json({ message: "Rekening pembayaran belum dikonfigurasi." }, { status: 503 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format checkout tidak valid." }, { status: 400 });
  }

  const parsed = createBankTransferOrderSchema.safeParse(payload);
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
  const destination = getBankTransferDestination();

  try {
    await db.insert(subscriptionPayment).values({
      id: paymentId,
      businessId: membership.businessId,
      subscriptionId: currentSubscription.id,
      plan: selectedPlan,
      amount,
      provider: "bank_transfer",
      providerOrderId: orderId,
      status: "pending",
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const concurrentPayment = await getPendingPayment(currentSubscription.id);
      if (concurrentPayment) return pendingPaymentResponse(concurrentPayment, selectedPlan);
    }
    console.error("Failed to prepare bank transfer payment", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ message: "Checkout belum dapat disiapkan. Silakan coba kembali." }, { status: 500 });
  }

  return NextResponse.json({
    paymentId,
    orderId,
    amount,
    destination,
    proofUploaded: false,
    reused: false,
  }, { status: 201 });
}
