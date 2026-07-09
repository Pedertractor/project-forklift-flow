import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
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
  filterTasksForMyOperator,
  hasCompletableMovimentWorkForOperator,
} from '@/utils/operator-moviment-work';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export type CompletingTaskFlow = 'deliver' | 'pickup';

export function useOperatorMovimentTasksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const [completingFlow, setCompletingFlow] =
    useState<CompletingTaskFlow | null>(null);

  const myPalletQuery = useQuery({
    queryKey: ['operator-moviment', 'my-pallet'],
    queryFn: fetchOperatorMyMovimentPallet,
    enabled: apiReady,
  });

  const myTasksQuery = useQuery({
    queryKey: ['operator-moviment', 'my-tasks'],
    queryFn: fetchOperatorMyTasks,
    enabled: apiReady,
    staleTime: 0,
    refetchOnMount: 'always',
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

    let tasks = queryClient.getQueryData<
      Awaited<ReturnType<typeof fetchOperatorMyTasks>>
    >(['operator-moviment', 'my-tasks']);
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

    const operatorId = useAuthStore.getState().user?.id ?? null;
    const myTasks = filterTasksForMyOperator(tasks ?? [], operatorId);
    return hasCompletableMovimentWorkForOperator(myTasks, operatorId);
  }, [queryClient]);

  const goToAvailableTasks = useCallback(() => {
    navigate(OPERATOR_MOVIMENT_TASKS_QUEUE_PATH, {
      state: { fromTaskCompletion: true },
      replace: true,
    });
  }, [navigate]);

  const handleTaskCompleteSuccess = useCallback(
    async (successMessage: string) => {
      try {
        const stillHasWork = await afterTaskComplete();
        toast.success(successMessage);
        setCompletingFlow(null);
        if (!stillHasWork) {
          goToAvailableTasks();
        }
      } catch (error) {
        if (!isQueryCancellationError(error)) {
          setCompletingFlow(null);
          throw error;
        }
        toast.success(successMessage);
        setCompletingFlow(null);
        const operatorId = useAuthStore.getState().user?.id ?? null;
        const cached = filterTasksForMyOperator(
          queryClient.getQueryData<
            Awaited<ReturnType<typeof fetchOperatorMyTasks>>
          >(['operator-moviment', 'my-tasks']) ?? [],
          operatorId,
        );
        if (!hasCompletableMovimentWorkForOperator(cached, operatorId)) {
          goToAvailableTasks();
        }
      }
    },
    [afterTaskComplete, goToAvailableTasks, queryClient],
  );

  const completeDeliverMut = useMutation({
    mutationFn: (taskId: string) => postCompleteDeliverTask(taskId),
    onMutate: () => {
      setCompletingFlow('deliver');
    },
    onSuccess: async () => {
      await handleTaskCompleteSuccess('Entrega na máquina registrada.');
    },
    onError: (error) => {
      setCompletingFlow(null);
      toastApiError(error);
    },
  });

  const completePickupMut = useMutation({
    mutationFn: (taskId: string) => postCompletePickupTask(taskId),
    onMutate: () => {
      setCompletingFlow('pickup');
    },
    onSuccess: async () => {
      await handleTaskCompleteSuccess('Retirada para expedição registrada.');
    },
    onError: (error) => {
      setCompletingFlow(null);
      toastApiError(error);
    },
  });

  const currentPallet = myPalletQuery.data ?? null;
  const tasks = filterTasksForMyOperator(myTasksQuery.data ?? [], userId);

  const tasksLoading =
    myTasksQuery.isLoading || (myTasksQuery.isFetching && tasks.length === 0);

  const busy =
    completeDeliverMut.isPending ||
    completePickupMut.isPending ||
    completingFlow !== null;

  useEffect(() => {
    if (!apiReady || tasksLoading || busy || myTasksQuery.isError) {
      return;
    }
    if (hasCompletableMovimentWorkForOperator(tasks, userId)) {
      return;
    }
    goToAvailableTasks();
  }, [
    apiReady,
    tasksLoading,
    busy,
    myTasksQuery.isError,
    tasks,
    userId,
    goToAvailableTasks,
  ]);

  const completingOverlayMessage =
    completingFlow === 'deliver'
      ? 'Registrando entrega…'
      : completingFlow === 'pickup'
        ? 'Registrando retirada…'
        : null;

  return {
    apiReady,
    token,
    userId: userId ?? null,
    currentPallet,
    myPalletQuery,
    myTasksQuery,
    tasks,
    tasksLoading,
    completingOverlayMessage,
    completeDeliverMut,
    completePickupMut,
    busy,
  };
}

export type OperatorMovimentTasksPageViewModel = ReturnType<
  typeof useOperatorMovimentTasksPage
>;
