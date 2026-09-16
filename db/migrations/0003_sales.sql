CREATE TABLE "sale" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"outlet_id" text NOT NULL,
	"cashier_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"subtotal" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"paid_amount" integer NOT NULL,
	"change_amount" integer NOT NULL,
	"payment_method" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_item" (
	"id" text PRIMARY KEY NOT NULL,
	"sale_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"subtotal" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_cashier_id_user_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_sale_id_sale_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sale"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sale_business_id_idx" ON "sale" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX "sale_outlet_id_idx" ON "sale" USING btree ("outlet_id");
--> statement-breakpoint
CREATE INDEX "sale_created_at_idx" ON "sale" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "sale_business_invoice_idx" ON "sale" USING btree ("business_id","invoice_number");
--> statement-breakpoint
CREATE INDEX "sale_item_sale_id_idx" ON "sale_item" USING btree ("sale_id");
--> statement-breakpoint
CREATE INDEX "sale_item_product_id_idx" ON "sale_item" USING btree ("product_id");
