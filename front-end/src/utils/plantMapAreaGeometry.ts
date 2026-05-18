import { clampMapNormalized } from '@/utils/mapPlantPosition';

const MIN_SIDE = 0.02;

/** Retangulo normalizado a partir de dois cantos (arraste no mapa). */
export function normalizedRectFromCorners(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { nx: number; ny: number; nw: number; nh: number } | null {
  const x1 = clampMapNormalized(Math.min(ax, bx));
  const y1 = clampMapNormalized(Math.min(ay, by));
  const x2 = clampMapNormalized(Math.max(ax, bx));
  const y2 = clampMapNormalized(Math.max(ay, by));
  const nw = x2 - x1;
  const nh = y2 - y1;
  if (nw < MIN_SIDE || nh < MIN_SIDE) {
    return null;
  }
  return { nx: x1, ny: y1, nw, nh };
}
