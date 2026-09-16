UPDATE "subscription" SET "plan" = 'tumbuh' WHERE "plan" = 'trial';--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "plan" SET DEFAULT 'tumbuh';
