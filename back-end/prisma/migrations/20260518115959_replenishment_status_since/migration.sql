-- AlterTable
ALTER TABLE "MachineReplenishmentRequest" ADD COLUMN "statusSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: prefer timestamps tied to known states, else last row update.
UPDATE "MachineReplenishmentRequest"
SET "statusSince" = COALESCE(
  CASE
    WHEN "status" = 'AWAITING_PREPARATION' THEN "awaitingPreparationSince"
    WHEN "status" = 'PALLET_READY' THEN "preparedAt"
    ELSE NULL
  END,
  "updatedAt"
);
