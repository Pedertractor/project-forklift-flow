import type { TypeMovimentPalletApi } from '@/types/operator-moviment-pallet.types';

/**
 * Eventos esperados do WebSocket do operador de movimentação.
 * Contrato alinhado ao back-end quando `ws/operator-moviment-pallet` estiver ativo.
 */
export type OperatorMovimentWsEventType =
  | 'replenishment_request_created'
  | 'replenishment_queue_updated'
  | 'trip_suggestions_updated';

export interface OperatorMovimentWsEventBase {
  type: OperatorMovimentWsEventType;
  /** Setor afetado (filtro no cliente). */
  sectorId?: string;
  /** Tipo de movimentação do pedido (FORKLIFT / PALLET_TRUCK). */
  typeMovimentPallet?: TypeMovimentPalletApi;
}

export interface OperatorMovimentWsReplenishmentCreated extends OperatorMovimentWsEventBase {
  type: 'replenishment_request_created';
  typeMovimentPallet: TypeMovimentPalletApi;
  sectorId: string;
}

export type OperatorMovimentWsEvent = OperatorMovimentWsEventBase;
