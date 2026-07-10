-- AlterTable
ALTER TABLE "MachineStreet" ADD COLUMN "sectorId" TEXT;

-- Backfill: if any streets exist without sector, attach to first sector (dev safety).
UPDATE "MachineStreet" AS ms
SET "sectorId" = (SELECT s."id" FROM "Sector" s ORDER BY s."createdAt" ASC LIMIT 1)
WHERE ms."sectorId" IS NULL
  AND EXISTS (SELECT 1 FROM "Sector");

-- Fail loudly if streets remain without sector and no sector exists to backfill.
DELETE FROM "MachineStreet" WHERE "sectorId" IS NULL;

-- AlterTable
ALTER TABLE "MachineStreet" ALTER COLUMN "sectorId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "MachineStreet_sectorId_idx" ON "MachineStreet"("sectorId");

-- AddForeignKey
ALTER TABLE "MachineStreet" ADD CONSTRAINT "MachineStreet_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
