import type { PlantMapUnit } from '@/constants/plant-map';

export const PLANT_MAP_PAGE_PATH = '/supervisao/mapa-planta' as const;

/** Query: abre o mapa no modo «clique para posicionar nova máquina». */
export const PLANT_MAP_CREATE_QUERY = 'criar' as const;
export const PLANT_MAP_UNIT_QUERY = 'unidade' as const;

export function plantMapCreateMachinePath(plantUnit?: PlantMapUnit): string {
  const params = new URLSearchParams();
  params.set(PLANT_MAP_CREATE_QUERY, '1');
  if (plantUnit) {
    params.set(PLANT_MAP_UNIT_QUERY, plantUnit);
  }
  return `${PLANT_MAP_PAGE_PATH}?${params.toString()}`;
}
