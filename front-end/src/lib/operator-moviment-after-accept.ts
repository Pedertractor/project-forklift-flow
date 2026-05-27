import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';
import {
  OPERATOR_MOVIMENT_MY_TASKS_PATH,
  type OperatorMovimentMyTasksNavigateState,
} from '@/constants/operator-moviment-routes';
import { isQueryCancellationError } from '@/lib/query-errors';
import { fetchOperatorMyTasks } from '@/services/operator-moviment-pallet-api';

/** Atualiza cache de tarefas antes de abrir o fluxo (evita tela vazia após aceitar). */
export async function prepareOperatorMyTasksAfterAccept(
  queryClient: QueryClient,
): Promise<void> {
  try {
    await queryClient.refetchQueries({
      queryKey: ['operator-moviment', 'my-tasks'],
      exact: true,
    });
  } catch (error) {
    if (!isQueryCancellationError(error)) {
      throw error;
    }
    try {
      await queryClient.fetchQuery({
        queryKey: ['operator-moviment', 'my-tasks'],
        queryFn: fetchOperatorMyTasks,
      });
    } catch (retryError) {
      if (!isQueryCancellationError(retryError)) {
        throw retryError;
      }
    }
  }

  void queryClient.invalidateQueries({ queryKey: ['operator-moviment'] });
}

export function navigateToMyTasksAfterAccept(navigate: NavigateFunction): void {
  const state: OperatorMovimentMyTasksNavigateState = { enteringTaskFlow: true };
  void navigate(OPERATOR_MOVIMENT_MY_TASKS_PATH, { state });
}

export async function completeOperatorTaskAccept(
  queryClient: QueryClient,
  navigate: NavigateFunction,
): Promise<void> {
  await prepareOperatorMyTasksAfterAccept(queryClient);
  navigateToMyTasksAfterAccept(navigate);
}
