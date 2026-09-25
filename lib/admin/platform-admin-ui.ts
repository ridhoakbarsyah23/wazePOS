import type { PlatformSubscriptionState } from "@/lib/admin/platform-admin-access";

export type PlatformAdminStateMeta = {
  label: string;
  variant: "default" | "secondary" | "warning" | "destructive";
};

export const platformAdminStateMeta: Record<PlatformSubscriptionState, PlatformAdminStateMeta> = {
  trial_active: { label: "Trial aktif", variant: "default" },
  trial_expired: { label: "Trial berakhir", variant: "warning" },
  active: { label: "Berlangganan", variant: "default" },
  subscription_expired: { label: "Langganan berakhir", variant: "destructive" },
  past_due: { label: "Pembayaran tertunda", variant: "warning" },
  cancelled: { label: "Dibatalkan", variant: "destructive" },
  missing: { label: "Tanpa subscription", variant: "secondary" },
};

/**
 * Batas waktu langganan yang relevan untuk operasional admin:
 * masa trial untuk trial, akhir periode untuk langganan berbayar.
 */
export function getSubscriptionBoundary(item: {
  state: PlatformSubscriptionState;
  trialEndsAt: Date | string | null;
  currentPeriodEnd: Date | string | null;
}) {
  return item.state.startsWith("trial") ? item.trialEndsAt : item.currentPeriodEnd;
}

/**
 * Kode ramah-baca untuk operasional admin. UUID tetap menjadi primary key
 * internal agar relasi database dan endpoint tidak berubah.
 */
export function formatBusinessReference(
  id: string,
  createdAt: Date | string,
): string {
  const createdDate = new Date(createdAt);
  const datePart = Number.isNaN(createdDate.getTime())
    ? "00000000"
    : [
        createdDate.getUTCFullYear(),
        String(createdDate.getUTCMonth() + 1).padStart(2, "0"),
        String(createdDate.getUTCDate()).padStart(2, "0"),
      ].join("");
  const idPart = id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "UNKNOWN";

  return `BIZ-${datePart}-${idPart}`;
}
