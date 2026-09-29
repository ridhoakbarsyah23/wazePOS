ALTER TABLE "subscription_payment" ALTER COLUMN "provider" SET DEFAULT 'bank_transfer';--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "sender_bank" text;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "sender_account_name" text;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "transfer_proof_data" text;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "transfer_proof_mime" text;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "transfer_proof_uploaded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_payment" ADD COLUMN "verification_note" text;