/*
  Warnings:

  - Added the required column `amount` to the `investments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `investments_sold` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "investments" ADD COLUMN     "amount" DECIMAL(18,8) NOT NULL;

-- AlterTable
ALTER TABLE "investments_sold" ADD COLUMN     "amount" DECIMAL(18,8) NOT NULL;
