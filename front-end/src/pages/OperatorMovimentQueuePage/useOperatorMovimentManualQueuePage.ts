import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ENV } from '@/constants/env';
import { createOperatorTaskAcceptMutationCallbacks } from '@/lib/operator-moviment-accept-mutation';
import {
  fetchOperatorMyMovimentPallet,
  fetchOperatorReplenishmentQueue,
  postAcceptOpenPickupTask,
  postAcceptOpenDeliverTask,
} from '@/services/operator-moviment-pallet-api';
import { useAuthStore } from '@/store/auth.store';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useOperatorMovimentManualQueuePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);

  const [isEnteringTaskFlow, setIsEnteringTaskFlow] = useState(false);

  const acceptCallbacks = useMemo(
    () =>
      createOperatorTaskAcceptMutationCallbacks(
        queryClient,
        navigate,
        setIsEnteringTaskFlow,
      ),
    [navigate, queryClient],
  );

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

  const acceptReplenishmentMut = useMutation({
    mutationFn: (deliveryTaskId: string) =>
      postAcceptOpenDeliverTask(deliveryTaskId),
    onSuccess: (data) =>
      acceptCallbacks.onSuccess('Tarefa de entrega aceita.', [data.task]),
    onError: acceptCallbacks.onError,
  });

  const acceptPickupMut = useMutation({
    mutationFn: (taskId: string) => postAcceptOpenPickupTask(taskId),
    onSuccess: (data) =>
      acceptCallbacks.onSuccess('Tarefa de retirada aceita.', [data.task]),
    onError: acceptCallbacks.onError,
  });

  const busy =
    isEnteringTaskFlow ||
    acceptReplenishmentMut.isPending ||
    acceptPickupMut.isPending;
  const queue = queueQuery.data ?? { requests: [], onMachinePickupTasks: [] };

  const pendingReplenishmentRequestId = useMemo(() => {
    if (
      !acceptReplenishmentMut.isPending ||
      acceptReplenishmentMut.variables === undefined
    ) {
      return null;
    }
    return acceptReplenishmentMut.variables;
  }, [acceptReplenishmentMut.isPending, acceptReplenishmentMut.variables]);

  const pendingPickupTaskId = useMemo(() => {
    if (!acceptPickupMut.isPending || acceptPickupMut.variables === undefined) {
      return null;
    }
    return acceptPickupMut.variables;
  }, [acceptPickupMut.isPending, acceptPickupMut.variables]);

  return {
    apiReady,
    token,
    queueQuery,
    queue,
    busy,
    pendingReplenishmentRequestId,
    pendingPickupTaskId,
    onAcceptReplenishment: (requestId: string) =>
      acceptReplenishmentMut.mutate(requestId),
    onAcceptPickup: (taskId: string) => acceptPickupMut.mutate(taskId),
  };
}

export type OperatorMovimentManualQueuePageViewModel = ReturnType<
  typeof useOperatorMovimentManualQueuePage
>;
