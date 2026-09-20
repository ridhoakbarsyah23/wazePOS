ALTER TABLE "sale" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sale" ADD COLUMN "voided_by_id" text;--> statement-breakpoint
ALTER TABLE "sale" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_voided_by_id_user_id_fk" FOREIGN KEY ("voided_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;