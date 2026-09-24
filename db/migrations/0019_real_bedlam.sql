CREATE TABLE "platform_admin_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text,
	"actor_user_id" text,
	"actor_email" text NOT NULL,
	"actor_name" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_admin_audit_log" ADD CONSTRAINT "platform_admin_audit_log_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_admin_audit_log" ADD CONSTRAINT "platform_admin_audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_admin_audit_business_created_idx" ON "platform_admin_audit_log" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_admin_audit_actor_created_idx" ON "platform_admin_audit_log" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_admin_audit_action_created_idx" ON "platform_admin_audit_log" USING btree ("action","created_at");