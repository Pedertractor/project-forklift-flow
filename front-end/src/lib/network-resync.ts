import type { QueryClient } from '@tanstack/react-query';
import {
  SUPPLY_MACHINE_STATUS_QUERY_KEY,
  SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY,
  SUPPLY_PENDING_PREPARATION_QUERY_KEY,
  SUPPLY_REPLENISHMENT_REQUESTS_QUERY_KEY,
} from '@/lib/operator-moviment-ws-invalidation';

/** Invalida e refaz fetch das filas/tarefas em tempo real após reconexão de rede ou WS. */
export async function resyncRealtimeOperatorQueries(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['operator-moviment'] }),
    queryClient.invalidateQueries({ queryKey: ['operator-machine'] }),
    queryClient.invalidateQueries({ queryKey: ['machines'] }),
    queryClient.invalidateQueries({
      queryKey: [...SUPPLY_REPLENISHMENT_REQUESTS_QUERY_KEY],
    }),
    queryClient.invalidateQueries({
      queryKey: [...SUPPLY_PENDING_PREPARATION_QUERY_KEY],
    }),
    queryClient.invalidateQueries({
      queryKey: [...SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY],
    }),
    queryClient.invalidateQueries({
      queryKey: [...SUPPLY_MACHINE_STATUS_QUERY_KEY],
    }),
    queryClient.invalidateQueries({ queryKey: ['sector-transport-operators'] }),
  ]);
  await queryClient.refetchQueries({ type: 'active' });
}
