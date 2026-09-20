CREATE INDEX "outlet_business_name_idx" ON "outlet" USING btree ("business_id","name");--> statement-breakpoint
CREATE INDEX "product_business_active_name_idx" ON "product" USING btree ("business_id","is_active","name");--> statement-breakpoint
CREATE INDEX "sale_business_status_created_at_idx" ON "sale" USING btree ("business_id","status","created_at");--> statement-breakpoint
CREATE INDEX "sale_business_outlet_created_at_idx" ON "sale" USING btree ("business_id","outlet_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movement_business_created_at_idx" ON "stock_movement" USING btree ("business_id","created_at");