-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'AWAITING_PREPARATION';
ALTER TYPE "RequestStatus" ADD VALUE 'PALLET_READY';

-- AlterTable
ALTER TABLE "MachineReplenishmentRequest" ADD COLUMN "preparedAt" TIMESTAMP(3),
ADD COLUMN "awaitingPreparationSince" TIMESTAMP(3);

-- Pedidos CREATED existentes estavam na fila do transporte; tratá-los como pallet pronto.
UPDATE "MachineReplenishmentRequest"
SET
  "status" = 'PALLET_READY',
  "preparedAt" = COALESCE("preparedAt", "createdAt")
WHERE "status" = 'CREATED';

-- Default de novas solicitações: aguardando preparo (supply marca pronto depois).
ALTER TABLE "MachineReplenishmentRequest" ALTER COLUMN "status" SET DEFAULT 'AWAITING_PREPARATION';
