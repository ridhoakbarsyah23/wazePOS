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
  | "multiOutlet";

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
      qrisPayments: true,
      allPaymentMethods: false,
      exportReports: false,
      unlimitedStaff: false,
      unlimitedProducts: false,
      multiOutlet: false,
    },
  },
  bisnis: {
    name: "Bisnis",
    description: "Kapasitas tanpa batas & seluruh metode pembayaran untuk usaha berkembang.",
    annualPrice: 950_000,
    limits: {
      maxOutlets: 5,
      maxStaff: 9999,
      maxProducts: 9999,
    },
    features: {
      qrisPayments: true,
      allPaymentMethods: true,
      exportReports: true,
      unlimitedStaff: true,
      unlimitedProducts: true,
      multiOutlet: true,
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
  if (feature === "shiftManagement") return false;
  return false;
}
