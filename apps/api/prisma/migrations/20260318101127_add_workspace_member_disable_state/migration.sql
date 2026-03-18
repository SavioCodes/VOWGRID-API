-- AlterTable
ALTER TABLE "users" ADD COLUMN     "disabled_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_workspace_id_disabled_at_idx" ON "users"("workspace_id", "disabled_at");
