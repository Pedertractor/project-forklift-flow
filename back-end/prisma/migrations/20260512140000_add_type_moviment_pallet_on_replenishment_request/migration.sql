-- CreateEnum
CREATE TYPE "TypeMovimentPallet" AS ENUM ('PALLET_TRUCK', 'FORKLIFT');

-- AlterTable: NOT NULL com DEFAULT preenche linhas ja existentes antes de fixar o constraint.
ALTER TABLE "MachineReplenishmentRequest" ADD COLUMN "typeMovimentPallet" "TypeMovimentPallet" NOT NULL DEFAULT 'FORKLIFT';
