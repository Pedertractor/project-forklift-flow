-- Drop plant map areas and machine map coordinates
DROP TABLE IF EXISTS "PlantMapArea";

DROP TYPE IF EXISTS "PlantMapAreaKind";

ALTER TABLE "Machine" DROP COLUMN IF EXISTS "position";
