ALTER TABLE "lead" ADD COLUMN "status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "follow_up_note" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "follow_up_date" date;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "status_updated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "lead_status_created_at_idx" ON "lead" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "lead_follow_up_date_idx" ON "lead" USING btree ("follow_up_date");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_status_check" CHECK ("lead"."status" in ('new', 'contacted', 'interested', 'not_qualified'));--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_follow_up_note_check" CHECK ("lead"."follow_up_note" is null or char_length(trim("lead"."follow_up_note")) between 1 and 2000);