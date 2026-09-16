CREATE TABLE "cash_shift" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"outlet_id" text NOT NULL,
	"cashier_id" text NOT NULL,
	"opening_cash" integer NOT NULL,
	"closing_cash" integer,
	"expected_cash" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_shift" ADD CONSTRAINT "cash_shift_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cash_shift" ADD CONSTRAINT "cash_shift_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cash_shift" ADD CONSTRAINT "cash_shift_cashier_id_user_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "cash_shift_business_id_idx" ON "cash_shift" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX "cash_shift_outlet_id_idx" ON "cash_shift" USING btree ("outlet_id");
--> statement-breakpoint
CREATE INDEX "cash_shift_cashier_id_idx" ON "cash_shift" USING btree ("cashier_id");
