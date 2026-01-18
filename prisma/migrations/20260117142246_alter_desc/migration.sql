-- AlterTable
ALTER TABLE "investments" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "investments_sold" ALTER COLUMN "description" DROP NOT NULL;
