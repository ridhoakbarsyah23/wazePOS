import type { PlatformSubscriptionState } from "@/lib/platform-admin-access";

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
