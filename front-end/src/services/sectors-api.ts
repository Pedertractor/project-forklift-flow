import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type { SectorListItem } from '@/types/machine.types';

export async function fetchSectors(): Promise<SectorListItem[]> {
  const res = await apiAuthFetch<{ sectors: SectorListItem[] }>(API_ENDPOINTS.SECTORS.LIST, {
    method: 'GET',
  });
  return res?.sectors ?? [];
}
