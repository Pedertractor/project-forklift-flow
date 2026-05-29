import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type { DeliveryTaskListItem, PickupTaskListItem } from '@/types/machine-task.types';
import type {
  OperatorAcceptPickupResponse,
  OperatorAcceptReplenishmentResponse,
  OperatorAcceptTripSuggestionResponse,
  OperatorMovimentPalletBrief,
  OperatorMovimentPalletsListResponse,
  OperatorMovimentTaskItem,
  OperatorMyMovimentPalletResponse,
  OperatorMyTasksResponse,
  OperatorPickupTaskQueueItem,
  OperatorReplenishmentQueueResponse,
  OperatorReplenishmentRequestItem,
  OperatorRequestDestinationBrief,
  OperatorRequestUserBrief,
  PriorityLevelApi,
  TripSuggestionsResponse,
  TypeMovimentPalletApi,
} from '@/types/operator-moviment-pallet.types';

type DeliveryTaskApiRow = DeliveryTaskListItem & {
  machine?: DeliveryTaskListItem['machine'];
  requestedBy?: DeliveryTaskListItem['requestedBy'];
};

type PickupTaskApiRow = PickupTaskListItem & {
  machine?: PickupTaskListItem['machine'];
  requestedBy?: PickupTaskListItem['requestedBy'];
};

function mapMachineToDestination(
  machine: DeliveryTaskListItem['machine'] | undefined,
  machineId: string,
): OperatorRequestDestinationBrief {
  return {
    id: machine?.id ?? machineId,
    name: machine?.name ?? '—',
    userId: machine?.userId ?? null,
    typeMachine: machine?.typeMachine ?? { id: '', name: '' },
    sector: machine?.sector ?? {
      id: machine?.sectorId ?? '',
      typeSector: '',
    },
  };
}

function mapUserBrief(
  user: DeliveryTaskListItem['requestedBy'] | undefined,
  userId: string,
): OperatorRequestUserBrief {
  return {
    id: user?.id ?? userId,
    name: user?.name ?? '—',
    employeeId: String(user?.employeeId ?? ''),
    card: user?.card ?? null,
    unit: user?.unit ?? null,
    role: user?.role ?? '',
  };
}

function mapDeliveryTaskToReplenishmentItem(
  task: DeliveryTaskApiRow,
): OperatorReplenishmentRequestItem {
  return {
    id: task.id,
    movementCube: task.movementCube,
    typeMovimentPallet: task.typeMovimentPallet,
    status: 'PALLET_READY',
    priorityLevel: task.isCritical ? 'VERY_HIGH' : 'NORMAL',
    requestedById: task.requestedById,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    requestedBy: mapUserBrief(task.requestedBy, task.requestedById),
    destination: mapMachineToDestination(task.machine, task.machineId),
    _count: { movimentPalletTasks: 0 },
  };
}

function mapDeliveryToTaskItem(task: DeliveryTaskApiRow): OperatorPickupTaskQueueItem {
  const item = mapPickupTaskToQueueItem({
    id: task.id,
    machineId: task.machineId,
    typeMovimentPallet: task.typeMovimentPallet,
    isCritical: task.isCritical,
    status: task.status,
    statusSince: task.statusSince,
    triggersReplenishment: false,
    requestedById: task.requestedById,
    assignedOperatorId:
      task.assignedOperatorId ?? task.assignedMovimentPalletId ?? null,
    assignedMovimentPalletId:
      task.assignedOperatorId ?? task.assignedMovimentPalletId ?? null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    machine: task.machine,
    requestedBy: task.requestedBy,
  });
  item.type = 'DELIVER_TO_MACHINE';
  item.request = mapDeliveryTaskToReplenishmentItem(task);
  return item;
}

