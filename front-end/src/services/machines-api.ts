import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type {
  CreateMachinePostBody,
  MachineDetail,
  MachineListItem,
} from '@/types/machine.types';

export async function fetchMachines(sectorId?: string): Promise<MachineListItem[]> {
  const q =
    typeof sectorId === 'string' && sectorId.trim() !== ''
      ? `?sectorId=${encodeURIComponent(sectorId.trim())}`
      : '';
  const res = await apiAuthFetch<{ machines: MachineListItem[] }>(
    `${API_ENDPOINTS.MACHINES.LIST}${q}`,
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
  position: string;
  typeMachineId: string;
  sectorId: string;
  userId?: string | null;
}): Promise<MachineDetail> {
  const body: CreateMachinePostBody = {
    name: input.name.trim(),
    position: input.position.trim(),
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
    position?: string;
    typeMachineId?: string;
    sectorId?: string;
    userId?: string | null;
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
