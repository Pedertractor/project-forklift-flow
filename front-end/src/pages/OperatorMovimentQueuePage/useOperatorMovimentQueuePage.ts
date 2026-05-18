import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OPERATOR_MOVIMENT_EQUIPMENT_PATH,
  OPERATOR_MOVIMENT_MY_TASKS_PATH,
} from '@/constants/operator-moviment-routes';
import { ENV } from '@/constants/env';
import { toastApiError } from '@/lib/toast-helpers';
import { toast } from '@/lib/toast';
import type { TripStandaloneDeliverApi } from '@/types/operator-moviment-pallet.types';
import {
  fetchOperatorMyMovimentPallet,
  fetchOperatorTripSuggestions,
  postAcceptOpenDeliverTask,
  postAcceptOpenPickupTask,
  postAcceptReplenishmentRequest,
  postAcceptTripRouteSuggestion,
} from '@/services/operator-moviment-pallet-api';
import { useAuthStore } from '@/store/auth.store';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useOperatorMovimentQueuePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);

  const goToMyTasks = useCallback(() => {
    void navigate(OPERATOR_MOVIMENT_MY_TASKS_PATH);
  }, [navigate]);

  const goToEquipment = useCallback(() => {
    void navigate(OPERATOR_MOVIMENT_EQUIPMENT_PATH);
  }, [navigate]);

  const myPalletQuery = useQuery({
    queryKey: ['operator-moviment', 'my-pallet'],
    queryFn: fetchOperatorMyMovimentPallet,
    enabled: apiReady,
  });

  const tripSuggestionsQuery = useQuery({
    queryKey: ['operator-moviment', 'trip-suggestions'],
    queryFn: fetchOperatorTripSuggestions,
    enabled: apiReady,
    refetchInterval: apiReady ? 60_000 : false,
  });

  const invalidateOperator = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['operator-moviment'] });
  }, [queryClient]);

  const acceptPickupMut = useMutation({
    mutationFn: (taskId: string) => postAcceptOpenPickupTask(taskId),
    onSuccess: () => {
      invalidateOperator();
      toast.success('Tarefa de retirada aceita.');
      goToMyTasks();
    },
    onError: toastApiError,
  });

  const acceptTripMut = useMutation({
    mutationFn: (tripSuggestionId: string) => postAcceptTripRouteSuggestion(tripSuggestionId),
    onSuccess: () => {
      invalidateOperator();
      toast.success('Rota sugerida aceita. Execute na ordem indicada.');
      goToMyTasks();
    },
    onError: toastApiError,
  });

  const acceptDeliverMut = useMutation({
    mutationFn: async (row: TripStandaloneDeliverApi) => {
      if (row.deliverTask) {
        return postAcceptOpenDeliverTask(row.deliverTask.id);
      }
      return postAcceptReplenishmentRequest(row.requestId);
    },
    onSuccess: () => {
      invalidateOperator();
      toast.success('Tarefa de entrega aceita.');
      goToMyTasks();
    },
    onError: toastApiError,
  });

  const busy =
    acceptPickupMut.isPending || acceptTripMut.isPending || acceptDeliverMut.isPending;

  const currentPallet = myPalletQuery.data ?? null;

  const pendingTripSuggestionId = useMemo(() => {
    if (!acceptTripMut.isPending || acceptTripMut.variables === undefined) {
      return null;
    }
    return acceptTripMut.variables;
  }, [acceptTripMut.isPending, acceptTripMut.variables]);

  const pendingStandalonePickupTaskId = useMemo(() => {
    if (!acceptPickupMut.isPending || acceptPickupMut.variables === undefined) {
      return null;
    }
    return acceptPickupMut.variables;
  }, [acceptPickupMut.isPending, acceptPickupMut.variables]);

  const pendingStandaloneDeliverKey = useMemo(() => {
    if (!acceptDeliverMut.isPending || acceptDeliverMut.variables === undefined) {
      return null;
    }
    const row = acceptDeliverMut.variables;
    return row.deliverTask?.id ?? `pool:${row.requestId}`;
  }, [acceptDeliverMut.isPending, acceptDeliverMut.variables]);

  return {
    apiReady,
    token,
    currentPallet,
    tripSuggestionsQuery,
    acceptPickupMut,
    acceptTripMut,
    acceptDeliverMut,
    pendingTripSuggestionId,
    pendingStandalonePickupTaskId,
    pendingStandaloneDeliverKey,
    busy,
    goToEquipment,
  };
}

export type OperatorMovimentQueuePageViewModel = ReturnType<
  typeof useOperatorMovimentQueuePage
>;
