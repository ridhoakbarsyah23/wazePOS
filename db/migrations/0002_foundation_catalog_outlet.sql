CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"sku" text,
	"selling_price" integer NOT NULL,
	"cost_price" integer DEFAULT 0 NOT NULL,
	"track_stock" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_stock" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"outlet_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "category_business_id_idx" ON "category" USING btree ("business_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "category_business_name_idx" ON "category" USING btree ("business_id","name");
--> statement-breakpoint
CREATE INDEX "product_business_id_idx" ON "product" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX "product_category_id_idx" ON "product" USING btree ("category_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "product_business_sku_idx" ON "product" USING btree ("business_id","sku");
--> statement-breakpoint
CREATE INDEX "inventory_stock_business_id_idx" ON "inventory_stock" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX "inventory_stock_outlet_id_idx" ON "inventory_stock" USING btree ("outlet_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_stock_product_outlet_idx" ON "inventory_stock" USING btree ("product_id","outlet_id");
