import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type { SectorListItem } from '@/types/machine.types';

export async function fetchSectors(): Promise<SectorListItem[]> {
  const res = await apiAuthFetch<{ sectors: SectorListItem[] }>(API_ENDPOINTS.SECTORS.LIST, {
    method: 'GET',
  });
  return res?.sectors ?? [];
}

export interface SectorMutationPayload {
  id: string;
  typeSector: string;
  createdAt: string;
  updatedAt: string;
}

export async function createSector(body: { typeSector: string }): Promise<SectorMutationPayload> {
  const res = await apiAuthFetch<SectorMutationPayload>(API_ENDPOINTS.SECTORS.LIST, {
    method: 'POST',
    body: JSON.stringify({ typeSector: body.typeSector.trim() }),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function updateSector(
  id: string,
  body: { typeSector: string },
): Promise<SectorMutationPayload> {
  const res = await apiAuthFetch<SectorMutationPayload>(API_ENDPOINTS.SECTORS.BY_ID(id), {
    method: 'PATCH',
    body: JSON.stringify({ typeSector: body.typeSector.trim() }),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function deleteSector(id: string): Promise<void> {
  await apiAuthFetch(API_ENDPOINTS.SECTORS.BY_ID(id), {
    method: 'DELETE',
  });
}
