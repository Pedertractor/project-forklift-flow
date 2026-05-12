-- CreateEnum
CREATE TYPE "MovimentPalletTripSuggestionStatus" AS ENUM ('OPEN', 'ACCEPTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "MovimentPalletTripSuggestion" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentPalletTripSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovimentPalletTripSuggestion_deliverTaskId_key" ON "MovimentPalletTripSuggestion"("deliverTaskId");

CREATE UNIQUE INDEX "MovimentPalletTripSuggestion_pickupTaskId_key" ON "MovimentPalletTripSuggestion"("pickupTaskId");

-- AddForeignKey
ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_deliverTaskId_fkey" FOREIGN KEY ("deliverTaskId") REFERENCES "MovimentPalletTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_pickupTaskId_fkey" FOREIGN KEY ("pickupTaskId") REFERENCES "MovimentPalletTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MovimentPalletTripSuggestion" ADD CONSTRAINT "MovimentPalletTripSuggestion_assignedMovimentPalletId_fkey" FOREIGN KEY ("assignedMovimentPalletId") REFERENCES "MovimentPallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
