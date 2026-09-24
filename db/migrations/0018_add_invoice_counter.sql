CREATE TABLE "invoice_counter" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"counter_date" text NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_counter" ADD CONSTRAINT "invoice_counter_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_counter_business_date_idx" ON "invoice_counter" USING btree ("business_id","counter_date");