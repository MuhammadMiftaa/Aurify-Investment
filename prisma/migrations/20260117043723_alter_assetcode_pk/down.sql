-- AlterTable
ALTER TABLE "public"."asset_codes" DROP CONSTRAINT "asset_codes_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "asset_codes_pkey" PRIMARY KEY ("id");

