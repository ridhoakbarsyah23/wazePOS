CREATE TABLE "platform_admin_follow_up" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"note" text NOT NULL,
	"status" text NOT NULL,
	"follow_up_date" date,
	"author_user_id" text,
	"author_name" text NOT NULL,
	"author_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admin_follow_up_status_check" CHECK ("platform_admin_follow_up"."status" in ('open', 'in_progress', 'completed')),
	CONSTRAINT "platform_admin_follow_up_note_check" CHECK (char_length(trim("platform_admin_follow_up"."note")) between 1 and 2000),
	CONSTRAINT "platform_admin_follow_up_completed_date_check" CHECK ("platform_admin_follow_up"."status" <> 'completed' or "platform_admin_follow_up"."follow_up_date" is null)
);
--> statement-breakpoint
ALTER TABLE "platform_admin_follow_up" ADD CONSTRAINT "platform_admin_follow_up_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admin_follow_up" ADD CONSTRAINT "platform_admin_follow_up_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_admin_follow_up_business_created_idx" ON "platform_admin_follow_up" USING btree ("business_id","created_at","id");