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

test("frontend: canCancelPickupRequest bloqueia quando ha pallet no recebimento", () => {
  const src = readFileSync(flowPath, "utf8");
  const fnBlock = src.slice(
    src.indexOf("export function canCancelPickupRequest"),
    src.indexOf("export function canRequestPickup"),
  );
  assert.match(fnBlock, /hasPalletAtReceivingForMachine/);
  assert.match(fnBlock, /return false/);
});

test("cancel pickup: service bloqueia quando ha entrega preparada no recebimento", () => {
  const src = readFileSync(servicePath, "utf8");
  const cancelBlock = src.slice(
    src.indexOf("export async function cancelPickupRequestByOperator"),
    src.indexOf("return {\n    pickupTask: updated,"),
  );
  assert.match(cancelBlock, /findPalletAtReceivingForMachine/);
  assert.match(cancelBlock, /PickupTaskCannotBeCanceledError/);
});
