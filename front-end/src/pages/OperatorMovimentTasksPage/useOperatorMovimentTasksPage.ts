import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OPERATOR_MOVIMENT_TASKS_QUEUE_PATH } from '@/constants/operator-moviment-routes';
import { ENV } from '@/constants/env';
import { isQueryCancellationError } from '@/lib/query-errors';
import { toastApiError } from '@/lib/toast-helpers';
import { toast } from '@/lib/toast';
import {
  fetchOperatorMyMovimentPallet,
  fetchOperatorMyTasks,
  postCompleteDeliverTask,
  postCompletePickupTask,
} from '@/services/operator-moviment-pallet-api';
import { useAuthStore } from '@/store/auth.store';
import {
  countOpenMovimentTasksForPallet,
  filterTasksForMyPallet,
} from '@/utils/operator-moviment-work';

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

  const afterTaskComplete = useCallback(async () => {
    // Evita invalidate + fetchQuery: o WS invalida ao mesmo tempo e gera CancelledError.
    await Promise.all([
      queryClient.refetchQueries({
        queryKey: ['operator-moviment', 'my-tasks'],
        exact: true,
      }),
      queryClient.refetchQueries({
        queryKey: ['operator-moviment', 'my-pallet'],
        exact: true,
      }),
    ]);

    let tasks =
      queryClient.getQueryData<Awaited<ReturnType<typeof fetchOperatorMyTasks>>>([
        'operator-moviment',
        'my-tasks',
      ]);
    const pallet =
      queryClient.getQueryData<
        Awaited<ReturnType<typeof fetchOperatorMyMovimentPallet>>
      >(['operator-moviment', 'my-pallet']) ?? null;

    if (tasks === undefined) {
      try {
        tasks = await queryClient.fetchQuery({
          queryKey: ['operator-moviment', 'my-tasks'],
          queryFn: fetchOperatorMyTasks,
        });
      } catch (error) {
        if (!isQueryCancellationError(error)) throw error;
        tasks =
          queryClient.getQueryData<
            Awaited<ReturnType<typeof fetchOperatorMyTasks>>
          >(['operator-moviment', 'my-tasks']) ?? [];
      }
    }

    return countOpenMovimentTasksForPallet(tasks, pallet?.id ?? null);
  }, [queryClient]);

  const completeDeliverMut = useMutation({
    mutationFn: (taskId: string) => postCompleteDeliverTask(taskId),
    onSuccess: async () => {
      try {
        const stillOpenCount = await afterTaskComplete();
        if (stillOpenCount > 0) {
          toast.success(
            'Entrega na máquina registrada. Continue na mesma rota para concluir a retirada na expedição.',
          );
          return;
        }
        toast.success('Entrega na máquina registrada.');
        navigate(OPERATOR_MOVIMENT_TASKS_QUEUE_PATH, {
          state: { fromTaskCompletion: true },
        });
      } catch (error) {
        if (!isQueryCancellationError(error)) throw error;
        toast.success('Entrega na máquina registrada.');
      }
    },
    onError: toastApiError,
  });

  const completePickupMut = useMutation({
    mutationFn: (taskId: string) => postCompletePickupTask(taskId),
    onSuccess: async () => {
      try {
        const stillOpenCount = await afterTaskComplete();
        if (stillOpenCount > 0) {
          toast.success('Retirada registrada. Ainda há outras tarefas em aberto.');
          return;
        }
        toast.success('Retirada para expedição registrada.');
        navigate(OPERATOR_MOVIMENT_TASKS_QUEUE_PATH, {
          state: { fromTaskCompletion: true },
        });
      } catch (error) {
        if (!isQueryCancellationError(error)) throw error;
        toast.success('Retirada para expedição registrada.');
      }
    },
    onError: toastApiError,
  });

  const currentPallet = myPalletQuery.data ?? null;
  const tasks = filterTasksForMyPallet(
    myTasksQuery.data ?? [],
    currentPallet?.id,
  );

  const busy = completeDeliverMut.isPending || completePickupMut.isPending;

  return {
    apiReady,
    token,
    currentPallet,
    myPalletQuery,
    myTasksQuery,
    tasks,
    completeDeliverMut,
    completePickupMut,
    busy,
  };
}

export type OperatorMovimentTasksPageViewModel = ReturnType<
  typeof useOperatorMovimentTasksPage
>;
