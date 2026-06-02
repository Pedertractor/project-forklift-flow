import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OPERATOR_MOVIMENT_EQUIPMENT_PATH } from '@/constants/operator-moviment-routes';
import { ENV } from '@/constants/env';
import {
  completeOperatorTaskAccept,
} from '@/lib/operator-moviment-after-accept';
import { toastApiError } from '@/lib/toast-helpers';
import { toast } from '@/lib/toast';
import type { TripStandaloneDeliverApi } from '@/types/operator-moviment-pallet.types';
import {
  fetchOperatorMyMovimentPallet,
  fetchOperatorReplenishmentQueue,
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

  const [isEnteringTaskFlow, setIsEnteringTaskFlow] = useState(false);

  const afterAcceptSuccess = useCallback(
    (successMessage: string) => {
      setIsEnteringTaskFlow(true);
      completeOperatorTaskAccept(queryClient, navigate);
      toast.success(successMessage);
    },
    [navigate, queryClient],
  );

  const goToEquipment = useCallback(() => {
    void navigate(OPERATOR_MOVIMENT_EQUIPMENT_PATH, {
      state: { changeEquipment: true },
    });
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

  const replenishmentQueueQuery = useQuery({
    queryKey: ['operator-moviment', 'replenishment-queue'],
    queryFn: fetchOperatorReplenishmentQueue,
    enabled: apiReady && myPalletQuery.isSuccess && myPalletQuery.data !== null,
    refetchInterval: apiReady ? 60_000 : false,
  });

  const manualQueueActivityCount =
    (replenishmentQueueQuery.data?.requests.length ?? 0) +
    (replenishmentQueueQuery.data?.onMachinePickupTasks.length ?? 0);

  const acceptPickupMut = useMutation({
    mutationFn: (taskId: string) => postAcceptOpenPickupTask(taskId),
    onSuccess: () => afterAcceptSuccess('Tarefa de retirada aceita.'),
    onError: toastApiError,
  });

  const acceptTripMut = useMutation({
    mutationFn: (tripSuggestionId: string) => postAcceptTripRouteSuggestion(tripSuggestionId),
    onSuccess: () =>
      afterAcceptSuccess('Rota sugerida aceita. Execute na ordem indicada.'),
    onError: toastApiError,
  });

  const acceptDeliverMut = useMutation({
    mutationFn: async (row: TripStandaloneDeliverApi) => {
      if (row.deliverTask) {
        return postAcceptOpenDeliverTask(row.deliverTask.id);
      }
      return postAcceptReplenishmentRequest(row.requestId);
    },
    onSuccess: () => afterAcceptSuccess('Tarefa de entrega aceita.'),
    onError: toastApiError,
  });

  const busy =
    isEnteringTaskFlow ||
    acceptPickupMut.isPending ||
    acceptTripMut.isPending ||
    acceptDeliverMut.isPending;

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
    manualQueueActivityCount,
    pendingTripSuggestionId,
    pendingStandalonePickupTaskId,
    pendingStandaloneDeliverKey,
    busy,
    onAcceptTrip: (tripSuggestionId: string) =>
      acceptTripMut.mutate(tripSuggestionId),
    onAcceptStandalonePickup: (taskId: string) =>
      acceptPickupMut.mutate(taskId),
    onAcceptStandaloneDeliver: (row: TripStandaloneDeliverApi) =>
      acceptDeliverMut.mutate(row),
    goToEquipment,
  };
}

export type OperatorMovimentQueuePageViewModel = ReturnType<
  typeof useOperatorMovimentQueuePage
>;
