-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_created_by_user_id_fkey";

-- AlterTable
ALTER TABLE "invitations" ALTER COLUMN "created_by_user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
