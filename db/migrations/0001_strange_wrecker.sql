DROP INDEX "business_member_user_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "business_member_user_id_idx" ON "business_member" USING btree ("user_id");