import assert from "node:assert/strict";
import test from "node:test";
import { tripQueueKindAffinityRank } from "../utils/trip-queue-priority.js";

/**
 * Contrato: tarefas em sugestao de viagem OPEN nao aparecem como avulsas;
 * apenas pickups/entregas fora do par vinculado entram na fila standalone.
 */
test("pickup-only queue: todos os pickups ficam sem par quando nao ha entregas", () => {
  const linkedPickupIds = new Set<string>();
  const openPickupIds = ["pickup-a"];
  const standalone = openPickupIds.filter((id) => !linkedPickupIds.has(id));
  assert.deepEqual(standalone, ["pickup-a"]);
});

test("pickup-only queue: pickup vinculado a sugestao nao lista como avulso", () => {
  const linkedPickupIds = new Set(["pickup-a"]);
  const openPickupIds = ["pickup-a", "pickup-b"];
  const standalone = openPickupIds.filter((id) => !linkedPickupIds.has(id));
  assert.deepEqual(standalone, ["pickup-b"]);
});

test("entrega vinculada a sugestao nao lista como avulsa", () => {
  const linkedDeliverIds = new Set(["deliver-a"]);
  const openDeliverIds = ["deliver-a", "deliver-b"];
  const standalone = openDeliverIds.filter((id) => !linkedDeliverIds.has(id));
  assert.deepEqual(standalone, ["deliver-b"]);
});

test("tela principal: avulsa so entra se for critica", () => {
  const tasks = [
    { id: "d1", isCritical: true, linked: false },
    { id: "d2", isCritical: false, linked: false },
    { id: "d3", isCritical: true, linked: true },
  ];
  const mainScreen = tasks
    .filter((t) => !t.linked && t.isCritical)
    .map((t) => t.id);
  assert.deepEqual(mainScreen, ["d1"]);
});

test("tela principal vazia: promove avulsa nao critica por afinidade (apos retirada = entrega)", () => {
  // Fallback usa afinidade da última tarefa; só empata por idade.
  const candidates = [
    {
      id: "d1",
      kind: "deliver" as const,
      createdAt: new Date("2026-01-02"),
      kindRank: tripQueueKindAffinityRank("deliver", "PICKUP"),
    },
    {
      id: "p1",
      kind: "pickup" as const,
      createdAt: new Date("2026-01-01"),
      kindRank: tripQueueKindAffinityRank("pickup", "PICKUP"),
    },
    {
      id: "d2",
      kind: "deliver" as const,
      createdAt: new Date("2026-01-03"),
      kindRank: tripQueueKindAffinityRank("deliver", "PICKUP"),
    },
  ];
  const best = candidates.reduce((current, cur) => {
    if (cur.kindRank !== current.kindRank) {
      return cur.kindRank < current.kindRank ? cur : current;
    }
    return cur.createdAt.getTime() < current.createdAt.getTime() ? cur : current;
  });
  assert.equal(best.id, "d1");
});

test("retirada com reposicao nao entra como avulsa na fila do empilhadeirista", () => {
  const pickups = [
    { id: "p-rep", triggersReplenishment: true, isCritical: false },
    { id: "p-only", triggersReplenishment: false, isCritical: false },
  ];
  const standalone = pickups.filter((p) => !p.triggersReplenishment);
  assert.deepEqual(
    standalone.map((p) => p.id),
    ["p-only"],
  );
});

test("pickup-only queue: mesmo pickup id nao deve aparecer duas vezes na lista", () => {
  const ids = ["pickup-a", "pickup-a", "pickup-b"];
  const seen = new Set<string>();
  const unique = ids.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  assert.deepEqual(unique, ["pickup-a", "pickup-b"]);
});
