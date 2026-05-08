-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('PEDERTRACTOR', 'TRACTOR');

-- CreateEnum
CREATE TYPE "RoleUser" AS ENUM ('OPERATOR_MACHINE', 'FORKLIFT_OPERATOR', 'SUPPLY_OPERATOR', 'LEADER', 'SUPERVISOR', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ForkliftTaskStatus" AS ENUM ('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ForkliftTaskType" AS ENUM ('DELIVER_TO_MACHINE', 'ON_MACHINE', 'PICKUP_TO_EXPEDITION');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('VERY_HIGH', 'HIGH', 'NORMAL');

-- CreateTable
CREATE TABLE "Healthcheck" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Healthcheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "card" TEXT NOT NULL,
    "unit" "Unit" NOT NULL,
    "password" TEXT NOT NULL,
    "role" "RoleUser" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineReplenishmentRequest" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "movementCubeId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'CREATED',
    "priorityLevel" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MachineReplenishmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForkliftTask" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" "ForkliftTaskType" NOT NULL,
    "status" "ForkliftTaskStatus" NOT NULL DEFAULT 'CREATED',
    "assignedForkliftId" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ForkliftTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "typeMachineId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypeMachine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "urlImage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypeMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "sectorIdAPI" INTEGER NOT NULL,
    "nameSector" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Forklift" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "operatorId" TEXT,
    "sectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Forklift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovementCube" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sectorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovementCube_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_card_key" ON "User"("card");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_sectorIdAPI_key" ON "Sector"("sectorIdAPI");

-- CreateIndex
CREATE UNIQUE INDEX "Forklift_code_key" ON "Forklift"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MovementCube_code_key" ON "MovementCube"("code");

-- AddForeignKey
ALTER TABLE "MachineReplenishmentRequest" ADD CONSTRAINT "MachineReplenishmentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineReplenishmentRequest" ADD CONSTRAINT "MachineReplenishmentRequest_movementCubeId_fkey" FOREIGN KEY ("movementCubeId") REFERENCES "MovementCube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineReplenishmentRequest" ADD CONSTRAINT "MachineReplenishmentRequest_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkliftTask" ADD CONSTRAINT "ForkliftTask_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MachineReplenishmentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkliftTask" ADD CONSTRAINT "ForkliftTask_assignedForkliftId_fkey" FOREIGN KEY ("assignedForkliftId") REFERENCES "Forklift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForkliftTask" ADD CONSTRAINT "ForkliftTask_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_typeMachineId_fkey" FOREIGN KEY ("typeMachineId") REFERENCES "TypeMachine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forklift" ADD CONSTRAINT "Forklift_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forklift" ADD CONSTRAINT "Forklift_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementCube" ADD CONSTRAINT "MovementCube_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
