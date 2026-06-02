import type { OperatorMovimentWsEvent } from '@/types/operator-moviment-ws.types';

export const OPERATOR_TRIP_SUGGESTIONS_QUERY_KEY = [
  'operator-moviment',
  'trip-suggestions',
] as const;

export const OPERATOR_REPLENISHMENT_QUEUE_QUERY_KEY = [
  'operator-moviment',
  'replenishment-queue',
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
        event.status === 'ASSIGNED' ||
        event.status === 'IN_PROGRESS' ||
        event.status === 'COMPLETED' ||
        event.status === 'CREATED'
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

export function shouldInvalidateMyMovimentTasks(
  event: OperatorMovimentWsEvent,
): boolean {
  return (
    event.type === 'delivery_task_updated' || event.type === 'pickup_task_updated'
  );
}

export { WS_INVALIDATE_DEBOUNCE_MS };
