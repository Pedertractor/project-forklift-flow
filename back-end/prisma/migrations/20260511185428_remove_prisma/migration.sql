/*
  Warnings:

  - You are about to drop the column `movementCubeId` on the `MachineReplenishmentRequest` table. All the data in the column will be lost.
  - You are about to drop the `MovementCube` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MachineReplenishmentRequest" DROP CONSTRAINT "MachineReplenishmentRequest_movementCubeId_fkey";

-- DropForeignKey
ALTER TABLE "MovementCube" DROP CONSTRAINT "MovementCube_sectorId_fkey";

-- AlterTable
ALTER TABLE "MachineReplenishmentRequest" DROP COLUMN "movementCubeId";

-- DropTable
DROP TABLE "MovementCube";
