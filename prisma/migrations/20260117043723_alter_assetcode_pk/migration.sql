/*
  Warnings:

  - The primary key for the `asset_codes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `asset_codes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "asset_codes" DROP CONSTRAINT "asset_codes_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "asset_codes_pkey" PRIMARY KEY ("code");
