import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { platformAdminAuditLog } from "@/db/schema";

type PlatformAdminAuditAction =
  | "business_detail_view"
  | "business_export"
  | "subscription_export"
  | "payment_export";

export async function recordPlatformAdminAudit(input: {
  action: PlatformAdminAuditAction;
  actorUserId: string;
  actorEmail: string;
  actorName?: string | null;
  businessId?: string | null;
  entityType: "business" | "business_directory" | "subscription_directory" | "payment_directory";
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(platformAdminAuditLog).values({
      id: randomUUID(),
      businessId: input.businessId ?? null,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      actorName: input.actorName ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (error) {
    // Audit logging should not make a read-only admin page unavailable.
    console.error("Failed to record Platform Admin audit event", error);
  }
}
