-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "enabled_tab_keys" TEXT[] DEFAULT ARRAY[]::TEXT[];
