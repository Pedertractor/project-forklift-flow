import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';
import { OPERATOR_MOVIMENT_MY_TASKS_PATH } from '@/constants/operator-moviment-routes';
import { fetchOperatorMyTasks } from '@/services/operator-moviment-pallet-api';
import { useAuthStore } from '@/store/auth.store';
import type { OperatorMovimentTaskItem } from '@/types/operator-moviment-pallet.types';
import {
  filterTasksForMyOperator,
  hasCompletableMovimentWorkForOperator,
} from '@/utils/operator-moviment-work';

export const OPERATOR_MY_TASKS_QUERY_KEY = [
  'operator-moviment',
  'my-tasks',
] as const;

/** Atualiza o cache com tarefas já retornadas no POST de aceite (evita esperar refetch). */
export function upsertOperatorMyTasksCache(
  queryClient: QueryClient,
  incoming: OperatorMovimentTaskItem[],
): void {
  if (incoming.length === 0) {
    return;
  }
  queryClient.setQueryData<OperatorMovimentTaskItem[]>(
    [...OPERATOR_MY_TASKS_QUERY_KEY],
    (prev) => {
      const byId = new Map((prev ?? []).map((task) => [task.id, task]));
      for (const task of incoming) {
        if (!task.request?.destination) {
          continue;
        }
        byId.set(task.id, task);
      }
      return Array.from(byId.values());
    },
  );
}

export function completeOperatorTaskAccept(
  queryClient: QueryClient,
  navigate: NavigateFunction,
  acceptedTasks?: OperatorMovimentTaskItem[],
): void {
  if (acceptedTasks?.length) {
    upsertOperatorMyTasksCache(queryClient, acceptedTasks);
  }
  void navigate(OPERATOR_MOVIMENT_MY_TASKS_PATH);
  void queryClient.invalidateQueries({
    queryKey: ['operator-moviment', 'trip-suggestions'],
  });
  void queryClient.invalidateQueries({
    queryKey: ['operator-moviment', 'replenishment-queue'],
  });
  void queryClient.invalidateQueries({
    queryKey: [...OPERATOR_MY_TASKS_QUERY_KEY],
  });
  void queryClient.invalidateQueries({
    queryKey: ['operator-moviment', 'my-pallet'],
  });
  void queryClient.invalidateQueries({ queryKey: ['operator-machine'] });
}

/**
 * Após falha no POST de aceite, confere se o servidor já atribuiu a tarefa
 * (ex.: timeout de rede com 201 no back-end) e abre «Minhas tarefas».
 */
export async function tryRecoverOperatorTaskAcceptAfterFailure(
  queryClient: QueryClient,
  navigate: NavigateFunction,
): Promise<boolean> {
  const operatorId = useAuthStore.getState().user?.id ?? null;
  if (!operatorId) {
    return false;
  }

  try {
    const tasks = await queryClient.fetchQuery({
      queryKey: [...OPERATOR_MY_TASKS_QUERY_KEY],
      queryFn: fetchOperatorMyTasks,
      staleTime: 0,
    });
    const mine = filterTasksForMyOperator(tasks, operatorId);
    if (!hasCompletableMovimentWorkForOperator(mine, operatorId)) {
      return false;
    }
    completeOperatorTaskAccept(queryClient, navigate, mine);
    return true;
  } catch {
    void queryClient.invalidateQueries({
      queryKey: [...OPERATOR_MY_TASKS_QUERY_KEY],
    });
    return false;
  }
}
