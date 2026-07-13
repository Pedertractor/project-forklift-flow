import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type { MachineStreetListItem } from '@/types/machine.types';

export type FetchMachineStreetsOptions = {
  sectorId?: string;
};

function machineStreetsListQuery(options?: FetchMachineStreetsOptions): string {
  const params = new URLSearchParams();
  if (options?.sectorId?.trim()) {
    params.set('sectorId', options.sectorId.trim());
  }
  const q = params.toString();
  return q ? `?${q}` : '';
}

export async function fetchMachineStreets(
  options?: FetchMachineStreetsOptions,
): Promise<MachineStreetListItem[]> {
  const res = await apiAuthFetch<{ machineStreets: MachineStreetListItem[] }>(
    `${API_ENDPOINTS.MACHINE_STREETS.LIST}${machineStreetsListQuery(options)}`,
    { method: 'GET' },
  );
  return res?.machineStreets ?? [];
}

export async function createMachineStreet(input: {
  name: string;
  machineStreetColor: string;
  sectorId?: string;
}): Promise<MachineStreetListItem> {
  const body: {
    name: string;
    machineStreetColor: string;
    sectorId?: string;
  } = {
    name: input.name.trim(),
    machineStreetColor: input.machineStreetColor.trim(),
  };
  if (input.sectorId?.trim()) {
    body.sectorId = input.sectorId.trim();
  }
  const res = await apiAuthFetch<MachineStreetListItem>(
    API_ENDPOINTS.MACHINE_STREETS.LIST,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function updateMachineStreet(
  id: string,
  patch: { name?: string; machineStreetColor?: string },
): Promise<MachineStreetListItem> {
  const res = await apiAuthFetch<MachineStreetListItem>(
    API_ENDPOINTS.MACHINE_STREETS.BY_ID(id),
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function deleteMachineStreet(id: string): Promise<void> {
  await apiAuthFetch(API_ENDPOINTS.MACHINE_STREETS.BY_ID(id), {
    method: 'DELETE',
  });
}
