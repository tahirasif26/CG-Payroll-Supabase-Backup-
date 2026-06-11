-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "payroll_setup_id" UUID;

-- CreateIndex
CREATE INDEX "employees_payroll_setup_id_idx" ON "employees"("payroll_setup_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_payroll_setup_id_fkey" FOREIGN KEY ("payroll_setup_id") REFERENCES "payroll_setups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
