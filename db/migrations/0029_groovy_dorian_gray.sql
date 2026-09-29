ALTER TABLE "subscription_payment" ADD COLUMN "disbursed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "disbursed_by" text;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "disbursement_reference" text;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "disbursement_note" text;