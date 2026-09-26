import type { PlatformSubscriptionState } from "@/shared/admin/platform-admin-access";

export type PlatformAdminPlanFilter = "all" | "tumbuh" | "bisnis" | "missing";
export type PlatformAdminOnboardingFilter = "all" | "completed" | "incomplete";
export type PlatformAdminSort =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "trial_ending"
  | "activity";

export type PlatformAdminDirectoryFilters = {
  query: string;
  status: PlatformSubscriptionState | "all";
  businessType: string;
  plan: PlatformAdminPlanFilter;
  onboarding: PlatformAdminOnboardingFilter;
  registeredFrom: string;
  registeredTo: string;
  sort: PlatformAdminSort;
};

export type PlatformAdminBusiness = {
  id: string;
  name: string;
  type: string;
  onboardingCompleted: boolean;
  createdAt: Date | string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: "tumbuh" | "bisnis" | null;
  subscriptionStatus: "trialing" | "active" | "past_due" | "cancelled" | null;
  trialEndsAt: Date | string | null;
  currentPeriodEnd: Date | string | null;
  memberCount: number;
  outletCount: number;
  lastActivityAt?: Date | string | null;
  saleCount?: number;
  grossRevenue?: number;
  state: PlatformSubscriptionState;
};

export type PlatformAdminAnalytics = {
  activeMrr: number;
  totalSubscriptions: number;
  convertedSubscriptions: number;
  trialConversionRate: number;
  trialEndingSoon: number;
  activeSubscriptions: number;
  trialActive: number;
  trialExpired: number;
  pastDue: number;
  cancelled: number;
};

export type PlatformAdminSubscriptionItem = {
  id: string;
  businessId: string;
  businessName: string;
  businessType: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: "tumbuh" | "bisnis";
  status: "trialing" | "active" | "past_due" | "cancelled";
  trialEndsAt: Date | string;
  currentPeriodStart: Date | string | null;
  currentPeriodEnd: Date | string | null;
  createdAt: Date | string;
  state: PlatformSubscriptionState;
};

export type PlatformAdminSubscriptionSummary = {
  total: number;
  trialActive: number;
  trialExpired: number;
  active: number;
  expired: number;
  pastDue: number;
  cancelled: number;
  trialEndingSoon: number;
};

export type PlatformAdminPaymentItem = {
  id: string;
  businessId: string;
  businessName: string;
  ownerEmail: string | null;
  plan: "tumbuh" | "bisnis";
  amount: number;
  currency: string;
  provider: string;
  providerOrderId: string;
  providerPaymentType: string | null;
  status: "pending" | "paid" | "failed" | "expired" | "refunded";
  createdAt: Date | string;
  paidAt: Date | string | null;
};

export type PlatformAdminPaymentSummary = {
  pendingPayments: number;
  paidPayments: number;
  paidRevenue: number;
  failedPayments: number;
  expiredPayments: number;
};

export type PlatformAdminAuditLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  businessId: string | null;
  businessName: string | null;
  actorName: string | null;
  actorEmail: string;
  createdAt: Date | string;
  metadata: Record<string, unknown> | null;
};

export type PlatformAdminOutletDetail = {
  id: string;
  name: string;
  address: string | null;
  createdAt: Date | string;
};

export type PlatformAdminMemberDetail = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "cashier";
  createdAt: Date | string;
};

export type PlatformAdminPaymentDetail = {
  id: string;
  plan: "tumbuh" | "bisnis";
  amount: number;
  status: "pending" | "paid" | "failed" | "expired" | "refunded";
  provider: string;
  providerOrderId: string;
  createdAt: Date | string;
  paidAt: Date | string | null;
};

export type PlatformAdminSaleActivity = {
  id: string;
  invoiceNumber: string;
  total: number;
  status: "completed" | "voided";
  outletName: string | null;
  cashierName: string | null;
  createdAt: Date | string;
};

export type PlatformAdminAuditItem = {
  id: string;
  action: string;
  createdAt: Date | string;
  adminName: string | null;
  adminEmail: string | null;
  metadata: Record<string, unknown> | null;
};

export type PlatformAdminBusinessDetailData = {
  business: PlatformAdminBusiness;
  outlets: PlatformAdminOutletDetail[];
  members: PlatformAdminMemberDetail[];
  payments: PlatformAdminPaymentDetail[];
  activity: {
    saleCount: number;
    grossRevenue: number;
    lastSaleAt: Date | string | null;
    latestSales: PlatformAdminSaleActivity[];
  };
  auditLog: PlatformAdminAuditItem[];
};
