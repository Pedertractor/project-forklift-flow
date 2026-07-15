-- Vinculo explicito e unico entre PickupTask e OperatorMachineSupplyRequest,
-- substituindo a flag `triggersReplenishment` (reinferida por heuristica de
-- timestamp/status em varias camadas, causa raiz de cards duplicados e
-- retiradas re-amarradas incorretamente apos o continuum original concluir).
--
-- Sem backfill: os dados antigos de `triggersReplenishment` ja estavam
-- ambiguos/duplicados (mesmo aviso podia ter mais de uma retirada marcada).
-- A partir desta migracao, o vinculo passa a ser gravado uma unica vez,
-- em `pickup-supply-link.service.ts`, no momento da solicitacao.

ALTER TABLE "PickupTask" ADD COLUMN "linkedSupplyRequestId" TEXT;

ALTER TABLE "PickupTask" DROP COLUMN "triggersReplenishment";

CREATE UNIQUE INDEX "PickupTask_linkedSupplyRequestId_key" ON "PickupTask"("linkedSupplyRequestId");

ALTER TABLE "PickupTask" ADD CONSTRAINT "PickupTask_linkedSupplyRequestId_fkey" FOREIGN KEY ("linkedSupplyRequestId") REFERENCES "OperatorMachineSupplyRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
