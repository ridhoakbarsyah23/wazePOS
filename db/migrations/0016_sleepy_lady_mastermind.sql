CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sale" ADD COLUMN "customer_id" text;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_business_id_idx" ON "customer" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "customer_business_name_idx" ON "customer" USING btree ("business_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_business_phone_idx" ON "customer" USING btree ("business_id","phone") WHERE "customer"."phone" is not null;--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sale_business_customer_idx" ON "sale" USING btree ("business_id","customer_id");