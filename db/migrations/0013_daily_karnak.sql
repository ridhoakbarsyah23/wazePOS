ALTER TABLE "sale" ADD COLUMN "client_request_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "sale_business_client_request_idx" ON "sale" USING btree ("business_id","client_request_id");