-- CreateTable
CREATE TABLE "token_blacklist" (
    "id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_blacklist_token_hash_key" ON "token_blacklist"("token_hash");

-- CreateIndex
CREATE INDEX "token_blacklist_expires_at_idx" ON "token_blacklist"("expires_at");

-- Add CHECK constraints for financial amounts
ALTER TABLE "contributions" ADD CONSTRAINT "check_contributions_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "loans" ADD CONSTRAINT "check_loans_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "loans" ADD CONSTRAINT "check_loans_balance_non_negative" CHECK ("balance" >= 0);
ALTER TABLE "savings" ADD CONSTRAINT "check_savings_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "emergency_aids" ADD CONSTRAINT "check_emergency_aids_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "emergency_aid_payments" ADD CONSTRAINT "check_emergency_aid_payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "meeting_fines" ADD CONSTRAINT "check_meeting_fines_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "member_shares" ADD CONSTRAINT "check_member_shares_share_value_positive" CHECK ("share_value" > 0);
ALTER TABLE "member_shares" ADD CONSTRAINT "check_member_shares_number_of_shares_non_negative" CHECK ("number_of_shares" >= 0);
ALTER TABLE "loan_configurations" ADD CONSTRAINT "check_loan_configurations_max_loan_positive" CHECK ("max_loan_amount" > 0);
ALTER TABLE "loan_configurations" ADD CONSTRAINT "check_loan_configurations_min_loan_positive" CHECK ("min_loan_amount" > 0);
ALTER TABLE "loan_repayment_schedules" ADD CONSTRAINT "check_loan_repayment_schedules_amounts_non_negative" CHECK ("paid_amount" >= 0 AND "approved_paid_amount" >= 0 AND "principal_amount" >= 0 AND "interest_amount" >= 0 AND "total_amount" >= 0);
ALTER TABLE "share_profit_distributions" ADD CONSTRAINT "check_share_profit_distributions_total_profit_non_negative" CHECK ("total_profit" >= 0);
