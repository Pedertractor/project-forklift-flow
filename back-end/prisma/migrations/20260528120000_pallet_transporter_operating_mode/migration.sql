-- Modo de operação no usuário (substitui vínculo a MovimentPallet físico).
-- Enum RoleUser.PALLET_TRANSPORTER: migração 20260528115999_role_user_add_pallet_transporter

CREATE TYPE "IsOperating" AS ENUM ('FORKLIFT', 'PALLET_TRUCK');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOperating" "IsOperating";

ALTER TABLE "DeliveryTask" ADD COLUMN IF NOT EXISTS "assignedOperatorId" TEXT;
ALTER TABLE "PickupTask" ADD COLUMN IF NOT EXISTS "assignedOperatorId" TEXT;

UPDATE "DeliveryTask" dt
SET "assignedOperatorId" = mp."operatorId"
FROM "MovimentPallet" mp
WHERE dt."assignedMovimentPalletId" = mp.id
  AND mp."operatorId" IS NOT NULL
  AND dt."assignedOperatorId" IS NULL;

UPDATE "PickupTask" pt
SET "assignedOperatorId" = mp."operatorId"
FROM "MovimentPallet" mp
WHERE pt."assignedMovimentPalletId" = mp.id
  AND mp."operatorId" IS NOT NULL
  AND pt."assignedOperatorId" IS NULL;

UPDATE "User"
SET "role" = 'PALLET_TRANSPORTER'
WHERE "role"::text IN ('FORKLIFT_OPERATOR', 'FOLLOW_UP_OPERATOR');

UPDATE "User" u
SET "isOperating" = 'FORKLIFT'::"IsOperating"
WHERE u."role" = 'PALLET_TRANSPORTER'
  AND u."isOperating" IS NULL
  AND EXISTS (
    SELECT 1 FROM "MovimentPallet" mp
    WHERE mp."operatorId" = u.id AND mp."type" = 'FORKLIFT'
  );

UPDATE "User" u
SET "isOperating" = 'PALLET_TRUCK'::"IsOperating"
WHERE u."role" = 'PALLET_TRANSPORTER'
  AND u."isOperating" IS NULL
  AND EXISTS (
    SELECT 1 FROM "MovimentPallet" mp
    WHERE mp."operatorId" = u.id AND mp."type" = 'PALLET_TRUCK'
  );

ALTER TABLE "DeliveryTask" DROP CONSTRAINT IF EXISTS "DeliveryTask_assignedMovimentPalletId_fkey";
ALTER TABLE "PickupTask" DROP CONSTRAINT IF EXISTS "PickupTask_assignedMovimentPalletId_fkey";
ALTER TABLE "MovimentPalletTripSuggestion" DROP CONSTRAINT IF EXISTS "MovimentPalletTripSuggestion_assignedMovimentPalletId_fkey";

ALTER TABLE "DeliveryTask" DROP COLUMN IF EXISTS "assignedMovimentPalletId";
ALTER TABLE "PickupTask" DROP COLUMN IF EXISTS "assignedMovimentPalletId";
ALTER TABLE "MovimentPalletTripSuggestion" DROP COLUMN IF EXISTS "assignedMovimentPalletId";

DROP TABLE IF EXISTS "MovimentPallet";

DROP TYPE IF EXISTS "MovimentPalletEquipmentType";

ALTER TABLE "DeliveryTask"
  ADD CONSTRAINT "DeliveryTask_assignedOperatorId_fkey"
  FOREIGN KEY ("assignedOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PickupTask"
  ADD CONSTRAINT "PickupTask_assignedOperatorId_fkey"
  FOREIGN KEY ("assignedOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "DeliveryTask_assignedOperatorId_status_idx"
  ON "DeliveryTask"("assignedOperatorId", "status");

CREATE INDEX IF NOT EXISTS "PickupTask_assignedOperatorId_status_idx"
  ON "PickupTask"("assignedOperatorId", "status");
