import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import type { RequestStatusValue } from '@/types/replenishment-request.types';

/**
 * Eventos do WebSocket `/ws/operator-moviment-pallet`.
 * Contrato alinhado ao back-end (`operator-moviment-pallet-ws.hub.ts`).
 */
export type OperatorMovimentWsEventType =
  | 'replenishment_request_created'
  | 'replenishment_queue_updated'
  | 'trip_suggestions_updated'
  | 'replenishment_status_updated';

export interface OperatorMovimentWsEventBase {
  type: OperatorMovimentWsEventType;
  sectorId?: string;
  typeMovimentPallet?: ReplenishmentMovimentType;
}

export interface OperatorMovimentWsReplenishmentCreated extends OperatorMovimentWsEventBase {
  type: 'replenishment_request_created';
  typeMovimentPallet: ReplenishmentMovimentType;
  sectorId: string;
}

export interface OperatorMovimentWsReplenishmentStatusUpdated
  extends OperatorMovimentWsEventBase {
  type: 'replenishment_status_updated';
  sectorId: string;
  requestId: string;
  status: RequestStatusValue;
  typeMovimentPallet: ReplenishmentMovimentType;
  destinationId: string;
  destinationUserId: string | null;
}

export type OperatorMovimentWsEvent =
  | OperatorMovimentWsEventBase
  | OperatorMovimentWsReplenishmentCreated
  | OperatorMovimentWsReplenishmentStatusUpdated;
