import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ENV } from '@/constants/env';
import {
  completeOperatorTaskAccept,
} from '@/lib/operator-moviment-after-accept';
import { toastApiError } from '@/lib/toast-helpers';
import { toast } from '@/lib/toast';
import {
  fetchOperatorMyMovimentPallet,
  fetchOperatorReplenishmentQueue,
  postAcceptOpenPickupTask,
  postAcceptReplenishmentRequest,
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

  const afterAcceptSuccess = useCallback(
    (successMessage: string) => {
      setIsEnteringTaskFlow(true);
      completeOperatorTaskAccept(queryClient, navigate);
      toast.success(successMessage);
    },
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
    mutationFn: (requestId: string) => postAcceptReplenishmentRequest(requestId),
    onSuccess: () => afterAcceptSuccess('Tarefa de entrega aceita.'),
    onError: toastApiError,
  });

  const acceptPickupMut = useMutation({
    mutationFn: (taskId: string) => postAcceptOpenPickupTask(taskId),
    onSuccess: () => afterAcceptSuccess('Tarefa de retirada aceita.'),
    onError: toastApiError,
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
