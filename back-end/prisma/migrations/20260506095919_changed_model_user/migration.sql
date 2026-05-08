/*
  Warnings:

  - A unique constraint covering the columns `[card,unit]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `employeeId` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "User_card_key";

-- DropIndex
DROP INDEX "User_employeeId_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isLogged" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_card_unit_key" ON "User"("card", "unit");
