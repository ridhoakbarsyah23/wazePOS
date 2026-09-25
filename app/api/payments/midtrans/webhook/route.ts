import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { subscription, subscriptionPayment } from "@/db/schema";
import { isMidtransConfigured, verifyMidtransSignature } from "@/lib/billing/midtrans";

const notificationSchema = z.object({
  order_id: z.string().min(1).max(50),
  status_code: z.string().min(1).max(10),
  gross_amount: z.string().min(1).max(30),
  signature_key: z.string().min(1).max(256),
  transaction_status: z.string().min(1).max(40),
  transaction_id: z.string().max(100).optional(),
  payment_type: z.string().max(50).optional(),
  fraud_status: z.string().max(30).optional(),
  currency: z.string().max(10).optional(),
});

export async function POST(request: Request) {
  if (!isMidtransConfigured()) return NextResponse.json({ message: "Midtrans belum dikonfigurasi." }, { status: 503 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Notifikasi tidak valid." }, { status: 400 });
  }

  const parsed = notificationSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: "Notifikasi tidak lengkap." }, { status: 422 });
  const notification = parsed.data;
  if (!verifyMidtransSignature({ orderId: notification.order_id, statusCode: notification.status_code, grossAmount: notification.gross_amount, signatureKey: notification.signature_key })) {
    return NextResponse.json({ message: "Signature tidak valid." }, { status: 401 });
  }

  const [payment] = await db.select().from(subscriptionPayment).where(eq(subscriptionPayment.providerOrderId, notification.order_id)).limit(1);
  if (!payment) return NextResponse.json({ message: "Pembayaran tidak ditemukan." }, { status: 404 });
  if (notification.currency && notification.currency !== "IDR") return NextResponse.json({ message: "Mata uang tidak sesuai." }, { status: 422 });
  if (Number(notification.gross_amount) !== payment.amount) return NextResponse.json({ message: "Nominal pembayaran tidak sesuai." }, { status: 422 });

  const transactionStatus = notification.transaction_status.toLowerCase();
  const fraudAccepted = !notification.fraud_status || notification.fraud_status.toLowerCase() === "accept";
  const paid = notification.status_code === "200" && fraudAccepted && (transactionStatus === "settlement" || transactionStatus === "capture");
  const nextStatus = paid
    ? "paid"
    : transactionStatus === "expire"
      ? "expired"
      : transactionStatus === "refund"
        ? "refunded"
        : ["deny", "cancel", "failure"].includes(transactionStatus)
          ? "failed"
          : "pending";

  if (payment.status === "refunded" || (payment.status === "paid" && nextStatus !== "refunded")) {
    return NextResponse.json({ received: true });
  }

  const receivedAt = new Date();
  await db.transaction(async (tx) => {
    const paymentUpdateWhere = nextStatus === "refunded"
      ? and(eq(subscriptionPayment.id, payment.id), eq(subscriptionPayment.status, "paid"))
      : and(eq(subscriptionPayment.id, payment.id), ne(subscriptionPayment.status, "paid"), ne(subscriptionPayment.status, "refunded"));
    const [updatedPayment] = await tx
      .update(subscriptionPayment)
      .set({
        status: nextStatus,
        providerTransactionId: notification.transaction_id ?? payment.providerTransactionId,
        providerPaymentType: notification.payment_type ?? payment.providerPaymentType,
        paidAt: paid ? receivedAt : payment.paidAt,
        updatedAt: receivedAt,
      })
      .where(paymentUpdateWhere)
      .returning({ id: subscriptionPayment.id });

    if (!updatedPayment) return;
    if (paid) {
      const periodEnd = new Date(receivedAt);
      periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
      await tx.update(subscription).set({
        plan: payment.plan,
        status: "active",
        currentPeriodStart: receivedAt,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: receivedAt,
      }).where(and(eq(subscription.id, payment.subscriptionId), eq(subscription.businessId, payment.businessId)));
    } else if (nextStatus === "refunded" && payment.status === "paid") {
      await tx.update(subscription).set({ status: "cancelled", cancelAtPeriodEnd: false, updatedAt: receivedAt }).where(eq(subscription.id, payment.subscriptionId));
    }
  });

  return NextResponse.json({ received: true });
}
