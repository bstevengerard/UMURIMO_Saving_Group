-- CreateEnum
CREATE TYPE "Role" AS ENUM ('member', 'admin', 'treasurer', 'president');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('paid', 'pending', 'overdue');

-- CreateEnum
CREATE TYPE "ContributionFrequency" AS ENUM ('weekly', 'monthly', 'quarterly', 'one_time');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('pending', 'approved', 'rejected', 'disbursed', 'completed', 'overdue');

-- CreateEnum
CREATE TYPE "InterestIncrementCondition" AS ENUM ('after_30_days_overdue', 'after_60_days_overdue', 'admin_trigger', 'custom');

-- CreateEnum
CREATE TYPE "PrincipalBase" AS ENUM ('totalSavings', 'totalShares', 'fixedAmount', 'custom');

-- CreateEnum
CREATE TYPE "ProfitFormula" AS ENUM ('interest_plus_penalties', 'interest_plus_penalties_plus_principal', 'custom');

-- CreateEnum
CREATE TYPE "ShareDistributionPeriod" AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');

-- CreateEnum
CREATE TYPE "EmergencyAidRestrictionRule" AS ENUM ('block_new_loans', 'block_meeting_attendance', 'custom', 'none');

-- CreateEnum
CREATE TYPE "MeetingEventType" AS ENUM ('regular_meeting', 'general_assembly', 'special_meeting', 'other');

-- CreateEnum
CREATE TYPE "AttendanceIntent" AS ENUM ('pending', 'verified', 'rejected', 'escalated', 'cancelled');

-- CreateEnum
CREATE TYPE "MeetingFineStatus" AS ENUM ('pending', 'paid', 'waived');