function mapPickupTaskToQueueItem(task: PickupTaskApiRow): OperatorPickupTaskQueueItem {
  const destination = mapMachineToDestination(task.machine, task.machineId);
  const requestStub: OperatorReplenishmentRequestItem = {
    id: task.id,
    movementCube: '—',
    typeMovimentPallet: task.typeMovimentPallet,
    status: 'ON_MACHINE',
    priorityLevel: task.isCritical ? 'VERY_HIGH' : 'NORMAL',
    requestedById: task.requestedById,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    requestedBy: mapUserBrief(task.requestedBy, task.requestedById),
    destination,
    _count: { movimentPalletTasks: 0 },
  };
  return {
    id: task.id,
    requestId: task.id,
    type: 'PICKUP_TO_EXPEDITION',
    status: task.status as OperatorPickupTaskQueueItem['status'],
    assignedOperatorId:
      task.assignedOperatorId ?? task.assignedMovimentPalletId ?? null,
    assignedMovimentPalletId:
      task.assignedOperatorId ?? task.assignedMovimentPalletId ?? null,
    requestedById: task.requestedById,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    request: requestStub,
    assignedMovimentPallet: null,
  };
}

function mapOpenTasksResponse(res: {
  deliveryTasks?: DeliveryTaskApiRow[];
  pickupTasks?: PickupTaskApiRow[];
  requests?: DeliveryTaskApiRow[];
  onMachinePickupTasks?: PickupTaskApiRow[];
}): OperatorReplenishmentQueueResponse {
  const deliverRaw = res.deliveryTasks ?? res.requests ?? [];
  const pickupRaw = res.pickupTasks ?? res.onMachinePickupTasks ?? [];
  return {
    requests: deliverRaw.map(mapDeliveryTaskToReplenishmentItem),
    onMachinePickupTasks: pickupRaw.map(mapPickupTaskToQueueItem),
  };
}

export async function fetchOperatorMovimentPallets(): Promise<
  OperatorMovimentPalletsListResponse['movimentPallets']
> {
  const res = await apiAuthFetch<OperatorMovimentPalletsListResponse>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.MOVIMENT_PALLETS,
    { method: 'GET' },
  );
  return res?.movimentPallets ?? [];
}

export async function fetchOperatorMyMovimentPallet(): Promise<
  OperatorMyMovimentPalletResponse['movimentPallet']
> {
  const res = await apiAuthFetch<OperatorMyMovimentPalletResponse>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.MY_MOVIMENT_PALLET,
    { method: 'GET' },
  );
  return res?.movimentPallet ?? null;
}

export async function fetchOperatorReplenishmentQueue(): Promise<OperatorReplenishmentQueueResponse> {
  const res = await apiAuthFetch<{
    deliveryTasks?: DeliveryTaskApiRow[];
    pickupTasks?: PickupTaskApiRow[];
    requests?: DeliveryTaskApiRow[];
    onMachinePickupTasks?: PickupTaskApiRow[];
  }>(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.OPEN_TASKS, { method: 'GET' });
  return mapOpenTasksResponse(res ?? {});
}

export async function postBindOperatorMovimentPallet(
  isOperating: 'FORKLIFT' | 'PALLET_TRUCK',
): Promise<OperatorMovimentPalletBrief> {
  const res = await apiAuthFetch<{ movimentPallet: OperatorMovimentPalletBrief }>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.MY_MOVIMENT_PALLET,
    {
      method: 'POST',
      body: JSON.stringify({ isOperating }),
    },
  );
  if (!res?.movimentPallet) {
    throw new Error('Resposta inválida ao vincular equipamento.');
  }
  return res.movimentPallet;
}

export async function deleteUnbindOperatorMovimentPallet(): Promise<void> {
  await apiAuthFetch(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.MY_MOVIMENT_PALLET, {
    method: 'DELETE',
  });
}

/** Aceita tarefa de entrega (id da DeliveryTask). */
export async function postAcceptReplenishmentRequest(
  deliveryTaskId: string,
): Promise<OperatorAcceptReplenishmentResponse> {
  const res = await postAcceptOpenDeliverTask(deliveryTaskId);
  return {
    task: {
      id: res.task.id,
      requestId: deliveryTaskId,
      type: 'DELIVER_TO_MACHINE',
      status: res.task.status,
    },
    request: res.request,
  };
}

export async function postAcceptOpenPickupTask(
  taskId: string,
): Promise<OperatorAcceptPickupResponse> {
  const res = await apiAuthFetch<{
    task?: PickupTaskApiRow;
    pickupTask?: PickupTaskApiRow;
  }>(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.ACCEPT_PICKUP(taskId), {
    method: 'POST',
  });
  const raw = res?.pickupTask ?? res?.task;
  if (!raw) {
    throw new Error('Resposta vazia ao aceitar retirada.');
  }
  return { task: mapPickupTaskToQueueItem(raw) };
}

