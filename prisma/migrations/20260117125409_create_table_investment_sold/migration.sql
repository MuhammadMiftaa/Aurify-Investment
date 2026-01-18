/*
  Warnings:

  - You are about to alter the column `quantity` on the `investments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `initialValuation` on the `investments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.

*/
-- AlterTable
ALTER TABLE "investments" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "initialValuation" SET DATA TYPE DECIMAL(18,8);

-- CreateTable
CREATE TABLE "investments_sold" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "quantity" DECIMAL(18,8),
    "salePrice" DECIMAL(18,8),
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "deficit" DECIMAL(18,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "investments_sold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investments_sold_investmentId_idx" ON "investments_sold"("investmentId");

-- AddForeignKey
ALTER TABLE "investments_sold" ADD CONSTRAINT "investments_sold_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
