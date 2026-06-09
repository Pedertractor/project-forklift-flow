import type { OperatorMovimentWsEvent } from '@/types/operator-moviment-ws.types';

export const OPERATOR_TRIP_SUGGESTIONS_QUERY_KEY = [
  'operator-moviment',
  'trip-suggestions',
] as const;

export const OPERATOR_REPLENISHMENT_QUEUE_QUERY_KEY = [
  'operator-moviment',
  'replenishment-queue',
] as const;

export const SUPPLY_REPLENISHMENT_REQUESTS_QUERY_KEY = [
  'machine-replenishment-requests',
] as const;

export const SUPPLY_PENDING_PREPARATION_QUERY_KEY = [
  'replenishment',
  'pending-preparation',
] as const;

export const SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY = [
  'supply',
  'pending-operator-supply-requests',
] as const;

/** Debounce só para filas do empilhadeirista (vários eventos em rajada). */
const WS_INVALIDATE_DEBOUNCE_MS = 50;

/** Eventos que alteram a fila principal de sugestões (aceite, nova tarefa, etc.). */
export function shouldInvalidateTripSuggestions(
  event: OperatorMovimentWsEvent,
): boolean {
  switch (event.type) {
    case 'trip_suggestions_updated':
    case 'delivery_task_created':
      return true;
    case 'delivery_task_updated':
    case 'pickup_task_updated':
      return (
        'status' in event &&
        (event.status === 'ASSIGNED' ||
          event.status === 'IN_PROGRESS' ||
          event.status === 'COMPLETED' ||
          event.status === 'CREATED')
      );
    default:
      return false;
  }
}

export function shouldInvalidateReplenishmentQueue(
  event: OperatorMovimentWsEvent,
): boolean {
  return (
    event.type === 'delivery_queue_updated' ||
    event.type === 'delivery_task_updated' ||
    event.type === 'pickup_task_updated' ||
    event.type === 'trip_suggestions_updated'
  );
}

/** Tela «Reposição» do abastecimento (solicitações + aguardando preparo). */
export function shouldInvalidateSupplyReplenishmentPage(
  event: OperatorMovimentWsEvent,
): boolean {
  switch (event.type) {
    case 'operator_supply_request_created':
    case 'delivery_task_created':
      return true;
    case 'delivery_task_updated':
      return 'status' in event;
    default:
      return false;
  }
}

export function shouldInvalidateMyMovimentTasks(
  event: OperatorMovimentWsEvent,
): boolean {
  return (
    event.type === 'delivery_task_updated' || event.type === 'pickup_task_updated'
  );
}

export { WS_INVALIDATE_DEBOUNCE_MS };
