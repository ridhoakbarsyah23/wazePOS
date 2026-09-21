export const planIds = ["tumbuh", "bisnis"] as const;

export type PlanId = (typeof planIds)[number];

export type PlanLimits = {
  maxOutlets: number;
  maxStaff: number;
  maxProducts: number;
};

export type PlanFeature =
  | "cashSales"
  | "productCatalog"
  | "inventoryStock"
  | "salesHistory"
  | "receiptPrinting"
  | "onscreenReports"
  | "staffManagement"
  | "roleBasedAccess"
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
      cashSales: true,
      productCatalog: true,
      inventoryStock: true,
      salesHistory: true,
      receiptPrinting: true,
      onscreenReports: true,
      staffManagement: true,
      roleBasedAccess: true,
      qrisPayments: false,
      allPaymentMethods: false,
      exportReports: false,
      unlimitedStaff: false,
      unlimitedProducts: false,
      multiOutlet: false,
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
      cashSales: true,
      productCatalog: true,
      inventoryStock: true,
      salesHistory: true,
      receiptPrinting: true,
      onscreenReports: true,
      staffManagement: true,
      roleBasedAccess: true,
      qrisPayments: false,
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
  return false;
}

export function formatPlanAnnualPrice(plan: unknown): string {
  const amount = getPlanConfig(plan).annualPrice;
  return `Rp${new Intl.NumberFormat("id-ID").format(amount)}`;
}

export type MarketingPlanCard = {
  id: PlanId;
  name: string;
  description: string;
  price: string;
  priceNote: string;
  features: string[];
  cta: string;
  popular: boolean;
};

export type PlanFeatureComparisonGroup = {
  category: string;
  items: Array<{
    name: string;
    detail: string;
    availability: Record<PlanId, boolean>;
  }>;
};

function formatOutletLimit(plan: PlanId): string {
  const config = plans[plan];
  if (config.features.multiOutlet) return `Hingga ${config.limits.maxOutlets} gerai / multi-cabang`;
  return `Maksimal ${config.limits.maxOutlets} gerai aktif`;
}

function formatStaffLimit(plan: PlanId): string {
  const config = plans[plan];
  if (config.features.unlimitedStaff) return "Akun staf kasir & admin tanpa batas";
  return `Maksimal ${config.limits.maxStaff} akun staf (Owner + Kasir)`;
}

function formatProductLimit(plan: PlanId): string {
  const config = plans[plan];
  if (config.features.unlimitedProducts) return "Katalog produk tanpa batas";
  return `Hingga ${config.limits.maxProducts} produk aktif`;
}

export function getMarketingPlanFeatures(plan: PlanId): string[] {
  const config = plans[plan];

  if (plan === "bisnis") {
    return [
      `Seluruh fitur Paket ${plans.tumbuh.name}`,
      ...(config.features.allPaymentMethods ? ["Pembayaran tunai, kartu debit & kredit EDC"] : []),
      ...(config.features.exportReports ? ["Ekspor laporan penjualan Excel"] : []),
      formatOutletLimit(plan),
      formatStaffLimit(plan),
      formatProductLimit(plan),
    ];
  }

  return [
    formatOutletLimit(plan),
    formatStaffLimit(plan),
    formatProductLimit(plan),
    ...(config.features.cashSales ? ["Pembayaran kasir tunai"] : []),
    ...(config.features.inventoryStock ? ["Stok otomatis & peringatan stok menipis"] : []),
    ...(config.features.onscreenReports ? ["Laporan penjualan harian di layar"] : []),
    ...(config.features.receiptPrinting ? ["Cetak struk kasir 58 mm / 80 mm"] : []),
  ];
}

export function getMarketingPlanCards(): MarketingPlanCard[] {
  return planIds.map((id) => {
    const config = plans[id];
    return {
      id,
      name: config.name,
      description: config.description,
      price: formatPlanAnnualPrice(id),
      priceNote: "Ditagihkan satu kali setiap tahun",
      features: getMarketingPlanFeatures(id),
      cta: `Pilih Paket ${config.name}`,
      popular: id === "tumbuh",
    };
  });
}

export function getPlanFeatureComparison(): PlanFeatureComparisonGroup[] {
  const availability = (feature: PlanFeature): Record<PlanId, boolean> => ({
    tumbuh: hasPlanFeature("tumbuh", feature),
    bisnis: hasPlanFeature("bisnis", feature),
  });

  return [
    {
      category: "Operasional inti",
      items: [
        { name: "Kasir transaksi tunai", detail: "Melayani transaksi kasir harian dan menghitung kembalian.", availability: availability("cashSales") },
        { name: "Katalog produk, SKU, & varian", detail: `Hingga ${plans.tumbuh.limits.maxProducts} produk di Paket Tumbuh, tanpa batas di Paket Bisnis.`, availability: availability("productCatalog") },
        { name: "Stok otomatis & peringatan stok", detail: "Memantau ketersediaan barang tanpa pencatatan berulang.", availability: availability("inventoryStock") },
        {
          name: "Riwayat transaksi & cetak struk",
          detail: "Mencetak struk thermal 58mm / 80mm untuk pelanggan.",
          availability: {
            tumbuh: hasPlanFeature("tumbuh", "salesHistory") && hasPlanFeature("tumbuh", "receiptPrinting"),
            bisnis: hasPlanFeature("bisnis", "salesHistory") && hasPlanFeature("bisnis", "receiptPrinting"),
          },
        },
      ],
    },
    {
      category: "Metode pembayaran & laporan",
      items: [
        { name: "Seluruh metode pembayaran (Kartu EDC)", detail: "Menerima kartu debit dan kredit untuk pembayaran pelanggan.", availability: availability("allPaymentMethods") },
        { name: "Ekspor laporan Excel", detail: "Mengunduh laporan penjualan sesuai filter untuk analisis lanjutan.", availability: availability("exportReports") },
        { name: "Laporan penjualan di layar", detail: "Melihat performa omzet dan produk terlaris secara langsung.", availability: availability("onscreenReports") },
      ],
    },
    {
      category: "Tim & kapasitas usaha",
      items: [
        { name: "Multi-gerai / cabang usaha", detail: `${plans.tumbuh.limits.maxOutlets} gerai pada Paket Tumbuh, hingga ${plans.bisnis.limits.maxOutlets} gerai pada Paket Bisnis.`, availability: availability("multiOutlet") },
        { name: "Manajemen staf & tim kasir", detail: `Maksimal ${plans.tumbuh.limits.maxStaff} staf pada Tumbuh, staf tanpa batas pada Bisnis.`, availability: availability("staffManagement") },
        { name: "Peran hak akses terpisah", detail: "Akses khusus kasir tanpa bisa mengintip laporan rahasia toko.", availability: availability("roleBasedAccess") },
      ],
    },
  ];
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
