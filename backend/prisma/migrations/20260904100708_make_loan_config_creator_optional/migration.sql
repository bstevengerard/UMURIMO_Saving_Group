-- DropForeignKey
ALTER TABLE "loan_configurations" DROP CONSTRAINT "loan_configurations_created_by_id_fkey";

-- AlterTable
ALTER TABLE "loan_configurations" ALTER COLUMN "created_by_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "loan_configurations" ADD CONSTRAINT "loan_configurations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
