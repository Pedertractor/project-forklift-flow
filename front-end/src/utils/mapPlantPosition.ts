/** Limita coordenada normalizada ao intervalo [0, 1]. */
export function clampMapNormalized(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Posicao opcional no plano da planta, codificada no campo textual `position` da maquina.
 * Formato: `MAP:nx,ny` com nx e ny normalizados entre 0 e 1 (origem canto superior esquerdo da imagem).
 */
export function parseMapPlacementFromPosition(position: string): { nx: number; ny: number } | null {
  const trimmed = position.trim();
  const match = /^MAP:\s*([\d.]+)\s*,\s*([\d.]+)\s*$/i.exec(trimmed);
  if (!match) {
    return null;
  }
  const nx = Number(match[1]);
  const ny = Number(match[2]);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
    return null;
  }
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
    return null;
  }
  return { nx, ny };
}

/** Serializa posicao para o campo `position` da maquina. */
export function formatMapPlacement(nx: number, ny: number): string {
  const x = clampMapNormalized(nx);
  const y = clampMapNormalized(ny);
  return `MAP:${x.toFixed(4)},${y.toFixed(4)}`;
}

/** Converte pixel no espaco da imagem da planta para coordenadas normalizadas. */
export function plantPixelsToNormalized(
  x: number,
  y: number,
  plantWidth: number,
  plantHeight: number,
): { nx: number; ny: number } {
  if (plantWidth <= 0 || plantHeight <= 0) {
    return { nx: 0.5, ny: 0.5 };
  }
  return {
    nx: clampMapNormalized(x / plantWidth),
    ny: clampMapNormalized(y / plantHeight),
  };
}

/** Converte ponteiro no viewport do Stage para pixel no desenho da planta. */
export function stagePointerToPlantPixels(
  pointer: { x: number; y: number },
  stagePos: { x: number; y: number },
  scale: number,
): { x: number; y: number } {
  const s = scale > 0 ? scale : 1;
  return {
    x: (pointer.x - stagePos.x) / s,
    y: (pointer.y - stagePos.y) / s,
  };
}

/** Distribui pontos em grade dentro da area util (margens) quando nao ha `MAP:`. */
export function layoutMapSlotsNormalized(
  count: number,
  columns: number,
): { nx: number; ny: number }[] {
  if (count <= 0) {
    return [];
  }
  const cols = Math.max(1, Math.min(columns, count));
  const rows = Math.ceil(count / cols);
  const margin = 0.08;
  const span = 1 - 2 * margin;
  const result: { nx: number; ny: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const nx = margin + (span * (col + 0.5)) / cols;
    const ny = margin + (span * (row + 0.5)) / rows;
    result.push({ nx, ny });
  }
  return result;
}
