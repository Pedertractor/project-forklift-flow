import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import type { MachineTaskStatusValue } from '@/types/machine-task.types';

/**
 * Eventos do WebSocket `/ws/operator-moviment-pallet`.
 * Contrato alinhado ao back-end (`operator-moviment-pallet-ws.hub.ts`).
 */
export type OperatorMovimentWsEventType =
  | 'delivery_task_created'
  | 'delivery_queue_updated'
  | 'delivery_task_updated'
  | 'pickup_task_updated'
  | 'trip_suggestions_updated'
  | 'machine_operator_updated'
  | 'machine_production_status_updated'
  | 'machine_tooling_updated'
  | 'operator_supply_request_created'
  /** Legado — mantido para compatibilidade */
  | 'replenishment_request_created'
  | 'replenishment_queue_updated'
  | 'replenishment_status_updated';

export interface OperatorMovimentWsEventBase {
  type: OperatorMovimentWsEventType;
  sectorId?: string;
  typeMovimentPallet?: ReplenishmentMovimentType;
}

export interface OperatorMovimentWsSectorEvent extends OperatorMovimentWsEventBase {
  sectorId: string;
  typeMovimentPallet?: ReplenishmentMovimentType;
}

export interface OperatorMovimentWsDeliveryTaskUpdated
  extends OperatorMovimentWsEventBase {
  type: 'delivery_task_updated';
  sectorId: string;
  taskId: string;
  status: MachineTaskStatusValue;
  typeMovimentPallet: ReplenishmentMovimentType;
  machineId: string;
  destinationUserId: string | null;
}

export interface OperatorMovimentWsPickupTaskUpdated
  extends OperatorMovimentWsEventBase {
  type: 'pickup_task_updated';
  sectorId: string;
  taskId: string;
  status: MachineTaskStatusValue;
  typeMovimentPallet: ReplenishmentMovimentType;
  machineId: string;
  destinationUserId: string | null;
}

export interface OperatorMovimentWsMachineOperatorUpdated
  extends OperatorMovimentWsEventBase {
  type: 'machine_operator_updated';
  machineId: string;
  sectorId: string;
  operatorUserId: string | null;
  affectedUserId: string | null;
}

export interface OperatorMovimentWsMachineProductionStatusUpdated
  extends OperatorMovimentWsEventBase {
  type: 'machine_production_status_updated';
  machineId: string;
  sectorId: string;
  productionStatus: string;
  operatorUserId?: string | null;
  destinationUserId?: string | null;
}

export interface OperatorMovimentWsMachineToolingUpdated
  extends OperatorMovimentWsEventBase {
  type: 'machine_tooling_updated';
  machineId: string;
  sectorId: string;
  action: 'created' | 'updated' | 'deleted';
  toolingId: string;
  tooling: { id: string; name: string; machineId: string } | null;
  operatorUserId?: string | null;
  destinationUserId?: string | null;
}

/** @deprecated Preferir `delivery_task_updated`. */
export interface OperatorMovimentWsReplenishmentStatusUpdated
  extends OperatorMovimentWsEventBase {
  type: 'replenishment_status_updated';
  sectorId: string;
  requestId: string;
  status: string;
  typeMovimentPallet: ReplenishmentMovimentType;
  destinationId: string;
  destinationUserId: string | null;
}

export interface OperatorMovimentWsOperatorSupplyRequestCreated
  extends OperatorMovimentWsEventBase {
  type: 'operator_supply_request_created';
  sectorId: string;
  machineId: string;
}

export type OperatorMovimentWsEvent =
  | OperatorMovimentWsEventBase
  | OperatorMovimentWsSectorEvent
  | OperatorMovimentWsDeliveryTaskUpdated
  | OperatorMovimentWsPickupTaskUpdated
  | OperatorMovimentWsMachineOperatorUpdated
  | OperatorMovimentWsMachineProductionStatusUpdated
  | OperatorMovimentWsMachineToolingUpdated
  | OperatorMovimentWsOperatorSupplyRequestCreated
  | OperatorMovimentWsReplenishmentStatusUpdated;
