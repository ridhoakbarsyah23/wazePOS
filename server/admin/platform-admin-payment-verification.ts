import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { business, businessMember, subscription, subscriptionPayment, user } from "@/db/schema";
import { recordPlatformAdminAudit } from "@/server/admin/platform-admin-audit";
import {
  getPaymentVerificationEmailConfig,
  getSubscriptionUrl,
  sendPaymentVerificationEmail,
} from "@/server/email/payment-verification-email";
import type { VerifyBankTransferInput } from "@/shared/validation/subscription";

export type VerifyBankTransferResult =
  | { ok: true; status: "paid" | "failed"; emailSent: boolean; emailSkipped?: "no-owner" | "no-config" }
  | { ok: false; status: number; message: string };

type VerifiedPayment = typeof subscriptionPayment.$inferSelect;

async function notifyOwnerOfVerification(
  payment: VerifiedPayment,
  decision: "approve" | "reject",
  note: string | undefined,
): Promise<{ emailSent: boolean; emailSkipped?: "no-owner" | "no-config" }> {
  const [owner] = await db
    .select({
      email: user.email,
      name: user.name,
      businessName: business.name,
    })
    .from(businessMember)
    .innerJoin(business, eq(business.id, businessMember.businessId))
    .innerJoin(user, eq(user.id, businessMember.userId))
    .where(and(eq(businessMember.businessId, payment.businessId), eq(businessMember.role, "owner")))
    .orderBy(asc(businessMember.createdAt))
    .limit(1);

  if (!owner?.email) return { emailSent: false, emailSkipped: "no-owner" };
  if (!getPaymentVerificationEmailConfig()) return { emailSent: false, emailSkipped: "no-config" };

  try {
    await sendPaymentVerificationEmail({
      recipient: owner.email,
      recipientName: owner.name,
      businessName: owner.businessName,
      plan: payment.plan,
      amount: payment.amount,
      orderId: payment.providerOrderId,
      decision,
      verificationNote: note ?? null,
      subscriptionUrl: getSubscriptionUrl(),
      idempotencyKey: `payment-verification/${payment.id}`,
    });
    return { emailSent: true };
  } catch (error) {
    // Status verifikasi sudah tersimpan; kegagalan email tidak boleh membatalkan keputusan admin.
    console.error(
      "[PAYMENT_VERIFICATION_EMAIL_FAILED]",
      error instanceof Error ? error.message : "Unknown email error",
    );
    return { emailSent: false };
  }
}

/**
 * Verifikasi pembayaran transfer bank oleh Dashboard Admin.
 * Approve mengaktifkan subscription 1 tahun; reject menandai gagal.
 * Pembaruan bersifat idempotent: hanya pembayaran `pending` yang diproses.
 */
export async function verifyBankTransferPayment(
  input: VerifyBankTransferInput,
  actor: { id: string; email: string; name?: string | null },
): Promise<VerifyBankTransferResult> {
  const [payment] = await db
    .select()
    .from(subscriptionPayment)
    .where(eq(subscriptionPayment.id, input.paymentId))
    .limit(1);

  if (!payment) return { ok: false, status: 404, message: "Pembayaran tidak ditemukan." };
  if (payment.status !== "pending") {
    return { ok: false, status: 409, message: "Pembayaran sudah diverifikasi sebelumnya." };
  }
  if (input.decision === "approve" && !payment.transferProofData) {
    return { ok: false, status: 422, message: "Belum ada bukti transfer untuk pembayaran ini." };
  }

  const now = new Date();

  if (input.decision === "reject") {
    const [updated] = await db
      .update(subscriptionPayment)
      .set({
        status: "failed",
        verifiedBy: actor.email,
        verifiedAt: now,
        verificationNote: input.note ?? null,
        updatedAt: now,
      })
      .where(and(eq(subscriptionPayment.id, payment.id), eq(subscriptionPayment.status, "pending")))
      .returning({ id: subscriptionPayment.id });

    if (!updated) return { ok: false, status: 409, message: "Pembayaran sudah diverifikasi sebelumnya." };

    await recordPlatformAdminAudit({
      action: "payment_verified",
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name ?? null,
      businessId: payment.businessId,
      entityType: "payment",
      entityId: payment.id,
      metadata: {
        decision: "reject",
        plan: payment.plan,
        amount: payment.amount,
        orderId: payment.providerOrderId,
        note: input.note ?? null,
      },
    });

    const email = await notifyOwnerOfVerification(payment, "reject", input.note);

    return { ok: true, status: "failed", emailSent: email.emailSent, emailSkipped: email.emailSkipped };
  }

  const periodEnd = new Date(now);
  periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);

  const activated = await db.transaction(async (tx) => {
    const [updatedPayment] = await tx
      .update(subscriptionPayment)
      .set({
        status: "paid",
        verifiedBy: actor.email,
        verifiedAt: now,
        verificationNote: input.note ?? null,
        paidAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(subscriptionPayment.id, payment.id),
          eq(subscriptionPayment.status, "pending"),
        ),
      )
      .returning({ id: subscriptionPayment.id });

    if (!updatedPayment) return false;

    await tx
      .update(subscription)
      .set({
        plan: payment.plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      })
      .where(
        and(eq(subscription.id, payment.subscriptionId), eq(subscription.businessId, payment.businessId)),
      );

    return true;
  });

  if (!activated) return { ok: false, status: 409, message: "Pembayaran sudah diverifikasi sebelumnya." };

  await recordPlatformAdminAudit({
    action: "payment_verified",
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name ?? null,
    businessId: payment.businessId,
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      decision: "approve",
      plan: payment.plan,
      amount: payment.amount,
      orderId: payment.providerOrderId,
      note: input.note ?? null,
    },
  });

  const email = await notifyOwnerOfVerification(payment, "approve", input.note);

  return { ok: true, status: "paid", emailSent: email.emailSent, emailSkipped: email.emailSkipped };
}
