import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';
import { OPERATOR_MOVIMENT_MY_TASKS_PATH } from '@/constants/operator-moviment-routes';
import type { OperatorMovimentTaskItem } from '@/types/operator-moviment-pallet.types';

const MY_TASKS_QUERY_KEY = ['operator-moviment', 'my-tasks'] as const;

/** Atualiza o cache com tarefas já retornadas no POST de aceite (evita esperar refetch). */
export function upsertOperatorMyTasksCache(
  queryClient: QueryClient,
  incoming: OperatorMovimentTaskItem[],
): void {
  if (incoming.length === 0) {
    return;
  }
  queryClient.setQueryData<OperatorMovimentTaskItem[]>(
    [...MY_TASKS_QUERY_KEY],
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
    queryKey: ['operator-moviment', 'my-tasks'],
  });
  void queryClient.invalidateQueries({
    queryKey: ['operator-moviment', 'my-pallet'],
  });
  void queryClient.invalidateQueries({ queryKey: ['operator-machine'] });
}
