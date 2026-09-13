-- Create enums
CREATE TYPE "AccountType" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE "AccountCategory" AS ENUM (
  'cash_bank', 'member_savings', 'member_contributions', 'loan_receivables',
  'interest_income', 'fine_income', 'emergency_aid_fund', 'share_capital',
  'share_profit_distribution', 'operating_expenses', 'member_deposits'
);
CREATE TYPE "LedgerEntryStatus" AS ENUM ('draft', 'posted', 'reversed');

-- Create chart_of_accounts table
CREATE TABLE "chart_of_accounts" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "account_type" "AccountType" NOT NULL,
  "category" "AccountCategory" NOT NULL,
  "parent_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "description" VARCHAR(500) NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "chart_of_accounts"("code");
CREATE INDEX "chart_of_accounts_account_type_idx" ON "chart_of_accounts"("account_type");
CREATE INDEX "chart_of_accounts_category_idx" ON "chart_of_accounts"("category");
CREATE INDEX "chart_of_accounts_code_idx" ON "chart_of_accounts"("code");

ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL;

-- Create ledger_entries table
CREATE TABLE "ledger_entries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "account_id" TEXT NOT NULL,
  "member_id" TEXT,
  "loan_id" TEXT,
  "installment_id" TEXT,
  "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "description" VARCHAR(500) NOT NULL,
  "source_module" VARCHAR(100) NOT NULL,
  "source_record_id" VARCHAR(255) NOT NULL,
  "source_record_type" VARCHAR(100) NOT NULL,
  "status" "LedgerEntryStatus" NOT NULL DEFAULT 'draft',
  "reversal_of_id" TEXT,
  "posted_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ledger_entries_account_id_transaction_date_idx" ON "ledger_entries"("account_id", "transaction_date");
CREATE INDEX "ledger_entries_source_module_source_record_id_idx" ON "ledger_entries"("source_module", "source_record_id");
CREATE INDEX "ledger_entries_member_id_idx" ON "ledger_entries"("member_id");
CREATE INDEX "ledger_entries_loan_id_idx" ON "ledger_entries"("loan_id");
CREATE INDEX "ledger_entries_status_idx" ON "ledger_entries"("status");

ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "ledger_entries"("id") ON DELETE SET NULL;
