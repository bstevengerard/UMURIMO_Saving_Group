-- Migration: Add MeetingAttendanceStatus enum
ALTER TYPE "MeetingAttendanceStatus" ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE "MeetingAttendanceStatus" ADD VALUE IF NOT EXISTS 'open';
ALTER TYPE "MeetingAttendanceStatus" ADD VALUE IF NOT EXISTS 'closed';
ALTER TYPE "MeetingAttendanceStatus" ADD VALUE IF NOT EXISTS 'finalized';

-- Migration: Update LoanConfiguration
ALTER TABLE "loan_configurations" ADD COLUMN IF NOT EXISTS "grace_period_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "loan_configurations" ADD COLUMN IF NOT EXISTS "attendance_fine_absence" DECIMAL(12,2) NOT NULL DEFAULT 500;
ALTER TABLE "loan_configurations" ADD COLUMN IF NOT EXISTS "attendance_fine_late" DECIMAL(12,2) NOT NULL DEFAULT 200;
ALTER TABLE "loan_configurations" ADD COLUMN IF NOT EXISTS "auto_create_attendance_fines" BOOLEAN NOT NULL DEFAULT true;

-- Migration: Update Loan model
ALTER TABLE "loans" ADD COLUMN IF NOT EXISTS "overdue_interests" JSONB;

-- Migration: Create LoanOverdueInterest table
CREATE TABLE IF NOT EXISTS "loan_overdue_interests" (
  "id" TEXT NOT NULL,
  "loan_id" TEXT NOT NULL,
  "installment_id" TEXT,
  "month_year" TEXT NOT NULL,
  "overdue_amount" DECIMAL(12,2) NOT NULL,
  "interest_amount" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loan_overdue_interests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "loan_overdue_interests_loan_id_month_year_key" ON "loan_overdue_interests"("loan_id", "month_year");
CREATE INDEX IF NOT EXISTS "loan_overdue_interests_loan_id_created_at_idx" ON "loan_overdue_interests"("loan_id", "created_at");

-- Migration: Update Meeting model
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "attendance_status" "MeetingAttendanceStatus" NOT NULL DEFAULT 'draft';
CREATE INDEX IF NOT EXISTS "meetings_attendance_status_idx" ON "meetings"("attendance_status");

-- Migration: Create ShareConfiguration table
CREATE TABLE IF NOT EXISTS "share_configurations" (
  "id" TEXT NOT NULL,
  "min_shares" INTEGER NOT NULL DEFAULT 1,
  "max_shares" INTEGER NOT NULL DEFAULT 5,
  "share_value" DECIMAL(12,2) NOT NULL DEFAULT 1000,
  "interest_rate" DECIMAL(5,2) NOT NULL DEFAULT 3,
  "effective_from" TIMESTAMP(3) NOT NULL,
  "effective_to" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_id" TEXT UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "share_configurations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "share_configurations_effective_from_idx" ON "share_configurations"("effective_from");
CREATE INDEX IF NOT EXISTS "share_configurations_is_active_idx" ON "share_configurations"("is_active");

-- Migration: Create MemberShareTransaction table
CREATE TABLE IF NOT EXISTS "member_share_transactions" (
  "id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "shares_purchased" INTEGER NOT NULL,
  "share_value" DECIMAL(12,2) NOT NULL,
  "total_amount" DECIMAL(12,2) NOT NULL,
  "period_month" INTEGER NOT NULL,
  "period_year" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_share_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "member_share_transactions_member_id_period_year_period_month_idx" ON "member_share_transactions"("member_id", "period_year", "period_month");

-- Migration: Create EmergencyAidParticipation table
CREATE TABLE IF NOT EXISTS "emergency_aid_participations" (
  "id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "emergency_aid_id" TEXT NOT NULL,
  "participation_month" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "emergency_aid_participations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "emergency_aid_participations_member_id_emergency_aid_id_participation_month_key" ON "emergency_aid_participations"("member_id", "emergency_aid_id", "participation_month");
CREATE INDEX IF NOT EXISTS "emergency_aid_participations_member_id_idx" ON "emergency_aid_participations"("member_id");

-- Migration: Create ReportSnapshot table
CREATE TABLE IF NOT EXISTS "report_snapshots" (
  "id" TEXT NOT NULL,
  "report_type" VARCHAR(100) NOT NULL,
  "period_start_date" TIMESTAMP(3) NOT NULL,
  "period_end_date" TIMESTAMP(3) NOT NULL,
  "period_label" VARCHAR(255) NOT NULL,
  "filters_applied_status" VARCHAR(100),
  "filters_applied_member_id" TEXT,
  "filters_applied_group_by" VARCHAR(100),
  "generated_by_id" TEXT NOT NULL,
  "generated_by_full_name" VARCHAR(255) NOT NULL,
  "generated_by_role" VARCHAR(50) NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB NOT NULL,
  "payload_hash" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_snapshots_report_type_period_start_date_period_end_date_idx" ON "report_snapshots"("report_type", "period_start_date", "period_end_date");
CREATE INDEX IF NOT EXISTS "report_snapshots_generated_by_id_created_at_idx" ON "report_snapshots"("generated_by_id", "created_at");
CREATE INDEX IF NOT EXISTS "report_snapshots_created_at_idx" ON "report_snapshots"("created_at");

-- Migration: Rename password_reset_tokens table and column
ALTER TABLE "password_reset_tokens" RENAME TO "password_reset_tokens_old";
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "is_used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_expires_at" ON "password_reset_tokens"("expires_at");

-- Migration: Add foreign keys
ALTER TABLE "loan_overdue_interests" ADD CONSTRAINT "loan_overdue_interests_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "share_configurations" ADD CONSTRAINT "share_configurations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "member_share_transactions" ADD CONSTRAINT "member_share_transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emergency_aid_participations" ADD CONSTRAINT "emergency_aid_participations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "emergency_aid_participations" ADD CONSTRAINT "emergency_aid_participations_emergency_aid_id_fkey" FOREIGN KEY ("emergency_aid_id") REFERENCES "emergency_aids"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration: Clean up old password_reset_tokens table
DROP TABLE IF EXISTS "password_reset_tokens_old";

-- Migration: Add new relations to Member table
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "share_transactions" JSONB;
