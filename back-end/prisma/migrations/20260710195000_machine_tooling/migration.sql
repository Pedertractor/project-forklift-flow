-- CreateTable
CREATE TABLE "Tooling" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tooling_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "OperatorMachineSupplyRequest" ADD COLUMN "toolingId" TEXT;

-- CreateIndex
CREATE INDEX "Tooling_machineId_idx" ON "Tooling"("machineId");

-- AddForeignKey
ALTER TABLE "Tooling" ADD CONSTRAINT "Tooling_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorMachineSupplyRequest" ADD CONSTRAINT "OperatorMachineSupplyRequest_toolingId_fkey" FOREIGN KEY ("toolingId") REFERENCES "Tooling"("id") ON DELETE SET NULL ON UPDATE CASCADE;
