-- AlterTable
ALTER TABLE "DeliveryTask" ADD COLUMN "assignedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PickupTask" ADD COLUMN "assignedAt" TIMESTAMP(3);
