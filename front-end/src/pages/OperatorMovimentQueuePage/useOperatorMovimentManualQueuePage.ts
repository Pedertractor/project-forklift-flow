import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OPERATOR_MOVIMENT_MY_TASKS_PATH,
} from '@/constants/operator-moviment-routes';
import { ENV } from '@/constants/env';
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

  const goToMyTasks = useCallback(() => {
    void navigate(OPERATOR_MOVIMENT_MY_TASKS_PATH);
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

  const busy = acceptReplenishmentMut.isPending || acceptPickupMut.isPending;
  const queue = queueQuery.data ?? { requests: [], onMachinePickupTasks: [] };

  return {
    apiReady,
    token,
    queueQuery,
    queue,
    busy,
    onAcceptReplenishment: (requestId: string) =>
      acceptReplenishmentMut.mutate(requestId),
    onAcceptPickup: (taskId: string) => acceptPickupMut.mutate(taskId),
  };
}

export type OperatorMovimentManualQueuePageViewModel = ReturnType<
  typeof useOperatorMovimentManualQueuePage
>;
