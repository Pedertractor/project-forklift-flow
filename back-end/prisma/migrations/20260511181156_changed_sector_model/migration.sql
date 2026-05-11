/*
  Warnings:

  - You are about to drop the column `nameSector` on the `Sector` table. All the data in the column will be lost.
  - Added the required column `typeSector` to the `Sector` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sector" DROP COLUMN "nameSector",
ADD COLUMN     "typeSector" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "costCenterAPI" TEXT NOT NULL,
    "costCenterValue" TEXT NOT NULL,
    "sectorId" TEXT,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_costCenterAPI_key" ON "CostCenter"("costCenterAPI");

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
