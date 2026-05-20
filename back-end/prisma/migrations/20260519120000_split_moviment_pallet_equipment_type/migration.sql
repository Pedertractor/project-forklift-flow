-- Equipamento físico (empilhadeira / transpaleteira) separado do tipo em solicitações (FORKLIFT / ANY).

CREATE TYPE "MovimentPalletEquipmentType" AS ENUM ('FORKLIFT', 'PALLET_TRUCK');

ALTER TABLE "MovimentPallet" ADD COLUMN "type_equipment" "MovimentPalletEquipmentType";
UPDATE "MovimentPallet" SET "type_equipment" = ("type"::text)::"MovimentPalletEquipmentType";
ALTER TABLE "MovimentPallet" DROP COLUMN "type";
ALTER TABLE "MovimentPallet" RENAME COLUMN "type_equipment" TO "type";
ALTER TABLE "MovimentPallet" ALTER COLUMN "type" SET NOT NULL;

ALTER TABLE "MovimentPalletTripSuggestion" ADD COLUMN "type_equipment" "MovimentPalletEquipmentType";
UPDATE "MovimentPalletTripSuggestion" SET "type_equipment" = ("typeMovimentPallet"::text)::"MovimentPalletEquipmentType";
ALTER TABLE "MovimentPalletTripSuggestion" DROP COLUMN "typeMovimentPallet";
ALTER TABLE "MovimentPalletTripSuggestion" RENAME COLUMN "type_equipment" TO "typeMovimentPallet";
ALTER TABLE "MovimentPalletTripSuggestion" ALTER COLUMN "typeMovimentPallet" SET NOT NULL;

UPDATE "MachineReplenishmentRequest"
SET "typeMovimentPallet" = 'ANY'
WHERE "typeMovimentPallet"::text = 'PALLET_TRUCK';

CREATE TYPE "TypeMovimentPallet_new" AS ENUM ('FORKLIFT', 'ANY');

ALTER TABLE "MachineReplenishmentRequest" ALTER COLUMN "typeMovimentPallet" DROP DEFAULT;

ALTER TABLE "MachineReplenishmentRequest"
  ALTER COLUMN "typeMovimentPallet" TYPE "TypeMovimentPallet_new"
  USING (
    CASE "typeMovimentPallet"::text
      WHEN 'ANY' THEN 'ANY'::"TypeMovimentPallet_new"
      WHEN 'FORKLIFT' THEN 'FORKLIFT'::"TypeMovimentPallet_new"
      ELSE 'FORKLIFT'::"TypeMovimentPallet_new"
    END
  );

ALTER TABLE "MachineReplenishmentRequest"
  ALTER COLUMN "typeMovimentPallet" SET DEFAULT 'FORKLIFT'::"TypeMovimentPallet_new";

DROP TYPE "TypeMovimentPallet";
ALTER TYPE "TypeMovimentPallet_new" RENAME TO "TypeMovimentPallet";
