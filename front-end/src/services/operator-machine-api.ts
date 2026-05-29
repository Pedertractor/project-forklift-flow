import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type {
  DeliveryTaskListItem,
  PickupTaskListItem,
} from '@/types/machine-task.types';
import type {
  OperatorMachineBindResponse,
  OperatorMachinesListResponse,
  OperatorMyMachineResponse,
  OperatorSupplyRequestsResponse,
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

export async function fetchOperatorMachineTasks() {
  const res = await apiAuthFetch<{
    deliveryTasks: DeliveryTaskListItem[];
    pickupTasks: PickupTaskListItem[];
    openSupply: { id: string; status: string } | null;
  }>(API_ENDPOINTS.OPERATOR_MACHINE.MACHINE_TASKS, { method: 'GET' });
  return {
    deliveryTasks: res?.deliveryTasks ?? [],
    pickupTasks: res?.pickupTasks ?? [],
    openSupply: res?.openSupply ?? null,
  };
}

export async function fetchOperatorSupplyRequests(status?: string) {
  const params = new URLSearchParams();
  if (status !== undefined && status.trim() !== '') {
    params.set('status', status.trim());
  }
  const q = params.toString();
  const path = q
    ? `${API_ENDPOINTS.OPERATOR_MACHINE.OPERATOR_SUPPLY_REQUESTS}?${q}`
    : API_ENDPOINTS.OPERATOR_MACHINE.OPERATOR_SUPPLY_REQUESTS;
  const res = await apiAuthFetch<OperatorSupplyRequestsResponse>(path, {
    method: 'GET',
  });
  return res?.operatorSupplyRequests ?? [];
}

export async function postOperatorPickupOnly(options?: {
  isCritical?: boolean;
  typeMovimentPallet?: 'FORKLIFT' | 'ANY';
}) {
  const res = await apiAuthFetch<{ pickupTask: PickupTaskListItem }>(
    API_ENDPOINTS.OPERATOR_MACHINE.PICKUP_ONLY,
    {
      method: 'POST',
      body: JSON.stringify({
        isCritical: options?.isCritical === true,
        ...(options?.typeMovimentPallet
          ? { typeMovimentPallet: options.typeMovimentPallet }
          : {}),
      }),
    },
  );
  if (!res?.pickupTask) {
    throw new Error('Resposta inválida ao solicitar retirada.');
  }
  return res;
}

export async function postCancelOperatorPickup(pickupTaskId: string) {
  const res = await apiAuthFetch<{ pickupTask: PickupTaskListItem }>(
    API_ENDPOINTS.OPERATOR_MACHINE.CANCEL_PICKUP(pickupTaskId),
    { method: 'POST' },
  );
  if (!res?.pickupTask) {
    throw new Error('Resposta inválida ao cancelar retirada.');
  }
  return res.pickupTask;
}

export async function postOperatorSupplyOnly() {
  const res = await apiAuthFetch<{
    operatorSupplyRequest: { id: string; status: string };
    created: boolean;
  }>(API_ENDPOINTS.OPERATOR_MACHINE.SUPPLY_ONLY, { method: 'POST' });
  if (!res?.operatorSupplyRequest) {
    throw new Error('Resposta inválida ao solicitar abastecimento.');
  }
  return res;
}

export async function postOperatorPickupWithReplenishment(options?: {
  isCritical?: boolean;
  typeMovimentPallet?: 'FORKLIFT' | 'ANY';
}) {
  const res = await apiAuthFetch<{
    pickupTask: PickupTaskListItem;
    operatorSupplyRequest: { id: string; status: string };
  }>(API_ENDPOINTS.OPERATOR_MACHINE.PICKUP_WITH_REPLENISHMENT, {
    method: 'POST',
    body: JSON.stringify({
      isCritical: options?.isCritical === true,
      ...(options?.typeMovimentPallet
        ? { typeMovimentPallet: options.typeMovimentPallet }
        : {}),
    }),
  });
  if (!res?.pickupTask) {
    throw new Error('Resposta inválida ao solicitar retirada e abastecimento.');
  }
  return res;
}
