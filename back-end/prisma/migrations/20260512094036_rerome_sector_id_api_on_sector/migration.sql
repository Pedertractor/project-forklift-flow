/*
  Warnings:

  - You are about to drop the column `sectorIdAPI` on the `Sector` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Sector_sectorIdAPI_key";

-- AlterTable
ALTER TABLE "ForkliftTask" ALTER COLUMN "type" SET DEFAULT 'DELIVER_TO_MACHINE';

-- AlterTable
ALTER TABLE "Sector" DROP COLUMN "sectorIdAPI";
