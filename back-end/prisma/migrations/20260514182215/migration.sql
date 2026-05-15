/*
  Warnings:

  - You are about to drop the `Healthcheck` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "MovimentPalletTripSuggestion" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "Healthcheck";
