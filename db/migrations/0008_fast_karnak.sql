CREATE TABLE "subscription_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"plan" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"provider" text DEFAULT 'midtrans' NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_transaction_id" text,
	"provider_payment_type" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"snap_token" text,
	"redirect_url" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "current_period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD CONSTRAINT "subscription_payment_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_payment_business_id_idx" ON "subscription_payment" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "subscription_payment_subscription_id_idx" ON "subscription_payment" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payment_order_id_idx" ON "subscription_payment" USING btree ("provider_order_id");