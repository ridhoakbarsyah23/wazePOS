import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPayment } from "@/db/schema";

export type PendingPaymentNotificationCounts = {
  pendingTotal: number;
  pendingReady: number;
  updatedAt: string;
};

/**
 * Hitung pembayaran yang menunggu perhatian admin.
 * `pendingReady` = status pending dan sudah ada bukti transfer (siap disetujui).
 */
export async function getPendingPaymentNotificationCounts(): Promise<PendingPaymentNotificationCounts> {
  const [row] = await db
    .select({
      pendingTotal: sql<number>`count(*) filter (where ${subscriptionPayment.status} = 'pending')::int`,
      pendingReady: sql<number>`count(*) filter (where ${subscriptionPayment.status} = 'pending' and ${subscriptionPayment.transferProofData} is not null)::int`,
    })
    .from(subscriptionPayment);

  return {
    pendingTotal: Number(row?.pendingTotal ?? 0),
    pendingReady: Number(row?.pendingReady ?? 0),
    updatedAt: new Date().toISOString(),
  };
}
