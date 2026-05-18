import type { PlantMapAreaKindValue } from '@/types/plant-map-area.types';

export const PLANT_MAP_AREA_KIND_LABEL: Record<PlantMapAreaKindValue, string> = {
  RECEIVING: 'Recebimento',
  EXPEDITION: 'Expedição',
};

export function plantMapAreaFill(kind: PlantMapAreaKindValue): string {
  return kind === 'RECEIVING' ? 'rgba(217, 119, 6, 0.28)' : 'rgba(79, 70, 229, 0.28)';
}

export function plantMapAreaStroke(kind: PlantMapAreaKindValue): string {
  return kind === 'RECEIVING' ? '#d97706' : '#4f46e5';
}

export function plantMapAreaLegendItems(): {
  kind: PlantMapAreaKindValue;
  label: string;
  color: string;
}[] {
  return (['RECEIVING', 'EXPEDITION'] as const).map((kind) => ({
    kind,
    label: PLANT_MAP_AREA_KIND_LABEL[kind],
    color: plantMapAreaStroke(kind),
  }));
}
