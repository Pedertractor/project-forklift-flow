import assert from "node:assert/strict";
import test from "node:test";
import {
  compareTripQueuePriority,
  resolveLastCompletedTripTaskKind,
  tripQueueKindAffinityRank,
} from "./trip-queue-priority.js";

test("apos retirada: prefere combined, depois deliver, depois pickup", () => {
  assert.equal(tripQueueKindAffinityRank("combined", "PICKUP"), 0);
  assert.equal(tripQueueKindAffinityRank("deliver", "PICKUP"), 1);
  assert.equal(tripQueueKindAffinityRank("pickup", "PICKUP"), 2);
});

test("apos abastecimento/entrega: prefere combined, depois pickup, depois deliver", () => {
  assert.equal(tripQueueKindAffinityRank("combined", "DELIVER"), 0);
  assert.equal(tripQueueKindAffinityRank("pickup", "DELIVER"), 1);
  assert.equal(tripQueueKindAffinityRank("deliver", "DELIVER"), 2);
});

test("sem historico: combined sobe; standalones empatam em rank", () => {
  assert.equal(tripQueueKindAffinityRank("combined", null), 0);
  assert.equal(tripQueueKindAffinityRank("deliver", null), 1);
  assert.equal(tripQueueKindAffinityRank("pickup", null), 1);
});

test("preferred corta a fila mesmo com critica e afinidade pior", () => {
  const preferredPickup = {
    preferredMachine: true,
    effectiveCritical: false,
    kindRank: tripQueueKindAffinityRank("pickup", "PICKUP"),
    sortAt: 100,
  };
  const criticalDeliver = {
    preferredMachine: false,
    effectiveCritical: true,
    kindRank: tripQueueKindAffinityRank("deliver", "PICKUP"),
    sortAt: 1,
  };
  assert.ok(compareTripQueuePriority(preferredPickup, criticalDeliver) < 0);
});

test("critica sobe sobre afinidade quando nao ha preferred", () => {
  const criticalPickup = {
    preferredMachine: false,
    effectiveCritical: true,
    kindRank: tripQueueKindAffinityRank("pickup", "PICKUP"),
    sortAt: 50,
  };
  const normalDeliver = {
    preferredMachine: false,
    effectiveCritical: false,
    kindRank: tripQueueKindAffinityRank("deliver", "PICKUP"),
    sortAt: 1,
  };
  assert.ok(compareTripQueuePriority(criticalPickup, normalDeliver) < 0);
});

test("sem preferred/critica: afinidade decide antes da idade", () => {
  const olderPickup = {
    preferredMachine: false,
    effectiveCritical: false,
    kindRank: tripQueueKindAffinityRank("pickup", "PICKUP"),
    sortAt: 1,
  };
  const newerDeliver = {
    preferredMachine: false,
    effectiveCritical: false,
    kindRank: tripQueueKindAffinityRank("deliver", "PICKUP"),
    sortAt: 999,
  };
  assert.ok(compareTripQueuePriority(newerDeliver, olderPickup) < 0);
});

test("resolveLastCompletedTripTaskKind usa o completedAt mais recente", () => {
  const older = new Date("2026-07-15T10:00:00.000Z");
  const newer = new Date("2026-07-15T12:00:00.000Z");
  assert.equal(resolveLastCompletedTripTaskKind(newer, older), "DELIVER");
  assert.equal(resolveLastCompletedTripTaskKind(older, newer), "PICKUP");
  assert.equal(resolveLastCompletedTripTaskKind(null, newer), "PICKUP");
  assert.equal(resolveLastCompletedTripTaskKind(newer, null), "DELIVER");
  assert.equal(resolveLastCompletedTripTaskKind(null, null), null);
});
