import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const syncServicePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "trip-suggestion-sync.service.ts",
);

const linkServicePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "pickup-supply-link.service.ts",
);

const pickupRepoPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../repositories/pickup-task.repository.ts",
);

const flowPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../front-end/src/pages/OperatorMachinePage/operator-machine-flow.ts",
);

test("trip sync: pareia retirada e entrega apenas pela cadeia de FK explicita (linkedSupplyRequestId -> deliveryTaskId)", () => {
  const src = readFileSync(syncServicePath, "utf8");
  assert.match(src, /findFirstOpenLinkedForMachine/);
  assert.match(src, /linkedSupplyRequestId/);
  assert.match(src, /deliveryTaskId/);
  // Nenhuma heuristica de status/timestamp para decidir o par.
  assert.equal(src.includes("triggersReplenishment"), false);
});

test("trip sync: so abre sugestao OPEN quando a retirada vinculada ainda esta CREATED", () => {
  const src = readFileSync(syncServicePath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export async function syncTripSuggestionPairForMachine"),
    src.indexOf("export async function bindLinkedPickupToDelivery"),
  );
  assert.match(fnBlock, /pickup\.status !== MachineTaskStatus\.CREATED/);
});

test("trip sync: liga a entrega a retirada vinculada ao aviso que a originou (sem ambiguidade por maquina)", () => {
  const src = readFileSync(syncServicePath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export async function bindLinkedPickupToDelivery"),
    src.indexOf("export async function expireOpenTripSuggestionsUnpreparedForSector"),
  );
  assert.match(fnBlock, /deliveryTaskId:\s*input\.deliverTaskId/);
  assert.match(fnBlock, /linkedPickupTask/);
});

test("pickup-task.repository: no maximo uma retirada aberta vinculada por maquina (unicidade garantida no banco)", () => {
  const src = readFileSync(pickupRepoPath, "utf8");
  assert.match(src, /findFirstOpenLinkedForMachine/);
  assert.match(src, /linkedSupplyRequestId:\s*\{\s*not:\s*null\s*\}/);
});

test("pickup-supply-link: retirada nova entra na rota ja aceita e notifica o empilhadeirista responsavel", () => {
  const src = readFileSync(linkServicePath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export async function linkNewPickupToEligibleSupplyRequest"),
    src.indexOf("export async function linkNewSupplyRequestToEligiblePickup"),
  );
  assert.match(fnBlock, /joined_active_delivery/);
  assert.match(fnBlock, /upsertAcceptedPair/);
});

test("pickup-supply-link: aviso novo amarra a 1a retirada aberta sem vinculo e notifica se ja aceita pelo transporte", () => {
  const src = readFileSync(linkServicePath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export async function linkNewSupplyRequestToEligiblePickup"),
  );
  assert.match(fnBlock, /findFirstOpenUnlinkedForMachine/);
  assert.match(fnBlock, /replenishment_linked/);
});

test("frontend: retirada vinculada ao fluxo de reposicao usa apenas o FK explicito linkedSupplyRequestId", () => {
  const src = readFileSync(flowPath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export function isPickupLinkedToReplenishmentFlow"),
    src.indexOf("export function hasPickupLinkedToReplenishmentFlow"),
  );
  assert.match(fnBlock, /pickup\.linkedSupplyRequestId != null/);
  // Sem heuristica por maquina/data: nada de findOpenSupplyForMachine ou
  // comparacao de createdAt entre abastecimento e retirada.
  assert.equal(fnBlock.includes("findOpenSupplyForMachine"), false);
  assert.equal(fnBlock.includes("createdAt"), false);
});

test("frontend: cada retirada resolve seu proprio abastecimento/entrega vinculados (sem heuristica por maquina)", () => {
  const src = readFileSync(flowPath, "utf8");
  assert.match(src, /export function findSupplyForPickup/);
  assert.match(src, /export function findDeliveryForPickup/);
  const supplyBlock = src.slice(
    src.indexOf("export function findSupplyForPickup"),
    src.indexOf("export function findDeliveryForPickup"),
  );
  assert.match(supplyBlock, /pickup\.linkedSupplyRequestId/);
});

test("frontend: monitor TV passa rows pre-calculadas p/ nao recalcular vinculo com lista recortada", () => {
  const listPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../front-end/src/pages/OperatorMachinePage/OperatorMachineTasksList.tsx",
  );
  const tvPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../front-end/src/pages/DashboardPage/DashboardTvMonitorView.tsx",
  );
  const listSrc = readFileSync(listPath, "utf8");
  const tvSrc = readFileSync(tvPath, "utf8");
  assert.match(listSrc, /rows\?:\s*OperatorMachineTaskListRow\[\]/);
  assert.match(listSrc, /rowsOverride\s*\?\?/);
  assert.match(tvSrc, /rows=\{\[row\]\}/);
});

test("frontend: nao existe mais pareamento heuristico 'COMBINED' (sugestao ad-hoc entrega+retirada)", () => {
  const displayPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../front-end/src/pages/OperatorMachinePage/operator-machine-display.ts",
  );
  const src = readFileSync(displayPath, "utf8");
  assert.equal(src.includes("COMBINED"), false);
  assert.equal(src.includes("findCombinedTripPair"), false);
  assert.equal(src.includes("isCombinedTripSuggestion"), false);
  assert.match(src, /linkedToReplenishmentFlow/);
  assert.match(src, /isPickupLinkedToReplenishmentFlow/);
});

test("frontend: continuum retirada+abastecimento nao salta preparo sem DeliveryTask", () => {
  const src = readFileSync(flowPath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export function replenishmentPickupActiveStep"),
    src.indexOf("export function pickupWithReplenishmentFlowStepStatuses"),
  );
  // Com aviso OPEN e sem entrega, deve ficar na etapa 1 — nunca pular p/ 6.
  assert.match(fnBlock, /openSupply\.status === 'OPEN'/);
  assert.match(fnBlock, /return 1;/);
  assert.match(fnBlock, /Sem DeliveryTask/);
  // Só pós-entrega (COMPLETED) chega em aguardando retirada (= 6).
  assert.match(fnBlock, /deliveryComplete/);
  assert.match(fnBlock, /effectiveStatus/);
});
