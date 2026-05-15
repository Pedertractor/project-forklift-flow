import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OPERATOR_MOVIMENT_TASKS_QUEUE_PATH } from '@/constants/operator-moviment-routes';
import { ENV } from '@/constants/env';
import { toastApiError } from '@/lib/toast-helpers';
import { toast } from '@/lib/toast';
import {
  fetchOperatorMyMovimentPallet,
  fetchOperatorMyTasks,
  postCompleteDeliverTask,
  postCompletePickupTask,
} from '@/services/operator-moviment-pallet-api';
import { useAuthStore } from '@/store/auth.store';
import { isOpenMovimentTaskStatus } from '@/utils/operator-moviment-work';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useOperatorMovimentTasksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);

  const myPalletQuery = useQuery({
    queryKey: ['operator-moviment', 'my-pallet'],
    queryFn: fetchOperatorMyMovimentPallet,
    enabled: apiReady,
  });

  const myTasksQuery = useQuery({
    queryKey: ['operator-moviment', 'my-tasks'],
    queryFn: fetchOperatorMyTasks,
    enabled: apiReady,
  });

  const goToAvailableTasksAfterComplete = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['operator-moviment'] });
    await queryClient.refetchQueries({ queryKey: ['operator-moviment', 'my-tasks'] });
    navigate(OPERATOR_MOVIMENT_TASKS_QUEUE_PATH, {
      state: { fromTaskCompletion: true },
    });
  }, [queryClient, navigate]);

  const completeDeliverMut = useMutation({
    mutationFn: (taskId: string) => postCompleteDeliverTask(taskId),
    onSuccess: async () => {
      toast.success('Entrega na máquina registrada.');
      await goToAvailableTasksAfterComplete();
    },
    onError: toastApiError,
  });

  const completePickupMut = useMutation({
    mutationFn: (taskId: string) => postCompletePickupTask(taskId),
    onSuccess: async () => {
      toast.success('Retirada para expedição registrada.');
      await goToAvailableTasksAfterComplete();
    },
    onError: toastApiError,
  });

  const tasks = myTasksQuery.data ?? [];
  const openTasks = tasks.filter((t) => isOpenMovimentTaskStatus(t.status));

  const busy = completeDeliverMut.isPending || completePickupMut.isPending;

  return {
    apiReady,
    token,
    currentPallet: myPalletQuery.data ?? null,
    myPalletQuery,
    myTasksQuery,
    openTasks,
    completeDeliverMut,
    completePickupMut,
    busy,
  };
}

export type OperatorMovimentTasksPageViewModel = ReturnType<
  typeof useOperatorMovimentTasksPage
>;
