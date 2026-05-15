import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type {
  FinalizeMachineCycleResponse,
  OperatorMachineBindResponse,
  OperatorMachinesListResponse,
  OperatorMachinePickupResponse,
  OperatorMyMachineResponse,
  OperatorReplenishmentRequestsResponse,
} from '@/types/operator-machine.types';

export async function fetchOperatorMyMachine() {
  const res = await apiAuthFetch<OperatorMyMachineResponse>(
    API_ENDPOINTS.OPERATOR_MACHINE.MY_MACHINE,
    { method: 'GET' },
  );
  return res?.machine ?? null;
}

export async function fetchOperatorMachinesForPicker() {
  const res = await apiAuthFetch<OperatorMachinesListResponse>(
    API_ENDPOINTS.OPERATOR_MACHINE.MACHINES,
    { method: 'GET' },
  );
  return res?.machines ?? [];
}

export async function postOperatorBindMachine(machineId: string) {
  const res = await apiAuthFetch<OperatorMachineBindResponse>(
    API_ENDPOINTS.OPERATOR_MACHINE.MY_MACHINE,
    {
      method: 'POST',
      body: JSON.stringify({ machineId }),
    },
  );
  if (!res?.machine) {
    throw new Error('Resposta inválida ao vincular máquina.');
  }
  return res.machine;
}

export async function deleteOperatorUnbindMachine() {
  await apiAuthFetch(API_ENDPOINTS.OPERATOR_MACHINE.MY_MACHINE, { method: 'DELETE' });
}

export async function fetchOperatorReplenishmentRequests(status?: string) {
  const params = new URLSearchParams();
  if (status !== undefined && status.trim() !== '') {
    params.set('status', status.trim());
  }
  const q = params.toString();
  const path = q
    ? `${API_ENDPOINTS.OPERATOR_MACHINE.REPLENISHMENT_REQUESTS}?${q}`
    : API_ENDPOINTS.OPERATOR_MACHINE.REPLENISHMENT_REQUESTS;
  const res = await apiAuthFetch<OperatorReplenishmentRequestsResponse>(path, {
    method: 'GET',
  });
  return res?.requests ?? [];
}

export async function postOperatorFinalizeCycle(body: {
  movementCube?: string;
  typeMovimentPallet?: 'FORKLIFT' | 'PALLET_TRUCK';
  priorityLevel?: 'VERY_HIGH' | 'HIGH' | 'NORMAL';
}) {
  const res = await apiAuthFetch<FinalizeMachineCycleResponse>(
    API_ENDPOINTS.OPERATOR_MACHINE.FINALIZE,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
  if (!res) {
    throw new Error('Resposta inválida ao finalizar ciclo.');
  }
  return res;
}

export async function postOperatorRequestPickup(requestId: string) {
  const res = await apiAuthFetch<OperatorMachinePickupResponse>(
    API_ENDPOINTS.OPERATOR_MACHINE.PICKUP(requestId),
    { method: 'POST' },
  );
  if (!res) {
    throw new Error('Resposta inválida ao solicitar retirada.');
  }
  return res;
}
