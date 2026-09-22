-- Better Auth resolves password accounts by user id, not by email address.
-- Repair staff accounts created by the legacy staff endpoint without touching
-- OAuth accounts or an already-correct credential account.
UPDATE "account" AS legacy_account
SET
  "account_id" = legacy_account."user_id",
  "updated_at" = NOW()
WHERE legacy_account."provider_id" = 'credential'
  AND legacy_account."account_id" <> legacy_account."user_id"
  AND EXISTS (
    SELECT 1
    FROM "business_member"
    WHERE "business_member"."user_id" = legacy_account."user_id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "account" AS current_account
    WHERE current_account."provider_id" = 'credential'
      AND current_account."account_id" = legacy_account."user_id"
      AND current_account."id" <> legacy_account."id"
  );
