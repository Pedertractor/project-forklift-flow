-- CreateEnum
CREATE TYPE "OperatorMachineSupplyRequestStatus" AS ENUM ('OPEN', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "OperatorMachineSupplyRequest" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "OperatorMachineSupplyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "fulfilledAt" TIMESTAMP(3),
    "fulfilledByReplenishmentRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperatorMachineSupplyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperatorMachineSupplyRequest_machineId_status_idx" ON "OperatorMachineSupplyRequest"("machineId", "status");

-- AddForeignKey
ALTER TABLE "OperatorMachineSupplyRequest" ADD CONSTRAINT "OperatorMachineSupplyRequest_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperatorMachineSupplyRequest" ADD CONSTRAINT "OperatorMachineSupplyRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OperatorMachineSupplyRequest" ADD CONSTRAINT "OperatorMachineSupplyRequest_fulfilledByReplenishmentRequestId_fkey" FOREIGN KEY ("fulfilledByReplenishmentRequestId") REFERENCES "MachineReplenishmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
