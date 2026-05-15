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
import {
  fetchOperatorMyMovimentPallet,
  fetchOperatorReplenishmentQueue,
  fetchOperatorTripSuggestions,
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

  const queueQuery = useQuery({
    queryKey: ['operator-moviment', 'replenishment-queue'],
    queryFn: fetchOperatorReplenishmentQueue,
    enabled: apiReady && myPalletQuery.isSuccess && myPalletQuery.data !== null,
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

  const acceptReplenishmentMut = useMutation({
    mutationFn: (requestId: string) => postAcceptReplenishmentRequest(requestId),
    onSuccess: () => {
      invalidateOperator();
      toast.success('Tarefa de entrega aceita.');
      goToMyTasks();
    },
    onError: toastApiError,
  });

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

  const busy =
    acceptReplenishmentMut.isPending ||
    acceptPickupMut.isPending ||
    acceptTripMut.isPending;

  const currentPallet = myPalletQuery.data ?? null;
  const queue = queueQuery.data ?? { requests: [], onMachinePickupTasks: [] };

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

  return {
    apiReady,
    token,
    currentPallet,
    myPalletQuery,
    queueQuery,
    tripSuggestionsQuery,
    queue,
    acceptReplenishmentMut,
    acceptPickupMut,
    acceptTripMut,
    pendingTripSuggestionId,
    pendingStandalonePickupTaskId,
    busy,
    goToEquipment,
  };
}

export type OperatorMovimentQueuePageViewModel = ReturnType<
  typeof useOperatorMovimentQueuePage
>;
