import assert from "node:assert/strict";
import test from "node:test";
import {
  endOfOperationalDay,
  formatOperationalDateLabel,
  operationalPeakSlotIndex,
  parseOperationalIsoDate,
  startOfOperationalDay,
} from "./operational-timezone.js";

test("operationalPeakSlotIndex usa horario de Brasilia independente do fuso do servidor", () => {
  // 17:30 UTC = 14:30 em Brasilia (UTC-3, julho)
  const utcInstant = new Date("2026-07-09T17:30:00.000Z");
  assert.equal(operationalPeakSlotIndex(utcInstant), 29);
});

test("parseOperationalIsoDate e limites do dia respeitam America/Sao_Paulo", () => {
  const anchor = parseOperationalIsoDate("2026-07-09");
  assert.ok(anchor);

  const rangeStart = startOfOperationalDay(anchor!);
  const rangeEnd = endOfOperationalDay(anchor!);

  assert.equal(formatOperationalDateLabel(rangeStart), "2026-07-09");
  assert.equal(formatOperationalDateLabel(rangeEnd), "2026-07-09");
  assert.equal(rangeStart.toISOString(), "2026-07-09T03:00:00.000Z");
  assert.equal(rangeEnd.toISOString(), "2026-07-10T02:59:59.999Z");
});
