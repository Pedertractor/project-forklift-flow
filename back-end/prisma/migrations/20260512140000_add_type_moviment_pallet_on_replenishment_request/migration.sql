-- TypeMovimentPallet is created in migration 20260512134819_change_moviment (before this one runs).

-- AlterTable: NOT NULL com DEFAULT preenche linhas ja existentes antes de fixar o constraint.
ALTER TABLE "MachineReplenishmentRequest" ADD COLUMN "typeMovimentPallet" "TypeMovimentPallet" NOT NULL DEFAULT 'FORKLIFT';
