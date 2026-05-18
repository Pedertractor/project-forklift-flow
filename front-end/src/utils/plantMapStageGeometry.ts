const MAP_PADDING = 0;

/** Menor escala permitida: imagem inteira visível no container (sem zoom out além do “fit”). */
export function computePlantMapFitScale(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number,
): number {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return 1;
  }
  const contentW = imgWidth + 2 * MAP_PADDING;
  const contentH = imgHeight + 2 * MAP_PADDING;
  return Math.min(containerWidth / contentW, containerHeight / contentH);
}

export function computePlantMapInitialTransform(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number,
): { scale: number; x: number; y: number } {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { scale: 1, x: 0, y: 0 };
  }
  const contentW = imgWidth + 2 * MAP_PADDING;
  const contentH = imgHeight + 2 * MAP_PADDING;
  const scale = computePlantMapFitScale(imgWidth, imgHeight, containerWidth, containerHeight);
  const x = (containerWidth - contentW * scale) / 2;
  const y = (containerHeight - contentH * scale) / 2;
  return { scale, x, y };
}

export interface PlantMapLetterboxFreeze {
  /** Quando a planta cabe na largura do container, mantém este x em vez de recentralizar a cada medição. */
  x: number | null;
  /** Quando a planta cabe na altura do container, mantém este y (evita “fuga” com ResizeObserver / flex). */
  y: number | null;
}

export function clampPlantMapStagePos(
  pos: { x: number; y: number },
  params: {
    scale: number;
    contentWidth: number;
    contentHeight: number;
    containerWidth: number;
    containerHeight: number;
  },
  letterboxFreeze?: PlantMapLetterboxFreeze,
): { x: number; y: number } {
  const { scale, contentWidth, contentHeight, containerWidth, containerHeight } = params;
  const scaledW = contentWidth * scale;
  const scaledH = contentHeight * scale;
  const centerX = (containerWidth - scaledW) / 2;
  const centerY = (containerHeight - scaledH) / 2;
  const minX = scaledW <= containerWidth ? centerX : containerWidth - scaledW;
  const maxX = scaledW <= containerWidth ? centerX : 0;
  const minY = scaledH <= containerHeight ? centerY : containerHeight - scaledH;
  const maxY = scaledH <= containerHeight ? centerY : 0;

  let x: number;
  if (scaledW <= containerWidth && letterboxFreeze?.x != null) {
    x = letterboxFreeze.x;
  } else {
    x = Math.max(minX, Math.min(maxX, pos.x));
  }

  let y: number;
  if (scaledH <= containerHeight && letterboxFreeze?.y != null) {
    y = letterboxFreeze.y;
  } else {
    y = Math.max(minY, Math.min(maxY, pos.y));
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
  };
}
