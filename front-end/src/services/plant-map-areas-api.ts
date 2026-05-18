import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type {
  PlantMapArea,
  PlantMapUnitValue,
  UpsertPlantMapAreaBody,
} from '@/types/plant-map-area.types';

export async function fetchPlantMapAreas(
  plantUnit: PlantMapUnitValue,
): Promise<PlantMapArea[]> {
  const params = new URLSearchParams({ plantUnit });
  const res = await apiAuthFetch<{ areas: PlantMapArea[] }>(
    `${API_ENDPOINTS.PLANT_MAP.AREAS}?${params}`,
    { method: 'GET' },
  );
  return res?.areas ?? [];
}

export async function upsertPlantMapArea(
  body: UpsertPlantMapAreaBody,
): Promise<PlantMapArea> {
  const res = await apiAuthFetch<{ area: PlantMapArea }>(API_ENDPOINTS.PLANT_MAP.AREAS, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res?.area) {
    throw new Error('Resposta invalida ao salvar area do mapa.');
  }
  return res.area;
}

export async function deletePlantMapArea(areaId: string): Promise<void> {
  await apiAuthFetch(API_ENDPOINTS.PLANT_MAP.AREA_BY_ID(areaId), {
    method: 'DELETE',
  });
}
