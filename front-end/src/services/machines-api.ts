import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import type { PlantMapUnit } from '@/constants/plant-map';
import { apiAuthFetch } from '@/lib/api';
import type {
  CreateMachinePostBody,
  MachineDetail,
  MachineListItem,
  MachineProductionStatus,
} from '@/types/machine.types';
import type { MachineToolingListItem } from '@/types/operator-machine.types';

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
  assetNumber: string;
  pillar: string;
  userId?: string | null;
  machineStreetId?: string | null;
}): Promise<MachineDetail> {
  const body: CreateMachinePostBody = {
    name: input.name.trim(),
    plantUnit: input.plantUnit,
    typeMachineId: input.typeMachineId.trim(),
    sectorId: input.sectorId.trim(),
    assetNumber: input.assetNumber.trim(),
    pillar: input.pillar.trim(),
  };
  if (input.userId !== undefined && input.userId !== null && input.userId.trim() !== '') {
    body.userId = input.userId.trim();
  }
  if (input.machineStreetId !== undefined) {
    body.machineStreetId =
      input.machineStreetId === null || input.machineStreetId.trim() === ''
        ? null
        : input.machineStreetId.trim();
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
    machineStreetId?: string | null;
    productionStatus?: MachineProductionStatus;
    assetNumber?: string | null;
    pillar?: string | null;
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

export async function fetchMachineToolings(machineId: string) {
  const res = await apiAuthFetch<{ toolings: MachineToolingListItem[] }>(
    API_ENDPOINTS.MACHINES.TOOLINGS(machineId),
    { method: 'GET' },
  );
  return res?.toolings ?? [];
}

export async function createMachineTooling(machineId: string, name: string) {
  const res = await apiAuthFetch<{ tooling: MachineToolingListItem }>(
    API_ENDPOINTS.MACHINES.TOOLINGS(machineId),
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    },
  );
  if (!res?.tooling) {
    throw new Error('Resposta inválida ao cadastrar ferramental.');
  }
  return res.tooling;
}

export async function updateMachineTooling(
  machineId: string,
  toolingId: string,
  name: string,
) {
  const res = await apiAuthFetch<{ tooling: MachineToolingListItem }>(
    API_ENDPOINTS.MACHINES.TOOLING_BY_ID(machineId, toolingId),
    {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    },
  );
  if (!res?.tooling) {
    throw new Error('Resposta inválida ao atualizar ferramental.');
  }
  return res.tooling;
}

export async function deleteMachineTooling(machineId: string, toolingId: string) {
  const res = await apiAuthFetch<{ tooling: MachineToolingListItem }>(
    API_ENDPOINTS.MACHINES.TOOLING_BY_ID(machineId, toolingId),
    { method: 'DELETE' },
  );
  if (!res?.tooling) {
    throw new Error('Resposta inválida ao remover ferramental.');
  }
  return res.tooling;
}
