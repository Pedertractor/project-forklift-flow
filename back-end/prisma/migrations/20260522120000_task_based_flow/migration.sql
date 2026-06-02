-- Migração: MachineReplenishmentRequest + MovimentPalletTask -> DeliveryTask + PickupTask
-- Idempotente: suporta banco parcialmente migrado (tabelas antigas já removidas).

DROP TABLE IF EXISTS "MovimentPalletTripSuggestion" CASCADE;
DROP TABLE IF EXISTS "MovimentPalletTask" CASCADE;

-- Aviso ao abastecimento -> pedido antigo (ANTES de dropar MachineReplenishmentRequest)
ALTER TABLE "OperatorMachineSupplyRequest" DROP CONSTRAINT IF EXISTS "OperatorMachineSupplyRequest_fulfilledByReplenishmentRequestId_fkey";
ALTER TABLE "OperatorMachineSupplyRequest" DROP CONSTRAINT IF EXISTS "OperatorMachineSupplyRequest_fulfilledByReplenishmentReque_fkey";
ALTER TABLE "OperatorMachineSupplyRequest" DROP COLUMN IF EXISTS "fulfilledByReplenishmentRequestId";

DROP TABLE IF EXISTS "MachineReplenishmentRequest" CASCADE;

ALTER TABLE "OperatorMachineSupplyRequest" ADD COLUMN IF NOT EXISTS "deliveryTaskId" TEXT;

-- Enums novos (ignora se já existir)
DO $$ BEGIN
  CREATE TYPE "MachineTaskStatus" AS ENUM ('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DROP TYPE IF EXISTS "ForkliftTaskStatus";
DROP TYPE IF EXISTS "ForkliftTaskType";
DROP TYPE IF EXISTS "RequestStatus";
DROP TYPE IF EXISTS "PriorityLevel";

-- Tarefas novas
CREATE TABLE IF NOT EXISTS "DeliveryTask" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "movementCube" TEXT NOT NULL,
    "typeMovimentPallet" "TypeMovimentPallet" NOT NULL DEFAULT 'FORKLIFT',
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "status" "MachineTaskStatus" NOT NULL DEFAULT 'CREATED',
    "statusSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedBySupply" BOOLEAN NOT NULL DEFAULT false,
    "supplyAcceptedAt" TIMESTAMP(3),
    "preparedAt" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "assignedMovimentPalletId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PickupTask" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "typeMovimentPallet" "TypeMovimentPallet" NOT NULL DEFAULT 'FORKLIFT',
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "status" "MachineTaskStatus" NOT NULL DEFAULT 'CREATED',
    "statusSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggersReplenishment" BOOLEAN NOT NULL DEFAULT false,
    "requestedById" TEXT NOT NULL,
    "assignedMovimentPalletId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PickupTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MovimentPalletTripSuggestion" (
    "id" TEXT NOT NULL,
    "status" "MovimentPalletTripSuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "deliverTaskId" TEXT NOT NULL,
    "pickupTaskId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "typeMovimentPallet" "TypeMovimentPallet" NOT NULL,
    "acceptedByUserId" TEXT,
    "assignedMovimentPalletId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovimentPalletTripSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DeliveryTask_machineId_status_idx" ON "DeliveryTask"("machineId", "status");
CREATE INDEX IF NOT EXISTS "PickupTask_machineId_status_idx" ON "PickupTask"("machineId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "OperatorMachineSupplyRequest_deliveryTaskId_key" ON "OperatorMachineSupplyRequest"("deliveryTaskId");
CREATE UNIQUE INDEX IF NOT EXISTS "MovimentPalletTripSuggestion_deliverTaskId_key" ON "MovimentPalletTripSuggestion"("deliverTaskId");
CREATE UNIQUE INDEX IF NOT EXISTS "MovimentPalletTripSuggestion_pickupTaskId_key" ON "MovimentPalletTripSuggestion"("pickupTaskId");

DO $$ BEGIN
  ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DeliveryTask" ADD CONSTRAINT "DeliveryTask_assignedMovimentPalletId_fkey" FOREIGN KEY ("assignedMovimentPalletId") REFERENCES "MovimentPallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PickupTask" ADD CONSTRAINT "PickupTask_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PickupTask" ADD CONSTRAINT "PickupTask_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PickupTask" ADD CONSTRAINT "PickupTask_assignedMovimentPalletId_fkey" FOREIGN KEY ("assignedMovimentPalletId") REFERENCES "MovimentPallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OperatorMachineSupplyRequest" ADD CONSTRAINT "OperatorMachineSupplyRequest_deliveryTaskId_fkey" FOREIGN KEY ("deliveryTaskId") REFERENCES "DeliveryTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_deliverTaskId_fkey" FOREIGN KEY ("deliverTaskId") REFERENCES "DeliveryTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_pickupTaskId_fkey" FOREIGN KEY ("pickupTaskId") REFERENCES "PickupTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_assignedMovimentPalletId_fkey" FOREIGN KEY ("assignedMovimentPalletId") REFERENCES "MovimentPallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
