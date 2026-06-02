import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  OPERATOR_MOVIMENT_TASKS_QUEUE_PATH,
  type OperatorMovimentMyTasksNavigateState,
} from '@/constants/operator-moviment-routes';
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
  countOpenMovimentTasksForOperator,
  filterTasksForMyOperator,
} from '@/utils/operator-moviment-work';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export type CompletingTaskFlow = 'deliver' | 'pickup';

export function useOperatorMovimentTasksPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const [completingFlow, setCompletingFlow] =
    useState<CompletingTaskFlow | null>(null);

  const enteringTaskFlow = Boolean(
    (location.state as OperatorMovimentMyTasksNavigateState | null)
      ?.enteringTaskFlow,
  );

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
    return countOpenMovimentTasksForOperator(tasks ?? [], operatorId);
  }, [queryClient]);

  const completeDeliverMut = useMutation({
    mutationFn: (taskId: string) => postCompleteDeliverTask(taskId),
    onMutate: () => {
      setCompletingFlow('deliver');
    },
    onSuccess: async () => {
      try {
        const stillOpenCount = await afterTaskComplete();
        toast.success('Entrega na máquina registrada.');
        if (stillOpenCount > 0) {
          setCompletingFlow(null);
          return;
        }
        navigate(OPERATOR_MOVIMENT_TASKS_QUEUE_PATH, {
          state: { fromTaskCompletion: true },
        });
      } catch (error) {
        if (!isQueryCancellationError(error)) {
          setCompletingFlow(null);
          throw error;
        }
        toast.success('Entrega na máquina registrada.');
        setCompletingFlow(null);
      }
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
      try {
        const stillOpenCount = await afterTaskComplete();
        toast.success('Retirada para expedição registrada.');
        if (stillOpenCount > 0) {
          setCompletingFlow(null);
          return;
        }
        navigate(OPERATOR_MOVIMENT_TASKS_QUEUE_PATH, {
          state: { fromTaskCompletion: true },
        });
      } catch (error) {
        if (!isQueryCancellationError(error)) {
          setCompletingFlow(null);
          throw error;
        }
        toast.success('Retirada para expedição registrada.');
        setCompletingFlow(null);
      }
    },
    onError: (error) => {
      setCompletingFlow(null);
      toastApiError(error);
    },
  });

  const currentPallet = myPalletQuery.data ?? null;
  const tasks = filterTasksForMyOperator(myTasksQuery.data ?? [], userId);

  const openTaskCount = countOpenMovimentTasksForOperator(tasks, userId ?? null);

  const showEntryOverlay = useMemo(() => {
    if (!enteringTaskFlow || myTasksQuery.isError) {
      return false;
    }
    if (openTaskCount > 0) {
      return false;
    }
    return myTasksQuery.isLoading || myTasksQuery.isFetching;
  }, [
    enteringTaskFlow,
    myTasksQuery.isError,
    myTasksQuery.isFetching,
    myTasksQuery.isLoading,
    openTaskCount,
  ]);

  useEffect(() => {
    if (!enteringTaskFlow) {
      return;
    }
    if (openTaskCount > 0) {
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    if (myTasksQuery.isSuccess && !myTasksQuery.isFetching) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [
    enteringTaskFlow,
    location.pathname,
    myTasksQuery.isFetching,
    myTasksQuery.isSuccess,
    navigate,
    openTaskCount,
  ]);

  const tasksLoading =
    myTasksQuery.isLoading || (myTasksQuery.isFetching && tasks.length === 0);

  const busy =
    completeDeliverMut.isPending ||
    completePickupMut.isPending ||
    completingFlow !== null;

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
    showEntryOverlay,
    completingOverlayMessage,
    completeDeliverMut,
    completePickupMut,
    busy,
  };
}

export type OperatorMovimentTasksPageViewModel = ReturnType<
  typeof useOperatorMovimentTasksPage
>;
