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
  OperatorPickupProgressPhase,
  OperatorPickupProgressResponse,
  OperatorSupplyRequestsResponse,
  MachineToolingListItem,
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
  const res = await apiAuthFetch<{
    pickupTask: PickupTaskListItem;
    replenishmentCanceled?: boolean;
  }>(API_ENDPOINTS.OPERATOR_MACHINE.CANCEL_PICKUP(pickupTaskId), {
    method: 'POST',
  });
  if (!res?.pickupTask) {
    throw new Error('Resposta inválida ao cancelar retirada.');
  }
  return res;
}

export async function postOperatorSupplyOnly(options?: { toolingId?: string }) {
  const res = await apiAuthFetch<{
    operatorSupplyRequest: { id: string; status: string };
    created: boolean;
  }>(API_ENDPOINTS.OPERATOR_MACHINE.SUPPLY_ONLY, {
    method: 'POST',
    body: JSON.stringify({
      ...(options?.toolingId ? { toolingId: options.toolingId } : {}),
    }),
  });
  if (!res?.operatorSupplyRequest) {
    throw new Error('Resposta inválida ao solicitar abastecimento.');
  }
  return res;
}

export async function postOperatorPickupWithReplenishment(options?: {
  isCritical?: boolean;
  typeMovimentPallet?: 'FORKLIFT' | 'ANY';
  toolingId?: string;
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
      ...(options?.toolingId ? { toolingId: options.toolingId } : {}),
    }),
  });
  if (!res?.pickupTask) {
    throw new Error('Resposta inválida ao solicitar retirada e abastecimento.');
  }
  return res;
}

export async function fetchOperatorMachineToolings() {
  const res = await apiAuthFetch<{ toolings: MachineToolingListItem[] }>(
    API_ENDPOINTS.OPERATOR_MACHINE.TOOLINGS,
    { method: 'GET' },
  );
  return res?.toolings ?? [];
}

export async function postOperatorMachineTooling(name: string) {
  const res = await apiAuthFetch<{ tooling: MachineToolingListItem }>(
    API_ENDPOINTS.OPERATOR_MACHINE.TOOLINGS,
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

export async function deleteOperatorMachineTooling(toolingId: string) {
  const res = await apiAuthFetch<{ tooling: MachineToolingListItem }>(
    API_ENDPOINTS.OPERATOR_MACHINE.TOOLING_BY_ID(toolingId),
    { method: 'DELETE' },
  );
  if (!res?.tooling) {
    throw new Error('Resposta inválida ao remover ferramental.');
  }
  return res.tooling;
}

function transportLabelFor(typeMovimentPallet: string): string {
  return typeMovimentPallet === 'FORKLIFT'
    ? 'empilhadeira'
    : 'transporte (empilhadeira ou transpaleteira)';
}

function resolvePickupProgressPhase(
  delivery: DeliveryTaskListItem | null,
  pickup: PickupTaskListItem | null,
): OperatorPickupProgressPhase {
  if (pickup?.status === 'COMPLETED') {
    return 'PICKUP_FINISHED';
  }
  if (pickup?.status === 'IN_PROGRESS') {
    return 'TRANSPORT_REMOVING';
  }
  if (pickup?.status === 'ASSIGNED') {
    return 'TRANSPORT_ASSIGNED';
  }
  if (pickup?.status === 'CREATED') {
    return 'AWAITING_TRANSPORT_PICKUP';
  }
  if (delivery?.status === 'COMPLETED') {
    return 'AT_MACHINE_AWAITING_PICKUP';
  }
  if (
    delivery &&
    (delivery.status === 'CREATED' ||
      delivery.status === 'ASSIGNED' ||
      delivery.status === 'IN_PROGRESS')
  ) {
    return 'DELIVERY_IN_PROGRESS';
  }
  return 'OTHER';
}

function resolveRequestStatus(
  delivery: DeliveryTaskListItem | null,
  pickup: PickupTaskListItem | null,
): string {
  if (pickup?.status === 'COMPLETED' || delivery?.status === 'COMPLETED') {
    return pickup?.status === 'COMPLETED' ? 'COMPLETED' : 'ON_MACHINE';
  }
  if (pickup) {
    return 'ON_MACHINE';
  }
  if (delivery?.status === 'ASSIGNED' || delivery?.status === 'IN_PROGRESS') {
    return 'IN_PROGRESS';
  }
  return delivery?.status ?? 'OTHER';
}

export async function fetchOperatorPickupProgress(
  requestId: string,
): Promise<OperatorPickupProgressResponse> {
  const trimmedId = requestId.trim();
  if (!trimmedId) {
    throw new Error('Pedido inválido.');
  }

  const { deliveryTasks, pickupTasks } = await fetchOperatorMachineTasks();
  const delivery =
    deliveryTasks.find((task) => task.id === trimmedId) ?? null;
  let pickup = pickupTasks.find((task) => task.id === trimmedId) ?? null;

  if (!pickup && delivery) {
    pickup =
      pickupTasks.find(
        (task) =>
          task.machineId === delivery.machineId &&
          task.status !== 'CANCELED' &&
          new Date(task.createdAt).getTime() >=
            new Date(delivery.createdAt).getTime(),
      ) ?? null;
  }

  const relatedDelivery =
    delivery ??
    (pickup
      ? deliveryTasks.find((task) => task.machineId === pickup!.machineId) ??
        null
      : null);

  if (!relatedDelivery && !pickup) {
    throw new Error('Pedido não encontrado ou sem permissão.');
  }

  const typeMovimentPallet =
    relatedDelivery?.typeMovimentPallet ??
    pickup?.typeMovimentPallet ??
    'FORKLIFT';

  return {
    phase: resolvePickupProgressPhase(relatedDelivery, pickup),
    transportLabel: transportLabelFor(typeMovimentPallet),
    request: {
      id: trimmedId,
      movementCube: relatedDelivery?.movementCube ?? '—',
      status: resolveRequestStatus(relatedDelivery, pickup),
      typeMovimentPallet,
    },
    pickupTask: pickup
      ? {
          id: pickup.id,
          requestId: relatedDelivery?.id ?? pickup.id,
          type: 'PICKUP_TO_EXPEDITION',
          status: pickup.status,
          assignedMovimentPalletId: pickup.assignedMovimentPalletId,
          requestedById: pickup.requestedById,
          createdAt: pickup.createdAt,
          updatedAt: pickup.updatedAt,
          completedAt: pickup.completedAt,
        }
      : null,
  };
}