export async function postAcceptOpenDeliverTask(
  taskId: string,
): Promise<{
  task: OperatorMovimentTaskItem;
  request: OperatorReplenishmentRequestItem | null;
}> {
  const res = await apiAuthFetch<{
    task?: DeliveryTaskApiRow;
    deliveryTask?: DeliveryTaskApiRow;
    request?: DeliveryTaskApiRow | OperatorReplenishmentRequestItem | null;
  }>(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.ACCEPT_DELIVER(taskId), {
    method: 'POST',
  });
  const raw = res?.deliveryTask ?? res?.task;
  if (!raw) {
    throw new Error('Resposta vazia ao aceitar entrega.');
  }
  const task = mapDeliveryToTaskItem(raw);
  const request =
    res?.request && 'destination' in res.request
      ? (res.request as OperatorReplenishmentRequestItem)
      : mapDeliveryTaskToReplenishmentItem(raw);
  return { task, request };
}

type ActiveFlowTaskRow = {
  kind: 'DELIVERY' | 'PICKUP';
  task: DeliveryTaskApiRow | PickupTaskApiRow;
};

export async function fetchOperatorMyTasks(): Promise<OperatorMovimentTaskItem[]> {
  const res = await apiAuthFetch<{
    tasks?: ActiveFlowTaskRow[];
    deliveryTasks?: DeliveryTaskApiRow[];
    pickupTasks?: PickupTaskApiRow[];
  }>(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.MY_TASKS, { method: 'GET' });

  if (res?.tasks?.length) {
    return res.tasks.map((row) => {
      if (row.kind === 'DELIVERY') {
        return mapDeliveryToTaskItem(row.task as DeliveryTaskApiRow);
      }
      return mapPickupTaskToQueueItem(row.task as PickupTaskApiRow);
    });
  }

  const items: OperatorMovimentTaskItem[] = [];
  for (const d of res?.deliveryTasks ?? []) {
    items.push(mapDeliveryToTaskItem(d));
  }
  for (const p of res?.pickupTasks ?? []) {
    items.push(mapPickupTaskToQueueItem(p));
  }
  return items;
}

type TripSuggestionApiRow = {
  kind: string;
  machine: { id: string; name: string };
  effectiveCritical?: boolean;
  message: string;
  deliverTask: DeliveryTaskApiRow;
  pickupTask: PickupTaskApiRow;
  tripSuggestion: TripSuggestionsResponse['suggestions'][0]['tripSuggestion'];
};

type TripStandalonePickupApiRow = {
  kind: string;
  typeMovimentPallet?: TypeMovimentPalletApi;
  effectiveCritical?: boolean;
  deferRecommended?: boolean;
  machine: { id: string; name: string };
  message: string;
  pickupTask: PickupTaskApiRow;
};

type TripStandaloneDeliverApiRow = {
  kind: string;
  typeMovimentPallet?: TypeMovimentPalletApi;
  effectiveCritical?: boolean;
  deferRecommended?: boolean;
  machine: { id: string; name: string };
  message: string;
  requestId: string;
  deliverTask: DeliveryTaskApiRow;
};

