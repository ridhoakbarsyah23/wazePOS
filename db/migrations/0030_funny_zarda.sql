CREATE TABLE "lead" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"business_name" text NOT NULL,
	"business_type" text NOT NULL,
	"outlets" text NOT NULL,
	"message" text,
	"source" text DEFAULT 'marketing_form' NOT NULL,
	"webhook_delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "lead_created_at_idx" ON "lead" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "lead_whatsapp_idx" ON "lead" USING btree ("whatsapp");