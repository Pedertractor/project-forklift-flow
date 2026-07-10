-- CreateTable
CREATE TABLE "MachineStreet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machineStreetColor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineStreet_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Machine" ADD COLUMN "machineStreetId" TEXT;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_machineStreetId_fkey" FOREIGN KEY ("machineStreetId") REFERENCES "MachineStreet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
