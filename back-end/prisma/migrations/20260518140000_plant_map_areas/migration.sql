-- CreateEnum
CREATE TYPE "PlantMapUnit" AS ENUM ('PEDERTRACTOR', 'TRACTOR');

-- CreateEnum
CREATE TYPE "PlantMapAreaKind" AS ENUM ('EXPEDITION', 'RECEIVING');

-- CreateTable
CREATE TABLE "PlantMapArea" (
    "id" TEXT NOT NULL,
    "plantUnit" "PlantMapUnit" NOT NULL,
    "kind" "PlantMapAreaKind" NOT NULL,
    "nx" DOUBLE PRECISION NOT NULL,
    "ny" DOUBLE PRECISION NOT NULL,
    "nw" DOUBLE PRECISION NOT NULL,
    "nh" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantMapArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlantMapArea_plantUnit_kind_key" ON "PlantMapArea"("plantUnit", "kind");
