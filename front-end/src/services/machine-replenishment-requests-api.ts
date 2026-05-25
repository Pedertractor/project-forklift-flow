import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import {
  fetchPendingSupplyRequests,
  postCreateDeliveryTask,
  postMarkDeliveryPrepared,
} from '@/services/delivery-tasks-api';
import type { DeliveryTaskListItem } from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import type {
  MarkPalletReadyResponse,
  PriorityLevelValue,
  ReplenishmentRequestListItem,
  RequestStatusValue,
} from '@/types/replenishment-request.types';

export type PendingPreparationListPayload = {
  requests: ReplenishmentRequestListItem[];
  operatorSupplyRequests: OperatorMachineSupplyRequestListItem[];
};

function mapTaskStatus(task: DeliveryTaskListItem): RequestStatusValue {
  if (task.status === 'COMPLETED') return 'COMPLETED';
  if (task.status === 'CANCELED') return 'CANCELED';
  if (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') {
    return 'IN_PROGRESS';
  }
  if (task.preparedAt) return 'PALLET_READY';
  if (!task.acceptedBySupply) return 'AWAITING_PREPARATION';
  return 'CREATED';
}

function mapDeliveryTaskToListItem(
  task: DeliveryTaskListItem,
): ReplenishmentRequestListItem {
  const machine = task.machine;
  return {
    id: task.id,
    destinationId: task.machineId,
    movementCube: task.movementCube,
    typeMovimentPallet: task.typeMovimentPallet,
    priorityLevel: task.isCritical ? 'VERY_HIGH' : 'NORMAL',
    status: mapTaskStatus(task),
    preparedAt: task.preparedAt,
    awaitingPreparationSince: null,
    statusSince: task.statusSince,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    requestedById: task.requestedById,
    requestedBy: {
      id: task.requestedBy?.id ?? task.requestedById,
      name: task.requestedBy?.name ?? '—',
      employeeId: task.requestedBy?.employeeId ?? null,
      card: task.requestedBy?.card ?? '',
      unit: task.requestedBy?.unit ?? '',
      role: task.requestedBy?.role ?? '',
    },
    destination: {
      id: machine?.id ?? task.machineId,
      name: machine?.name ?? '—',
      position: machine?.position ?? '',
      userId: machine?.userId ?? null,
      typeMachine: machine?.typeMachine ?? { id: '', name: '' },
      sector: machine?.sector ?? {
        id: machine?.sectorId ?? '',
        typeSector: '',
      },
    },
    _count: { movimentPalletTasks: 0 },
  };
}

export async function fetchReplenishmentRequests(filters?: {
  status?: string;
  destinationId?: string;
  requestedById?: string;
}): Promise<ReplenishmentRequestListItem[]> {
  const params = new URLSearchParams();
  if (filters?.destinationId?.trim()) {
    params.set('machineId', filters.destinationId.trim());
  }
  const q = params.toString();
  const path = q
    ? `${API_ENDPOINTS.DELIVERY_TASKS.LIST}?${q}`
    : API_ENDPOINTS.DELIVERY_TASKS.LIST;

  const res = await apiAuthFetch<{
    tasks?: DeliveryTaskListItem[];
    requests?: DeliveryTaskListItem[];
  }>(path, { method: 'GET' });

  const raw = res?.tasks ?? res?.requests ?? [];
  let rows = raw.map(mapDeliveryTaskToListItem);

  if (filters?.status?.trim()) {
    rows = rows.filter((r) => r.status === filters.status!.trim());
  }
  if (filters?.requestedById?.trim()) {
    rows = rows.filter((r) => r.requestedById === filters.requestedById!.trim());
  }

  return rows;
}

export async function fetchPendingPreparationRequests(): Promise<PendingPreparationListPayload> {
  const operatorSupplyRequests = await fetchPendingSupplyRequests();
  return {
    requests: [],
    operatorSupplyRequests,
  };
}

export async function createReplenishmentRequest(input: {
  destinationId: string;
  movementCube: string;
  typeMovimentPallet: ReplenishmentMovimentType;
  priorityLevel?: PriorityLevelValue;
  isCritical?: boolean;
}): Promise<ReplenishmentRequestListItem> {
  const task = await postCreateDeliveryTask({
    machineId: input.destinationId.trim(),
    movementCube: input.movementCube.trim(),
    typeMovimentPallet: input.typeMovimentPallet,
    isCritical:
      input.isCritical === true || input.priorityLevel === 'VERY_HIGH',
    markReady: true,
  });
  return mapDeliveryTaskToListItem(task);
}

export async function updateReplenishmentRequest(
  _id: string,
  _patch: {
    destinationId?: string;
    movementCube?: string;
    typeMovimentPallet?: ReplenishmentMovimentType;
    priorityLevel?: PriorityLevelValue;
  },
): Promise<ReplenishmentRequestListItem> {
  throw new Error(
    'Edição de tarefas de entrega não está disponível; crie uma nova tarefa se necessário.',
  );
}

export async function deleteReplenishmentRequest(_id: string): Promise<void> {
  throw new Error('Exclusão de tarefas de entrega não está disponível na API.');
}

export async function markReplenishmentPalletReady(
  taskId: string,
): Promise<MarkPalletReadyResponse> {
  const task = await postMarkDeliveryPrepared(taskId);
  const request = mapDeliveryTaskToListItem(task);
  return {
    message: 'Pallet marcado como pronto para o transporte.',
    request,
  };
}