export async function fetchOperatorTripSuggestions(): Promise<TripSuggestionsResponse> {
  const res = await apiAuthFetch<{
    suggestions?: TripSuggestionApiRow[];
    standalonePickupTasks?: TripStandalonePickupApiRow[];
    standaloneDeliverTasks?: TripStandaloneDeliverApiRow[];
    priorityContext?: { hasCritical?: boolean; hint?: string };
  }>(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.TRIP_SUGGESTIONS, { method: 'GET' });

  if (!res) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      standaloneDeliverTasks: [],
      priorityContext: { mostUrgentOpenInSector: null },
    };
  }

  return {
    suggestions: (res.suggestions ?? []).map((s) => ({
      kind: 'COMBINE_DELIVER_AND_PICKUP_AT_MACHINE' as const,
      typeMovimentPallet: 'FORKLIFT' as const,
      effectivePriority: (s.effectiveCritical ? 'VERY_HIGH' : 'NORMAL') as PriorityLevelApi,
      deferRecommended: false,
      machine: s.machine,
      message: s.message,
      suggestedOrder: [],
      deliverTask: mapDeliveryToTaskItem(s.deliverTask),
      pickupTask: mapPickupTaskToQueueItem(s.pickupTask),
      tripSuggestion: s.tripSuggestion,
    })),
    standalonePickupTasks: (res.standalonePickupTasks ?? []).map((row) => ({
      kind: 'PICKUP_ONLY_AT_MACHINE' as const,
      typeMovimentPallet: (row.typeMovimentPallet ?? 'FORKLIFT') as TypeMovimentPalletApi,
      effectivePriority: (row.effectiveCritical ? 'VERY_HIGH' : 'NORMAL') as PriorityLevelApi,
      deferRecommended: row.deferRecommended ?? false,
      machine: row.machine,
      message: row.message,
      suggestedOrder: [],
      pickupTask: mapPickupTaskToQueueItem(row.pickupTask),
    })),
    standaloneDeliverTasks: (res.standaloneDeliverTasks ?? []).map((row) => ({
      kind: 'DELIVER_ONLY_TO_MACHINE' as const,
      typeMovimentPallet: (row.typeMovimentPallet ?? 'FORKLIFT') as TypeMovimentPalletApi,
      effectivePriority: (row.effectiveCritical ? 'VERY_HIGH' : 'NORMAL') as PriorityLevelApi,
      deferRecommended: row.deferRecommended ?? false,
      machine: row.machine,
      message: row.message,
      suggestedOrder: [],
      requestId: row.requestId,
      deliverTask: mapDeliveryToTaskItem(row.deliverTask),
    })),
    priorityContext: {
      mostUrgentOpenInSector: res.priorityContext?.hasCritical ? 'VERY_HIGH' : null,
      hint: res.priorityContext?.hint,
    },
  };
}

export async function postAcceptTripRouteSuggestion(
  tripSuggestionId: string,
): Promise<OperatorAcceptTripSuggestionResponse> {
  const res = await apiAuthFetch<OperatorAcceptTripSuggestionResponse>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.ACCEPT_TRIP_SUGGESTION(tripSuggestionId),
    { method: 'POST' },
  );
  if (!res) {
    throw new Error('Resposta vazia ao aceitar sugestão de rota.');
  }
  return res;
}

export async function postCompleteDeliverTask(taskId: string): Promise<{
  task: OperatorMovimentTaskItem;
  request: OperatorReplenishmentRequestItem | null;
}> {
  const res = await apiAuthFetch<{
    task?: DeliveryTaskApiRow;
    deliveryTask?: DeliveryTaskApiRow;
    request?: DeliveryTaskApiRow | OperatorReplenishmentRequestItem | null;
  }>(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.COMPLETE_DELIVER(taskId), {
    method: 'POST',
  });
  const raw = res?.deliveryTask ?? res?.task;
  if (!raw) {
    throw new Error('Resposta vazia ao concluir entrega.');
  }
  const task = mapDeliveryToTaskItem(raw);
  const request =
    res?.request && 'destination' in res.request
      ? (res.request as OperatorReplenishmentRequestItem)
      : mapDeliveryTaskToReplenishmentItem(raw);
  return { task, request };
}

export async function postCompletePickupTask(taskId: string): Promise<{
  task: OperatorMovimentTaskItem;
  request: OperatorReplenishmentRequestItem | null;
}> {
  const res = await apiAuthFetch<{
    task?: PickupTaskApiRow;
    pickupTask?: PickupTaskApiRow;
    request?: OperatorReplenishmentRequestItem | null;
  }>(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.COMPLETE_PICKUP(taskId), {
    method: 'POST',
  });
  const raw = res?.pickupTask ?? res?.task;
  if (!raw) {
    throw new Error('Resposta vazia ao concluir retirada.');
  }
  return {
    task: mapPickupTaskToQueueItem(raw),
    request:
      res?.request && 'destination' in res.request
        ? (res.request as OperatorReplenishmentRequestItem)
        : null,
  };
}
