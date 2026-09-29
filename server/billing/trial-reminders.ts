import "server-only";

import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { business, businessMember, subscription, user } from "@/db/schema";
import {
  getUpgradeUrl,
  sendTrialEndingEmail,
} from "@/server/email/trial-ending-email";

export type TrialReminderRecipient = {
  businessId: string;
  businessName: string;
  trialEndsAt: Date;
  ownerEmail: string;
  ownerName: string | null;
};

function dueConditions(now: Date) {
  return and(
    eq(subscription.status, "trialing"),
    isNull(subscription.trialReminderSentAt),
    gt(subscription.trialEndsAt, now),
    lte(subscription.trialEndsAt, new Date(now.getTime() + 86_400_000)),
  );
}

/**
 * Cari langganan trial yang memenuhi syarat pengingat (belum dikirim, status
 * trialing, belum berakhir, tersisa maksimal 24 jam) beserta email owner bisnisnya.
 */
export async function findTrialRemindersDue(now = new Date()): Promise<TrialReminderRecipient[]> {
  const rows = await db
    .select({
      businessId: business.id,
      businessName: business.name,
      trialEndsAt: subscription.trialEndsAt,
      ownerEmail: user.email,
      ownerName: user.name,
    })
    .from(subscription)
    .innerJoin(business, eq(business.id, subscription.businessId))
    .innerJoin(
      businessMember,
      and(eq(businessMember.businessId, business.id), eq(businessMember.role, "owner")),
    )
    .innerJoin(user, eq(user.id, businessMember.userId))
    .where(dueConditions(now));

  return rows.map((row) => ({
    businessId: row.businessId,
    businessName: row.businessName,
    trialEndsAt: row.trialEndsAt,
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
  }));
}

/**
 * Kirim pengingat untuk semua penerima yang jatuh tempo, tandai
 * `trial_reminder_sent_at` per langganan, dan ringkas hasilnya.
 */
export async function sendTrialReminders(
  options: { now?: Date } = {},
): Promise<{ sent: number; failed: number; skipped: number }> {
  const sentAt = options.now ?? new Date();
  const recipients = await findTrialRemindersDue(sentAt);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    try {
      const delivered = await db.transaction(async (tx) => {
        // Update mengunci baris hingga transaksi selesai; kegagalan otomatis rollback.
        const claimed = await tx
          .update(subscription)
          .set({ trialReminderSentAt: sentAt, updatedAt: sentAt })
          .where(
            and(
              eq(subscription.businessId, recipient.businessId),
              eq(subscription.trialEndsAt, recipient.trialEndsAt),
              dueConditions(sentAt),
            ),
          )
          .returning({ id: subscription.id });

        if (claimed.length === 0) return false;

        await sendTrialEndingEmail({
          recipient: recipient.ownerEmail,
          recipientName: recipient.ownerName,
          businessName: recipient.businessName,
          trialEndsAt: recipient.trialEndsAt,
          upgradeUrl: getUpgradeUrl(),
          idempotencyKey: `trial-ending/${claimed[0].id}/${recipient.trialEndsAt.toISOString()}`,
        });
        return true;
      });
      if (delivered) sent += 1;
      else skipped += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed, skipped };
}
