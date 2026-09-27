CREATE TABLE "cash_expense" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"outlet_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"note" text,
	"spent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_expense_category_check" CHECK ("cash_expense"."category" in ('belanja', 'gaji', 'sewa', 'operasional', 'lainnya')),
	CONSTRAINT "cash_expense_amount_check" CHECK ("cash_expense"."amount" > 0 and "cash_expense"."amount" <= 2000000000)
);
--> statement-breakpoint
ALTER TABLE "cash_expense" ADD CONSTRAINT "cash_expense_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_expense" ADD CONSTRAINT "cash_expense_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_expense" ADD CONSTRAINT "cash_expense_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_expense_business_id_idx" ON "cash_expense" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cash_expense_business_spent_at_idx" ON "cash_expense" USING btree ("business_id","spent_at");--> statement-breakpoint
CREATE INDEX "cash_expense_business_outlet_spent_at_idx" ON "cash_expense" USING btree ("business_id","outlet_id","spent_at");