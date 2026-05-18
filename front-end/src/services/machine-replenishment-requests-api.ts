import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type {
  MarkPalletReadyResponse,
  PriorityLevelValue,
  ReplenishmentRequestListItem,
} from '@/types/replenishment-request.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';

export type PendingPreparationListPayload = {
  requests: ReplenishmentRequestListItem[];
  operatorSupplyRequests: OperatorMachineSupplyRequestListItem[];
};

export async function fetchReplenishmentRequests(filters?: {
  status?: string;
  destinationId?: string;
  requestedById?: string;
}): Promise<ReplenishmentRequestListItem[]> {
  const params = new URLSearchParams();
  if (filters?.status !== undefined && filters.status.trim() !== '') {
    params.set('status', filters.status.trim());
  }
  if (filters?.destinationId !== undefined && filters.destinationId.trim() !== '') {
    params.set('destinationId', filters.destinationId.trim());
  }
  if (filters?.requestedById !== undefined && filters.requestedById.trim() !== '') {
    params.set('requestedById', filters.requestedById.trim());
  }
  const q = params.toString();
  const path = q
    ? `${API_ENDPOINTS.MACHINE_REPLENISHMENT_REQUESTS.LIST}?${q}`
    : API_ENDPOINTS.MACHINE_REPLENISHMENT_REQUESTS.LIST;
  const res = await apiAuthFetch<{ requests: ReplenishmentRequestListItem[] }>(path, {
    method: 'GET',
  });
  return res?.requests ?? [];
}

export async function fetchPendingPreparationRequests(): Promise<PendingPreparationListPayload> {
  const res = await apiAuthFetch<PendingPreparationListPayload>(
    API_ENDPOINTS.MACHINE_REPLENISHMENT_REQUESTS.PENDING_PREPARATION,
    { method: 'GET' },
  );
  return {
    requests: res?.requests ?? [],
    operatorSupplyRequests: res?.operatorSupplyRequests ?? [],
  };
}

export async function createReplenishmentRequest(input: {
  destinationId: string;
  movementCube: string;
  typeMovimentPallet: ReplenishmentMovimentType;
  priorityLevel?: PriorityLevelValue;
  palletReady?: boolean;
}): Promise<ReplenishmentRequestListItem> {
  const body: Record<string, string | boolean> = {
    destinationId: input.destinationId.trim(),
    movementCube: input.movementCube.trim(),
    typeMovimentPallet: input.typeMovimentPallet,
  };
  if (input.priorityLevel !== undefined) {
    body.priorityLevel = input.priorityLevel;
  }
  if (input.palletReady === true) {
    body.palletReady = true;
  }
  const res = await apiAuthFetch<ReplenishmentRequestListItem>(
    API_ENDPOINTS.MACHINE_REPLENISHMENT_REQUESTS.LIST,
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function updateReplenishmentRequest(
  id: string,
  patch: {
    destinationId?: string;
    movementCube?: string;
    typeMovimentPallet?: ReplenishmentMovimentType;
    priorityLevel?: PriorityLevelValue;
  },
): Promise<ReplenishmentRequestListItem> {
  const res = await apiAuthFetch<ReplenishmentRequestListItem>(
    API_ENDPOINTS.MACHINE_REPLENISHMENT_REQUESTS.BY_ID(id),
    { method: 'PATCH', body: JSON.stringify(patch) },
  );
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function deleteReplenishmentRequest(id: string): Promise<void> {
  await apiAuthFetch(API_ENDPOINTS.MACHINE_REPLENISHMENT_REQUESTS.BY_ID(id), { method: 'DELETE' });
}

export async function markReplenishmentPalletReady(
  requestId: string,
): Promise<MarkPalletReadyResponse> {
  const res = await apiAuthFetch<MarkPalletReadyResponse>(
    API_ENDPOINTS.MACHINE_REPLENISHMENT_REQUESTS.MARK_PALLET_READY(requestId),
    { method: 'POST' },
  );
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}
