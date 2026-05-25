-- AlterTable
ALTER TABLE "clients"
  ADD COLUMN "company_logo_url" TEXT,
  ADD COLUMN "setup_wizard_dismissed_at" TIMESTAMP(3);
