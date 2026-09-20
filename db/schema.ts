import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const business = pgTable("business", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  timezone: text("timezone").default("Asia/Jakarta").notNull(),
  currency: text("currency").default("IDR").notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  ...timestamps,
});

export const businessMember = pgTable(
  "business_member",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<"owner" | "admin" | "cashier">().default("cashier").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("business_member_business_user_idx").on(table.businessId, table.userId),
    uniqueIndex("business_member_user_id_idx").on(table.userId),
  ],
);

export const outlet = pgTable(
  "outlet",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    ...timestamps,
  },
  (table) => [
    index("outlet_business_id_idx").on(table.businessId),
    index("outlet_business_name_idx").on(table.businessId, table.name),
  ],
);

export const subscription = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    plan: text("plan").$type<"tumbuh" | "bisnis">().default("tumbuh").notNull(),
    status: text("status").$type<"trialing" | "active" | "past_due" | "cancelled">().default("trialing").notNull(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("subscription_business_id_idx").on(table.businessId)],
);

export const subscriptionPayment = pgTable(
  "subscription_payment",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull().references(() => business.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").notNull().references(() => subscription.id, { onDelete: "cascade" }),
    plan: text("plan").$type<"tumbuh" | "bisnis">().notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").default("IDR").notNull(),
    provider: text("provider").default("midtrans").notNull(),
    providerOrderId: text("provider_order_id").notNull(),
    providerTransactionId: text("provider_transaction_id"),
    providerPaymentType: text("provider_payment_type"),
    status: text("status").$type<"pending" | "paid" | "failed" | "expired" | "refunded">().default("pending").notNull(),
    snapToken: text("snap_token"),
    redirectUrl: text("redirect_url"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("subscription_payment_business_id_idx").on(table.businessId),
    index("subscription_payment_subscription_id_idx").on(table.subscriptionId),
    uniqueIndex("subscription_payment_order_id_idx").on(table.providerOrderId),
    uniqueIndex("subscription_payment_pending_subscription_idx")
      .on(table.subscriptionId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const category = pgTable(
  "category",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [
    index("category_business_id_idx").on(table.businessId),
    uniqueIndex("category_business_name_idx").on(table.businessId, table.name),
  ],
);

export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => category.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    sku: text("sku"),
    sellingPrice: integer("selling_price").notNull(),
    costPrice: integer("cost_price").default(0).notNull(),
    trackStock: boolean("track_stock").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("product_business_id_idx").on(table.businessId),
    index("product_business_active_name_idx").on(table.businessId, table.isActive, table.name),
    index("product_category_id_idx").on(table.categoryId),
    uniqueIndex("product_business_sku_idx").on(table.businessId, table.sku),
  ],
);

export const inventoryStock = pgTable(
  "inventory_stock",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlet.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
    ...timestamps,
  },
  (table) => [
    index("inventory_stock_business_id_idx").on(table.businessId),
    index("inventory_stock_outlet_id_idx").on(table.outletId),
    uniqueIndex("inventory_stock_product_outlet_idx").on(table.productId, table.outletId),
  ],
);

export const stockMovement = pgTable(
  "stock_movement",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlet.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    type: text("type").$type<"adjustment" | "sale" | "restock">().notNull(),
    quantity: integer("quantity").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    index("stock_movement_business_id_idx").on(table.businessId),
    index("stock_movement_outlet_id_idx").on(table.outletId),
    index("stock_movement_product_id_idx").on(table.productId),
    index("stock_movement_created_at_idx").on(table.createdAt),
    index("stock_movement_business_created_at_idx").on(table.businessId, table.createdAt),
  ],
);

export const cashShift = pgTable(
  "cash_shift",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull().references(() => business.id, { onDelete: "cascade" }),
    outletId: text("outlet_id").notNull().references(() => outlet.id, { onDelete: "restrict" }),
    cashierId: text("cashier_id").notNull().references(() => user.id, { onDelete: "restrict" }),
    openingCash: integer("opening_cash").notNull(),
    closingCash: integer("closing_cash"),
    expectedCash: integer("expected_cash"),
    status: text("status").$type<"open" | "closed">().default("open").notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("cash_shift_business_id_idx").on(table.businessId),
    index("cash_shift_outlet_id_idx").on(table.outletId),
    index("cash_shift_cashier_id_idx").on(table.cashierId),
    uniqueIndex("cash_shift_open_cashier_idx")
      .on(table.businessId, table.cashierId)
      .where(sql`${table.status} = 'open'`),
  ],
);

export const sale = pgTable(
  "sale",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlet.id, { onDelete: "restrict" }),
    cashierId: text("cashier_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    cashShiftId: text("cash_shift_id").references(() => cashShift.id, { onDelete: "restrict" }),
    invoiceNumber: text("invoice_number").notNull(),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").default(0).notNull(),
    total: integer("total").notNull(),
    paidAmount: integer("paid_amount").notNull(),
    changeAmount: integer("change_amount").notNull(),
    paymentMethod: text("payment_method").$type<"cash" | "qris" | "debit" | "credit">().notNull(),
    status: text("status").$type<"completed" | "voided">().default("completed").notNull(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedById: text("voided_by_id").references(() => user.id, { onDelete: "restrict" }),
    voidReason: text("void_reason"),
    ...timestamps,
  },
  (table) => [
    index("sale_business_id_idx").on(table.businessId),
    index("sale_outlet_id_idx").on(table.outletId),
    index("sale_cash_shift_id_idx").on(table.cashShiftId),
    index("sale_created_at_idx").on(table.createdAt),
    index("sale_business_status_created_at_idx").on(table.businessId, table.status, table.createdAt),
    index("sale_business_outlet_created_at_idx").on(table.businessId, table.outletId, table.createdAt),
    uniqueIndex("sale_business_invoice_idx").on(table.businessId, table.invoiceNumber),
  ],
);

export const saleItem = pgTable(
  "sale_item",
  {
    id: text("id").primaryKey(),
    saleId: text("sale_id")
      .notNull()
      .references(() => sale.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    unitCost: integer("unit_cost"),
    subtotal: integer("subtotal").notNull(),
    ...timestamps,
  },
  (table) => [
    index("sale_item_sale_id_idx").on(table.saleId),
    index("sale_item_product_id_idx").on(table.productId),
  ],
);

export const schema = {
  user,
  session,
  account,
  verification,
  business,
  businessMember,
  outlet,
  subscription,
  subscriptionPayment,
  category,
  product,
  inventoryStock,
  stockMovement,
  cashShift,
  sale,
  saleItem,
};
