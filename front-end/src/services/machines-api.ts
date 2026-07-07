import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import type { PlantMapUnit } from '@/constants/plant-map';
import { apiAuthFetch } from '@/lib/api';
import type {
  CreateMachinePostBody,
  MachineDetail,
  MachineListItem,
  MachineProductionStatus,
} from '@/types/machine.types';

export type FetchMachinesOptions = {
  sectorId?: string;
  plantUnit?: PlantMapUnit;
};

function machinesListQuery(options?: FetchMachinesOptions): string {
  const params = new URLSearchParams();
  if (options?.sectorId?.trim()) {
    params.set('sectorId', options.sectorId.trim());
  }
  if (options?.plantUnit) {
    params.set('plantUnit', options.plantUnit);
  }
  const q = params.toString();
  return q ? `?${q}` : '';
}

export async function fetchMachines(options?: FetchMachinesOptions): Promise<MachineListItem[]> {
  const res = await apiAuthFetch<{ machines: MachineListItem[] }>(
    `${API_ENDPOINTS.MACHINES.LIST}${machinesListQuery(options)}`,
    { method: 'GET' },
  );
  return res?.machines ?? [];
}

export async function fetchMachineById(id: string): Promise<MachineDetail> {
  const res = await apiAuthFetch<MachineDetail>(API_ENDPOINTS.MACHINES.BY_ID(id), { method: 'GET' });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function createMachine(input: {
  name: string;
  plantUnit: PlantMapUnit;
  typeMachineId: string;
  sectorId: string;
  userId?: string | null;
}): Promise<MachineDetail> {
  const body: CreateMachinePostBody = {
    name: input.name.trim(),
    plantUnit: input.plantUnit,
    typeMachineId: input.typeMachineId.trim(),
    sectorId: input.sectorId.trim(),
  };
  if (input.userId !== undefined && input.userId !== null && input.userId.trim() !== '') {
    body.userId = input.userId.trim();
  }
  const res = await apiAuthFetch<MachineDetail>(API_ENDPOINTS.MACHINES.LIST, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function updateMachine(
  id: string,
  patch: {
    name?: string;
    plantUnit?: PlantMapUnit;
    typeMachineId?: string;
    sectorId?: string;
    userId?: string | null;
    productionStatus?: MachineProductionStatus;
  },
): Promise<MachineDetail> {
  const res = await apiAuthFetch<MachineDetail>(API_ENDPOINTS.MACHINES.BY_ID(id), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function deleteMachine(id: string): Promise<void> {
  await apiAuthFetch(API_ENDPOINTS.MACHINES.BY_ID(id), { method: 'DELETE' });
}
