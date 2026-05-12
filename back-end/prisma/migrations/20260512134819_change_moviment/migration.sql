/*
  Warnings:

  - You are about to drop the `Forklift` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ForkliftTask` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "RoleUser" ADD VALUE 'FOLLOW_UP_OPERATOR';

-- DropForeignKey
ALTER TABLE "Forklift" DROP CONSTRAINT "Forklift_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "Forklift" DROP CONSTRAINT "Forklift_sectorId_fkey";

-- DropForeignKey
ALTER TABLE "ForkliftTask" DROP CONSTRAINT "ForkliftTask_assignedForkliftId_fkey";

-- DropForeignKey
ALTER TABLE "ForkliftTask" DROP CONSTRAINT "ForkliftTask_requestId_fkey";

-- DropForeignKey
ALTER TABLE "ForkliftTask" DROP CONSTRAINT "ForkliftTask_requestedById_fkey";

-- DropTable
DROP TABLE "Forklift";

-- DropTable
DROP TABLE "ForkliftTask";

-- CreateEnum (must exist before MovimentPallet; later migration only adds column on MachineReplenishmentRequest)
CREATE TYPE "TypeMovimentPallet" AS ENUM ('PALLET_TRUCK', 'FORKLIFT');

-- CreateTable
CREATE TABLE "MovimentPalletTask" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" "ForkliftTaskType" NOT NULL DEFAULT 'DELIVER_TO_MACHINE',
    "status" "ForkliftTaskStatus" NOT NULL DEFAULT 'CREATED',
    "assignedMovimentPalletId" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MovimentPalletTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentPallet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TypeMovimentPallet" NOT NULL,
    "operatorId" TEXT,
    "sectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovimentPallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovimentPallet_code_key" ON "MovimentPallet"("code");

-- AddForeignKey
ALTER TABLE "MovimentPalletTask" ADD CONSTRAINT "MovimentPalletTask_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MachineReplenishmentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentPalletTask" ADD CONSTRAINT "MovimentPalletTask_assignedMovimentPalletId_fkey" FOREIGN KEY ("assignedMovimentPalletId") REFERENCES "MovimentPallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentPalletTask" ADD CONSTRAINT "MovimentPalletTask_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentPallet" ADD CONSTRAINT "MovimentPallet_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentPallet" ADD CONSTRAINT "MovimentPallet_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
