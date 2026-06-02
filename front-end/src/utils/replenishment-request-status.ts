import type {
  ReplenishmentRequestListItem,
  RequestStatusValue,
} from '@/types/replenishment-request.types';

const TERMINAL_STATUSES = new Set<RequestStatusValue>([
  'COMPLETED',
  'CANCELED',
]);

export function isOpenReplenishmentRequest(
  row: Pick<ReplenishmentRequestListItem, 'status'>,
): boolean {
  return !TERMINAL_STATUSES.has(row.status);
}
