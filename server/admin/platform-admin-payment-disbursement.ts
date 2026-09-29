import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPayment } from "@/db/schema";
import { recordPlatformAdminAudit } from "@/server/admin/platform-admin-audit";
import type { MarkPaymentDisbursedInput } from "@/shared/validation/subscription";

export type MarkPaymentDisbursedResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Menandai pembayaran `paid` sebagai sudah dicairkan ke rekening pribadi.
 * Operasi idempotent: hanya pembayaran `paid` yang belum dicairkan yang diproses.
 * Status pembayaran tidak diubah; hanya penanda pencairan yang dicatat.
 */
export async function markPaymentDisbursed(
  input: MarkPaymentDisbursedInput,
  actor: { id: string; email: string; name?: string | null },
): Promise<MarkPaymentDisbursedResult> {
  const [payment] = await db
    .select()
    .from(subscriptionPayment)
    .where(eq(subscriptionPayment.id, input.paymentId))
    .limit(1);

  if (!payment) return { ok: false, status: 404, message: "Pembayaran tidak ditemukan." };
  if (payment.status !== "paid") {
    return { ok: false, status: 409, message: "Hanya pembayaran berstatus Berhasil yang dapat dicairkan." };
  }
  if (payment.disbursedAt) {
    return { ok: false, status: 409, message: "Pembayaran ini sudah ditandai dicairkan sebelumnya." };
  }

  const now = new Date();
  const [updated] = await db
    .update(subscriptionPayment)
    .set({
      disbursedAt: now,
      disbursedBy: actor.email,
      disbursementReference: input.reference ?? null,
      disbursementNote: input.note ?? null,
      updatedAt: now,
    })
    .where(
      and(
        eq(subscriptionPayment.id, payment.id),
        eq(subscriptionPayment.status, "paid"),
      ),
    )
    .returning({ id: subscriptionPayment.id });

  if (!updated) return { ok: false, status: 409, message: "Pembayaran ini sudah ditandai dicairkan sebelumnya." };

  await recordPlatformAdminAudit({
    action: "payment_disbursed",
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name ?? null,
    businessId: payment.businessId,
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      plan: payment.plan,
      amount: payment.amount,
      reference: input.reference ?? null,
      orderId: payment.providerOrderId,
    },
  });

  return { ok: true };
}
