import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type {
  OperatorAcceptPickupResponse,
  OperatorAcceptReplenishmentResponse,
  OperatorAcceptTripSuggestionResponse,
  OperatorMovimentPalletBrief,
  OperatorMovimentPalletsListResponse,
  OperatorMovimentTaskItem,
  OperatorMyMovimentPalletResponse,
  OperatorMyTasksResponse,
  OperatorReplenishmentQueueResponse,
  OperatorReplenishmentRequestItem,
  TripSuggestionsResponse,
} from '@/types/operator-moviment-pallet.types';

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
  const res = await apiAuthFetch<OperatorReplenishmentQueueResponse>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.REPLENISHMENT_QUEUE,
    { method: 'GET' },
  );
  return res ?? { requests: [], onMachinePickupTasks: [] };
}

export async function postBindOperatorMovimentPallet(
  movimentPalletId: string,
): Promise<OperatorMovimentPalletBrief> {
  const res = await apiAuthFetch<{ movimentPallet: OperatorMovimentPalletBrief }>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.MY_MOVIMENT_PALLET,
    {
      method: 'POST',
      body: JSON.stringify({ movimentPalletId }),
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

export async function postAcceptReplenishmentRequest(
  requestId: string,
): Promise<OperatorAcceptReplenishmentResponse> {
  const res = await apiAuthFetch<OperatorAcceptReplenishmentResponse>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.ACCEPT_REPLENISHMENT(requestId),
    { method: 'POST' },
  );
  if (!res) {
    throw new Error('Resposta vazia ao aceitar solicitação.');
  }
  return res;
}

export async function postAcceptOpenPickupTask(
  taskId: string,
): Promise<OperatorAcceptPickupResponse> {
  const res = await apiAuthFetch<OperatorAcceptPickupResponse>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.ACCEPT_PICKUP(taskId),
    { method: 'POST' },
  );
  if (!res) {
    throw new Error('Resposta vazia ao aceitar retirada.');
  }
  return res;
}

export async function fetchOperatorMyTasks(): Promise<OperatorMovimentTaskItem[]> {
  const res = await apiAuthFetch<OperatorMyTasksResponse>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.MY_TASKS,
    { method: 'GET' },
  );
  return res?.tasks ?? [];
}

export async function fetchOperatorTripSuggestions(): Promise<TripSuggestionsResponse> {
  const res = await apiAuthFetch<TripSuggestionsResponse>(
    API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.TRIP_SUGGESTIONS,
    { method: 'GET' },
  );
  if (!res) {
    return {
      suggestions: [],
      standalonePickupTasks: [],
      priorityContext: { mostUrgentOpenInSector: null },
    };
  }
  return res;
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
    task: OperatorMovimentTaskItem;
    request: OperatorReplenishmentRequestItem | null;
  }>(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.COMPLETE_DELIVER(taskId), {
    method: 'POST',
  });
  if (!res) {
    throw new Error('Resposta vazia ao concluir entrega.');
  }
  return res;
}

export async function postCompletePickupTask(taskId: string): Promise<{
  task: OperatorMovimentTaskItem;
  request: OperatorReplenishmentRequestItem | null;
}> {
  const res = await apiAuthFetch<{
    task: OperatorMovimentTaskItem;
    request: OperatorReplenishmentRequestItem | null;
  }>(API_ENDPOINTS.OPERATOR_MOVIMENT_PALLET.COMPLETE_PICKUP(taskId), {
    method: 'POST',
  });
  if (!res) {
    throw new Error('Resposta vazia ao concluir retirada.');
  }
  return res;
}