-- CreateEnum
CREATE TYPE "EmergencyAidStatus" AS ENUM ('open', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'pending', 'overdue');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('pending', 'sent', 'delivered', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "SmsPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "SmsCategory" AS ENUM ('loan', 'attendance', 'contribution', 'meeting', 'general', 'repayment');

-- CreateEnum
CREATE TYPE "InstallmentApprovalStatus" AS ENUM ('pending', 'approved', 'denied', 'cancelled');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('pending', 'paid', 'overdue', 'partial');

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "national_id" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'member',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "permissions" JSONB,
    "documents" JSONB,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" TEXT,
    "email_verification_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_types" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(500) DEFAULT '',
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" "ContributionFrequency" NOT NULL DEFAULT 'weekly',
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "deadline" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "week" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_status" "ContributionStatus" NOT NULL DEFAULT 'pending',
    "recorded_by_id" TEXT NOT NULL,
    "contribution_type_id" TEXT,
    "payment_method" VARCHAR(100) NOT NULL DEFAULT 'Mobile Money',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_configurations" (
    "id" TEXT NOT NULL,
    "max_loan_amount" DECIMAL(12,2) NOT NULL DEFAULT 500000,
    "min_loan_amount" DECIMAL(12,2) NOT NULL DEFAULT 10000,
    "base_interest_rate" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "interest_increment" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "allow_interest_increment" BOOLEAN NOT NULL DEFAULT true,
    "interest_increment_condition" "InterestIncrementCondition" NOT NULL DEFAULT 'after_30_days_overdue',
    "loan_limit_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 3,
    "principal_base" "PrincipalBase" NOT NULL DEFAULT 'totalSavings',
    "fixed_principal_base" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monthly_loan_limit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "max_active_loans" INTEGER NOT NULL DEFAULT 1,
    "max_term_months" INTEGER NOT NULL DEFAULT 12,
    "min_term_months" INTEGER NOT NULL DEFAULT 1,
    "overdue_penalty_rate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "repayment_reminder_days" JSONB,
    "allow_multiple_loans" BOOLEAN NOT NULL DEFAULT false,
    "require_guarantor" BOOLEAN NOT NULL DEFAULT false,
    "profit_formula" "ProfitFormula" NOT NULL DEFAULT 'interest_plus_penalties',
    "share_profit_allocation_percent" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "share_distribution_period" "ShareDistributionPeriod" NOT NULL DEFAULT 'quarterly',
    "emergency_aid_fine_rate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "emergency_aid_restriction_rule" "EmergencyAidRestrictionRule" NOT NULL DEFAULT 'block_new_loans',
    "restriction_rule_note" VARCHAR(500) DEFAULT '',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "interest_rate" DECIMAL(5,2) NOT NULL,
    "term_months" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'pending',
    "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approval_date" TIMESTAMP(3),
    "disbursement_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "original_interest_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_interest_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "interest_increment_applied" BOOLEAN NOT NULL DEFAULT false,
    "interest_increment_date" TIMESTAMP(3),
    "monthly_loan_limit_status" VARCHAR(20) NOT NULL DEFAULT 'eligible',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_repayment_schedules" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "principal_amount" DECIMAL(12,2) NOT NULL,
    "interest_amount" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approved_paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "payment_method" TEXT,
    "notes" TEXT,
    "approval_status" "InstallmentApprovalStatus" NOT NULL DEFAULT 'pending',
    "approval_note" VARCHAR(500) NOT NULL DEFAULT '',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "interest_rate_at_time" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_repayment_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" VARCHAR(100) NOT NULL DEFAULT 'Mobile Money',
    "notes" VARCHAR(500) NOT NULL DEFAULT '',
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_shares" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "number_of_shares" INTEGER NOT NULL DEFAULT 0,
    "share_value" DECIMAL(12,2) NOT NULL DEFAULT 1000,
    "total_profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_distribution_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_profit_distributions" (
    "id" TEXT NOT NULL,
    "distribution_period" "ShareDistributionPeriod" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_profit" DECIMAL(12,2) NOT NULL,
    "allocated_percent" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "distributed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_profit_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" VARCHAR(20) NOT NULL,
    "end_time" VARCHAR(20),
    "location" VARCHAR(255),
    "description" TEXT,
    "meeting_code" VARCHAR(50),
    "event_type" "MeetingEventType" NOT NULL DEFAULT 'regular_meeting',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_fines" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" VARCHAR(255) NOT NULL DEFAULT 'Absent from meeting',
    "status" "MeetingFineStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "intent" "AttendanceIntent" NOT NULL DEFAULT 'pending',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_aids" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000) DEFAULT '',
    "amount" DECIMAL(12,2) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "EmergencyAidStatus" NOT NULL DEFAULT 'open',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_aids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_aid_payments" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "emergency_aid_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "fine_applied" BOOLEAN NOT NULL DEFAULT false,
    "fine_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_method" VARCHAR(100) NOT NULL DEFAULT 'Mobile Money',
    "paid_at" TIMESTAMP(3),
    "recorded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_aid_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'medium',
    "expires_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" VARCHAR(50) NOT NULL,
    "action" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(255) NOT NULL,
    "changes" JSONB,
    "previous_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(50) DEFAULT '',
    "user_agent" VARCHAR(500) DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "category" "SmsCategory" NOT NULL DEFAULT 'general',
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_notifications" (
    "id" TEXT NOT NULL,
    "recipient_phone" VARCHAR(50) NOT NULL,
    "recipient_member_id" TEXT,
    "template_id" TEXT,
    "message" TEXT NOT NULL,
    "status" "SmsStatus" NOT NULL DEFAULT 'pending',
    "priority" "SmsPriority" NOT NULL DEFAULT 'medium',
    "category" "SmsCategory" NOT NULL DEFAULT 'general',
    "delivery_provider" TEXT,
    "provider_message_id" TEXT,
    "error_message" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_subscriptions" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "loan_alerts" BOOLEAN NOT NULL DEFAULT true,
    "contribution_reminders" BOOLEAN NOT NULL DEFAULT true,
    "attendance_alerts" BOOLEAN NOT NULL DEFAULT true,
    "meeting_reminders" BOOLEAN NOT NULL DEFAULT true,
    "general_notifications" BOOLEAN NOT NULL DEFAULT true,
    "repayment_alerts" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_snapshots" (
    "id" TEXT NOT NULL,
    "report_type" VARCHAR(100) NOT NULL,
    "period_start_date" TIMESTAMP(3) NOT NULL,
    "period_end_date" TIMESTAMP(3) NOT NULL,
    "period_label" VARCHAR(255) NOT NULL,
    "filters_applied_status" TEXT,
    "filters_applied_member_id" TEXT,
    "filters_applied_group_by" TEXT,
    "generated_by_id" TEXT NOT NULL,
    "generated_by_full_name" VARCHAR(255) NOT NULL,
    "generated_by_role" VARCHAR(50) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_national_id_key" ON "members"("national_id");

-- CreateIndex
CREATE INDEX "members_email_idx" ON "members"("email");

-- CreateIndex
CREATE INDEX "members_national_id_idx" ON "members"("national_id");

-- CreateIndex
CREATE INDEX "members_role_idx" ON "members"("role");

-- CreateIndex
CREATE INDEX "members_is_active_idx" ON "members"("is_active");

-- CreateIndex
CREATE INDEX "members_is_approved_idx" ON "members"("is_approved");

-- CreateIndex
CREATE INDEX "members_created_at_idx" ON "members"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_role_key" ON "permissions"("role");

-- CreateIndex
CREATE INDEX "contribution_types_is_active_idx" ON "contribution_types"("is_active");

-- CreateIndex
CREATE INDEX "contributions_member_id_week_idx" ON "contributions"("member_id", "week");

-- CreateIndex
CREATE INDEX "contributions_week_idx" ON "contributions"("week");

-- CreateIndex
CREATE INDEX "contributions_payment_status_idx" ON "contributions"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "loan_configurations_created_by_id_key" ON "loan_configurations"("created_by_id");

-- CreateIndex
CREATE INDEX "loans_member_id_idx" ON "loans"("member_id");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "loans_request_date_idx" ON "loans"("request_date");

-- CreateIndex
CREATE INDEX "loans_due_date_idx" ON "loans"("due_date");

-- CreateIndex
CREATE INDEX "loan_repayment_schedules_loan_id_installment_number_idx" ON "loan_repayment_schedules"("loan_id", "installment_number");

-- CreateIndex
CREATE INDEX "loan_repayment_schedules_due_date_status_idx" ON "loan_repayment_schedules"("due_date", "status");

-- CreateIndex
CREATE INDEX "loan_repayment_schedules_member_id_idx" ON "loan_repayment_schedules"("member_id");

-- CreateIndex
CREATE INDEX "savings_member_id_transaction_date_idx" ON "savings"("member_id", "transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "member_shares_member_id_key" ON "member_shares"("member_id");

-- CreateIndex
CREATE INDEX "member_shares_member_id_idx" ON "member_shares"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_meeting_code_key" ON "meetings"("meeting_code");

-- CreateIndex
CREATE INDEX "meetings_date_idx" ON "meetings"("date");

-- CreateIndex
CREATE INDEX "meetings_is_active_idx" ON "meetings"("is_active");

-- CreateIndex
CREATE INDEX "meeting_fines_status_idx" ON "meeting_fines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_fines_meeting_id_member_id_key" ON "meeting_fines"("meeting_id", "member_id");

-- CreateIndex
CREATE INDEX "attendance_meeting_id_verified_idx" ON "attendance"("meeting_id", "verified");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_member_id_meeting_id_key" ON "attendance"("member_id", "meeting_id");

-- CreateIndex
CREATE INDEX "emergency_aids_status_deadline_idx" ON "emergency_aids"("status", "deadline");

-- CreateIndex
CREATE INDEX "emergency_aid_payments_emergency_aid_id_payment_status_idx" ON "emergency_aid_payments"("emergency_aid_id", "payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_aid_payments_member_id_emergency_aid_id_key" ON "emergency_aid_payments"("member_id", "emergency_aid_id");

-- CreateIndex
CREATE INDEX "announcements_created_at_idx" ON "announcements"("created_at");

-- CreateIndex
CREATE INDEX "announcements_expires_at_idx" ON "announcements"("expires_at");

-- CreateIndex
CREATE INDEX "announcements_is_active_idx" ON "announcements"("is_active");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sms_templates_name_key" ON "sms_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sms_notifications_created_by_id_key" ON "sms_notifications"("created_by_id");

-- CreateIndex
CREATE INDEX "sms_notifications_status_scheduled_at_idx" ON "sms_notifications"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "sms_notifications_recipient_member_id_idx" ON "sms_notifications"("recipient_member_id");

-- CreateIndex
CREATE INDEX "sms_notifications_category_created_at_idx" ON "sms_notifications"("category", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sms_subscriptions_member_id_key" ON "sms_subscriptions"("member_id");

-- CreateIndex
CREATE INDEX "sms_subscriptions_member_id_idx" ON "sms_subscriptions"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_snapshots_generated_by_id_key" ON "report_snapshots"("generated_by_id");

-- CreateIndex
CREATE INDEX "report_snapshots_report_type_period_start_date_period_end_d_idx" ON "report_snapshots"("report_type", "period_start_date", "period_end_date");

-- CreateIndex
CREATE INDEX "report_snapshots_generated_by_id_created_at_idx" ON "report_snapshots"("generated_by_id", "created_at");

-- CreateIndex
CREATE INDEX "report_snapshots_created_at_idx" ON "report_snapshots"("created_at");

-- CreateIndex
CREATE INDEX "idx_password_reset_tokens_expires_at" ON "password_reset_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_types" ADD CONSTRAINT "contribution_types_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_contribution_type_id_fkey" FOREIGN KEY ("contribution_type_id") REFERENCES "contribution_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_configurations" ADD CONSTRAINT "loan_configurations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayment_schedules" ADD CONSTRAINT "loan_repayment_schedules_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayment_schedules" ADD CONSTRAINT "loan_repayment_schedules_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_repayment_schedules" ADD CONSTRAINT "loan_repayment_schedules_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings" ADD CONSTRAINT "savings_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings" ADD CONSTRAINT "savings_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_shares" ADD CONSTRAINT "member_shares_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_profit_distributions" ADD CONSTRAINT "share_profit_distributions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_fines" ADD CONSTRAINT "meeting_fines_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_fines" ADD CONSTRAINT "meeting_fines_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_fines" ADD CONSTRAINT "meeting_fines_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_aids" ADD CONSTRAINT "emergency_aids_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_aid_payments" ADD CONSTRAINT "emergency_aid_payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_aid_payments" ADD CONSTRAINT "emergency_aid_payments_emergency_aid_id_fkey" FOREIGN KEY ("emergency_aid_id") REFERENCES "emergency_aids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_aid_payments" ADD CONSTRAINT "emergency_aid_payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_notifications" ADD CONSTRAINT "sms_notifications_recipient_member_id_fkey" FOREIGN KEY ("recipient_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_notifications" ADD CONSTRAINT "sms_notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "sms_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_notifications" ADD CONSTRAINT "sms_notifications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_subscriptions" ADD CONSTRAINT "sms_subscriptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
