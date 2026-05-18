import type { AppUnit } from '@/types/user.types';

export type PlantMapUnit = 'PEDERTRACTOR' | 'TRACTOR';

export const PLANT_IMAGE_BY_UNIT: Record<PlantMapUnit, string> = {
  PEDERTRACTOR: '/images/planta-empresa-pedertractor.png',
  TRACTOR: '/images/planta-empresa-tractor.jpg',
};

export const PLANT_MAP_UNIT_SHORT_LABEL: Record<PlantMapUnit, string> = {
  PEDERTRACTOR: 'Unidade P',
  TRACTOR: 'Unidade T',
};

export function appUnitToPlantMapUnit(unit: AppUnit): PlantMapUnit {
  return unit === 'pedertractor' ? 'PEDERTRACTOR' : 'TRACTOR';
}

export function isPlantMapUnit(value: string): value is PlantMapUnit {
  return value === 'PEDERTRACTOR' || value === 'TRACTOR';
}
