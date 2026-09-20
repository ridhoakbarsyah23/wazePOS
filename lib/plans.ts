export const planIds = ["tumbuh", "bisnis"] as const;

export type PlanId = (typeof planIds)[number];

export type PlanLimits = {
  maxOutlets: number;
  maxStaff: number;
  maxProducts: number;
};

export type PlanFeature =
  | "qrisPayments"
  | "allPaymentMethods"
  | "exportReports"
  | "unlimitedStaff"
  | "unlimitedProducts"
  | "multiOutlet"
  | "shiftManagement";

export type PlanConfig = {
  name: string;
  description: string;
  annualPrice: number;
  limits: PlanLimits;
  features: Record<PlanFeature, boolean>;
};

export const plans: Record<PlanId, PlanConfig> = {
  tumbuh: {
    name: "Tumbuh",
    description: "Kapasitas operasional inti untuk usaha mandiri dan UMKM.",
    annualPrice: 450_000,
    limits: {
      maxOutlets: 1,
      maxStaff: 2,
      maxProducts: 100,
    },
    features: {
      qrisPayments: false,
      allPaymentMethods: false,
      exportReports: false,
      unlimitedStaff: false,
      unlimitedProducts: false,
      multiOutlet: false,
      shiftManagement: false,
    },
  },
  bisnis: {
    name: "Bisnis",
    description: "Kapasitas lebih besar dan metode pembayaran tambahan untuk usaha berkembang.",
    annualPrice: 950_000,
    limits: {
      maxOutlets: 5,
      maxStaff: 9999,
      maxProducts: 9999,
    },
    features: {
      qrisPayments: false,
      allPaymentMethods: true,
      exportReports: true,
      unlimitedStaff: true,
      unlimitedProducts: true,
      multiOutlet: true,
      shiftManagement: true,
    },
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && planIds.includes(value as PlanId);
}

export function normalizePlan(value: unknown): PlanId {
  return isPlanId(value) ? value : "tumbuh";
}

export function getPlanConfig(plan: unknown): PlanConfig {
  return plans[normalizePlan(plan)];
}

export function getPlanLimits(plan: unknown): PlanLimits {
  return getPlanConfig(plan).limits;
}

export function hasPlanFeature(plan: unknown, feature: PlanFeature | string): boolean {
  const config = getPlanConfig(plan);
  if (feature in config.features) {
    return config.features[feature as PlanFeature];
  }
  // Backwards compatibility for legacy feature flags
  if (feature === "nonCashPayments") return config.features.allPaymentMethods;
  if (feature === "staffManagement") return true;
  return false;
}

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "cancelled";

export type SubscriptionData = {
  status: SubscriptionStatus;
  trialEndsAt: Date | string;
  currentPeriodEnd?: Date | string | null;
  plan?: string | null;
} | null;

export type SubscriptionDetails = {
  isValid: boolean;
  isTrialing: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  message: string;
};

export function getSubscriptionStatusDetails(subscription: SubscriptionData): SubscriptionDetails {
  if (!subscription) {
    return {
      isValid: false,
      isTrialing: false,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      message: "Profil langganan tidak ditemukan.",
    };
  }

  const now = Date.now();

  if (subscription.status === "active") {
    if (subscription.currentPeriodEnd) {
      const endMs = new Date(subscription.currentPeriodEnd).getTime();
      if (endMs <= now) {
        return {
          isValid: false,
          isTrialing: false,
          isActive: false,
          isExpired: true,
          daysRemaining: 0,
          message: "Masa aktif paket langganan Anda telah berakhir.",
        };
      }
      const days = Math.ceil((endMs - now) / (1000 * 60 * 60 * 24));
      return {
        isValid: true,
        isTrialing: false,
        isActive: true,
        isExpired: false,
        daysRemaining: days,
        message: `Paket aktif hingga ${new Date(subscription.currentPeriodEnd).toLocaleDateString("id-ID")}.`,
      };
    }

    return {
      isValid: true,
      isTrialing: false,
      isActive: true,
      isExpired: false,
      daysRemaining: 365,
      message: "Paket langganan aktif.",
    };
  }

  if (subscription.status === "trialing") {
    const trialEndMs = new Date(subscription.trialEndsAt).getTime();
    if (trialEndMs <= now) {
      return {
        isValid: false,
        isTrialing: false,
        isActive: false,
        isExpired: true,
        daysRemaining: 0,
        message: "Masa uji coba (trial) gratis 14 hari Anda telah berakhir.",
      };
    }

    const days = Math.max(1, Math.ceil((trialEndMs - now) / (1000 * 60 * 60 * 24)));
    return {
      isValid: true,
      isTrialing: true,
      isActive: false,
      isExpired: false,
      daysRemaining: days,
      message: `Masa uji coba gratis tersisa ${days} hari.`,
    };
  }

  return {
    isValid: false,
    isTrialing: false,
    isActive: false,
    isExpired: true,
    daysRemaining: 0,
    message: subscription.status === "past_due"
      ? "Pembayaran langganan tertunda."
      : "Langganan telah dibatalkan.",
  };
}
