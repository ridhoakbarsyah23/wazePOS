CREATE TABLE "stock_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"outlet_id" text NOT NULL,
	"product_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "stock_movement_business_id_idx" ON "stock_movement" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX "stock_movement_outlet_id_idx" ON "stock_movement" USING btree ("outlet_id");
--> statement-breakpoint
CREATE INDEX "stock_movement_product_id_idx" ON "stock_movement" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX "stock_movement_created_at_idx" ON "stock_movement" USING btree ("created_at");
