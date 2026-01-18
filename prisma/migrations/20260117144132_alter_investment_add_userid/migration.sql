/*
  Warnings:

  - Added the required column `userId` to the `investments_sold` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "investments_sold" ADD COLUMN     "userId" TEXT NOT NULL;
