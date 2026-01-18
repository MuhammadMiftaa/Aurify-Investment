/*
  Warnings:

  - You are about to drop the column `salePrice` on the `investments_sold` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "investments_sold" DROP COLUMN "salePrice",
ADD COLUMN     "sellPrice" DECIMAL(18,8);
