import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type { PlantMapUnit } from '@/constants/plant-map';
import type { MachineStreetBrief } from '@/types/machine.types';

export type MovimentOperatorPriorityOperator = {
  id: string;
  name: string;
  card: string;
  unit: string;
  sectorId: string | null;
  sector: { id: string; typeSector: string } | null;
  linkedMachineIds: string[];
};

export type MovimentOperatorPriorityMachine = {
  id: string;
  name: string;
  assetNumber: string | null;
  pillar: string | null;
  sectorId: string;
  plantUnit: PlantMapUnit;
  sector: { id: string; typeSector: string };
  typeMachine: { id: string; name: string; urlImage: string };
  machineStreet: MachineStreetBrief | null;
};

export type MovimentOperatorPriorityBoard = {
  operators: MovimentOperatorPriorityOperator[];
  machines: MovimentOperatorPriorityMachine[];
};

export async function fetchMovimentOperatorPriorityBoard(options?: {
  sectorId?: string;
}): Promise<MovimentOperatorPriorityBoard> {
  const params = new URLSearchParams();
  if (options?.sectorId?.trim()) {
    params.set('sectorId', options.sectorId.trim());
  }
  const q = params.toString();
  const res = await apiAuthFetch<MovimentOperatorPriorityBoard>(
    `${API_ENDPOINTS.MOVIMENT_OPERATOR_MACHINE_LINKS.BOARD}${q ? `?${q}` : ''}`,
    { method: 'GET' },
  );
  return {
    operators: res?.operators ?? [],
    machines: res?.machines ?? [],
  };
}

export async function replaceOperatorPreferredMachines(
  operatorId: string,
  machineIds: string[],
) {
  const res = await apiAuthFetch<{ links: unknown[] }>(
    API_ENDPOINTS.MOVIMENT_OPERATOR_MACHINE_LINKS.REPLACE_OPERATOR(operatorId),
    {
      method: 'PUT',
      body: JSON.stringify({ machineIds }),
    },
  );
  return res?.links ?? [];
}

export async function linkOperatorPreferredMachine(
  operatorId: string,
  machineId: string,
) {
  return apiAuthFetch(API_ENDPOINTS.MOVIMENT_OPERATOR_MACHINE_LINKS.LIST, {
    method: 'POST',
    body: JSON.stringify({ operatorId, machineId }),
  });
}

export async function unlinkOperatorPreferredMachine(
  operatorId: string,
  machineId: string,
) {
  const params = new URLSearchParams({ operatorId, machineId });
  return apiAuthFetch(
    `${API_ENDPOINTS.MOVIMENT_OPERATOR_MACHINE_LINKS.BY_PAIR}?${params}`,
    { method: 'DELETE' },
  );
}
