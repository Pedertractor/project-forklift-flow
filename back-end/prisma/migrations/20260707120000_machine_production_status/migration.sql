-- CreateEnum
CREATE TYPE "MachineProductionStatus" AS ENUM ('TRABALHANDO', 'ABASTECER');

-- AlterTable
ALTER TABLE "Machine" ADD COLUMN "productionStatus" "MachineProductionStatus" NOT NULL DEFAULT 'TRABALHANDO';
