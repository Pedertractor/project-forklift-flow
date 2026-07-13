-- CreateTable
CREATE TABLE "MovimentOperatorMachineLink" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovimentOperatorMachineLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimentOperatorMachineLink_operatorId_idx" ON "MovimentOperatorMachineLink"("operatorId");

-- CreateIndex
CREATE INDEX "MovimentOperatorMachineLink_machineId_idx" ON "MovimentOperatorMachineLink"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentOperatorMachineLink_operatorId_machineId_key" ON "MovimentOperatorMachineLink"("operatorId", "machineId");

-- AddForeignKey
ALTER TABLE "MovimentOperatorMachineLink" ADD CONSTRAINT "MovimentOperatorMachineLink_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentOperatorMachineLink" ADD CONSTRAINT "MovimentOperatorMachineLink_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
