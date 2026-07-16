import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const servicePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "operator-machine.service.ts",
);

const flowPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../front-end/src/pages/OperatorMachinePage/operator-machine-flow.ts",
);

test("pickup-only: service nao exige entrega concluida antes de criar retirada", () => {
  const src = readFileSync(servicePath, "utf8");
  assert.equal(src.includes("assertMaterialOnMachine"), false);
  assert.equal(src.includes("MachineHasNoMaterialForPickupError"), false);
});

test("pickup-only: requestPickupOnly nao chama findLatestCompletedForMachine", () => {
  const src = readFileSync(servicePath, "utf8");
  const pickupOnlyBlock = src.slice(
    src.indexOf("export async function requestPickupOnly"),
    src.indexOf("export async function requestSupplyOnly"),
  );
  assert.equal(
    pickupOnlyBlock.includes("findLatestCompletedForMachine"),
    false,
  );
});

test("pickup-only: usa o link service explicito (linkedSupplyRequestId), sem heuristica de status/data", () => {
  const src = readFileSync(servicePath, "utf8");
  const pickupOnlyBlock = src.slice(
    src.indexOf("export async function requestPickupOnly"),
    src.indexOf("export async function requestSupplyOnly"),
  );
  assert.match(pickupOnlyBlock, /linkNewPickupToEligibleSupplyRequest/);
  assert.equal(pickupOnlyBlock.includes("triggersReplenishment"), false);
});

test("pickup+replenishment: bloqueia (nao reusa) quando ja ha aviso elegivel via findFirstEligibleUnclaimedForMachine", () => {
  const src = readFileSync(servicePath, "utf8");
  const block = src.slice(
    src.indexOf("export async function requestPickupWithReplenishment"),
    src.indexOf("export async function cancelPickupRequestByOperator"),
  );
  assert.match(block, /findFirstEligibleUnclaimedForMachine/);
  assert.match(block, /throw new OperatorSupplyRequestAlreadyOpenError/);
  // Nunca mais deve linkar retirada nova a aviso ja existente por esta via —
  // so cria par genuinamente novo (aviso + retirada) na mesma transacao.
  // A retirada avulsa (requestPickupOnly) continua amarrando automaticamente.
  assert.equal(block.includes("linkNewPickupToEligibleSupplyRequest"), false);
  assert.equal(block.includes("triggersReplenishment"), false);
});

test("pickup-supply-link: vinculo e unico por retirada (linkedSupplyRequest), sem reamarrar retirada ja vinculada", () => {
  const linkServicePath = join(
    dirname(fileURLToPath(import.meta.url)),
    "pickup-supply-link.service.ts",
  );
  const src = readFileSync(linkServicePath, "utf8");
  assert.match(src, /linkNewPickupToEligibleSupplyRequest/);
  assert.match(src, /linkNewSupplyRequestToEligiblePickup/);
  assert.match(src, /linkedSupplyRequest:\s*\{\s*connect/);
});

test("frontend: canRequestPickupWithReplenishment bloqueia com aviso ja aberto (nao so com pallet a caminho)", () => {
  const src = readFileSync(flowPath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export function canRequestPickupWithReplenishment"),
    src.indexOf("export function pickupBlockedReason"),
  );
  assert.match(fnBlock, /hasIncomingDelivery\(deliveryTasks\)/);
  assert.match(fnBlock, /hasOpenOperatorSupply\(openSupply\)/);
});

test("frontend: dialog nunca forca supply:true — card combinado fica indisponivel com aviso ja aberto", () => {
  const dialogPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../front-end/src/pages/OperatorMachinePage/OperatorMachineOpenRequestDialog.tsx",
  );
  const src = readFileSync(dialogPath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("const buildSelection"),
    src.indexOf("const handlePrimary"),
  );
  assert.match(fnBlock, /supply: supply && supplyAvailable,/);
  assert.equal(fnBlock.includes("supplyAlreadyOpen"), false);
});

test("frontend: canRequestPickup sempre retorna true", () => {
  const src = readFileSync(flowPath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export function canRequestPickup"),
    src.indexOf("export function canRequestPickupWithReplenishment"),
  );
  assert.match(fnBlock, /return true;/);
});

test("frontend: pickupBlockedReason nao bloqueia retirada", () => {
  const src = readFileSync(flowPath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export function pickupBlockedReason"),
    src.indexOf("export function hasOpenPickup"),
  );
  assert.match(fnBlock, /return null;/);
});

test("frontend: canCancelPickupRequest bloqueia so o continuum com pallet pronto no recebimento", () => {
  const src = readFileSync(flowPath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export function canCancelPickupRequest"),
    src.indexOf("export const PALLET_AT_RECEIVING_SUPPLY_BLOCKED_MESSAGE"),
  );
  assert.match(fnBlock, /linkedSupplyRequestId/);
  assert.match(fnBlock, /findSupplyForPickup/);
  assert.match(fnBlock, /preparedAt/);
  // Retirada avulsa nao e bloqueada por pallet de outro continuum.
  assert.equal(fnBlock.includes("hasPalletAtReceivingForMachine"), false);
});

test("cancel pickup: service bloqueia so quando o continuum vinculado tem pallet pronto", () => {
  const src = readFileSync(servicePath, "utf8");
  const cancelBlock = src.slice(
    src.indexOf("export async function cancelPickupRequestByOperator"),
    src.indexOf("return {\n    pickupTask: updated,"),
  );
  assert.match(cancelBlock, /linkedSupplyRequestId/);
  assert.match(cancelBlock, /preparedAt/);
  assert.match(cancelBlock, /PickupTaskCannotBeCanceledError/);
  assert.equal(cancelBlock.includes("findPalletAtReceivingForMachine"), false);
});
