import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type { DeliveryTaskListItem } from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';

export function normalizeOperatorSupplyRequests(
  data: unknown,
): OperatorMachineSupplyRequestListItem[] {
  if (Array.isArray(data)) {
    return data as OperatorMachineSupplyRequestListItem[];
  }
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray(
      (data as { operatorSupplyRequests?: unknown }).operatorSupplyRequests,
    )
  ) {
    return (data as { operatorSupplyRequests: OperatorMachineSupplyRequestListItem[] })
      .operatorSupplyRequests;
  }
  return [];
}

export async function fetchPendingSupplyRequests(): Promise<
  OperatorMachineSupplyRequestListItem[]
> {
  const res = await apiAuthFetch<unknown>(
    API_ENDPOINTS.DELIVERY_TASKS.PENDING_SUPPLY_REQUESTS,
    { method: 'GET' },
  );
  return normalizeOperatorSupplyRequests(res);
}

/** React Query key — não compartilhar com `fetchPendingPreparationRequests` (objeto). */
export const SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY = [
  'supply',
  'pending-operator-supply-requests',
] as const;

export async function postCreateDeliveryTask(body: {
  machineId: string;
  movementCube: string;
  typeMovimentPallet: 'FORKLIFT' | 'ANY';
  isCritical?: boolean;
  markReady?: boolean;
  operatorSupplyRequestId?: string;
}) {
  const res = await apiAuthFetch<{ task: DeliveryTaskListItem }>(
    API_ENDPOINTS.DELIVERY_TASKS.LIST,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
  if (!res?.task) {
    throw new Error('Resposta inválida ao criar tarefa de entrega.');
  }
  return res.task;
}

export async function postMarkDeliveryPrepared(taskId: string) {
  const res = await apiAuthFetch<{ task: DeliveryTaskListItem }>(
    API_ENDPOINTS.DELIVERY_TASKS.MARK_PREPARED(taskId),
    { method: 'POST' },
  );
  if (!res?.task) {
    throw new Error('Resposta inválida ao marcar pallet pronto.');
  }
  return res.task;
}
