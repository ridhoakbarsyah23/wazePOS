ALTER TABLE "sale" ADD COLUMN "cash_shift_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "cash_shift_open_cashier_idx" ON "cash_shift" USING btree ("business_id","cashier_id") WHERE "cash_shift"."status" = 'open';
--> statement-breakpoint
ALTER TABLE "sale" ADD CONSTRAINT "sale_cash_shift_id_cash_shift_id_fk" FOREIGN KEY ("cash_shift_id") REFERENCES "public"."cash_shift"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sale_cash_shift_id_idx" ON "sale" USING btree ("cash_shift_id");
