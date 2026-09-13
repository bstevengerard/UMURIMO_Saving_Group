-- Drop unique constraints that were incorrectly applied
DROP INDEX IF EXISTS "sms_notifications_created_by_id_key";
DROP INDEX IF EXISTS "report_snapshots_generated_by_id_key";

-- Add unique constraint back to loan_configurations.created_by_id
CREATE UNIQUE INDEX IF NOT EXISTS "loan_configurations_created_by_id_key" ON "loan_configurations"("created_by_id");

-- Add index on members.phone
CREATE INDEX IF NOT EXISTS "members_phone_idx" ON "members"("phone");
