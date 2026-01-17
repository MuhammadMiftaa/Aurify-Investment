/*
  Warnings:

  - You are about to drop the column `assetCodeId` on the `investments` table. All the data in the column will be lost.
  - Added the required column `code` to the `investments` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "investments_assetCodeId_idx";

-- AlterTable
ALTER TABLE "investments" DROP COLUMN "assetCodeId",
ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "investments_code_idx" ON "investments"("code");

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_code_fkey" FOREIGN KEY ("code") REFERENCES "asset_codes"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
