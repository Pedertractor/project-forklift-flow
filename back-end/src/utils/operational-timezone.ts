import { endOfDay, format, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/** Fuso operacional da planta (eixo do dashboard e filtros por dia). */
export const OPERATIONAL_TIMEZONE = "America/Sao_Paulo";

const PEAK_SLOT_MINUTES = 30;
const PEAK_SLOTS_PER_DAY = (24 * 60) / PEAK_SLOT_MINUTES;

export function parseOperationalIsoDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return fromZonedTime(
    new Date(year, month - 1, day, 12, 0, 0, 0),
    OPERATIONAL_TIMEZONE,
  );
}

export function startOfOperationalDay(date: Date): Date {
  const zoned = toZonedTime(date, OPERATIONAL_TIMEZONE);
  return fromZonedTime(startOfDay(zoned), OPERATIONAL_TIMEZONE);
}

export function endOfOperationalDay(date: Date): Date {
  const zoned = toZonedTime(date, OPERATIONAL_TIMEZONE);
  return fromZonedTime(endOfDay(zoned), OPERATIONAL_TIMEZONE);
}

export function formatOperationalDateLabel(date: Date): string {
  return format(toZonedTime(date, OPERATIONAL_TIMEZONE), "yyyy-MM-dd");
}

export function operationalPeakSlotIndex(date: Date): number {
  const zoned = toZonedTime(date, OPERATIONAL_TIMEZONE);
  const minutes = zoned.getHours() * 60 + zoned.getMinutes();
  return Math.min(
    PEAK_SLOTS_PER_DAY - 1,
    Math.floor(minutes / PEAK_SLOT_MINUTES),
  );
}
