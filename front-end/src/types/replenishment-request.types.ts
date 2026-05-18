import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';

export type RequestStatusValue =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'ON_MACHINE'
  | 'COMPLETED'
  | 'CANCELED'
  | 'AWAITING_PREPARATION'
  | 'PALLET_READY';

export type PriorityLevelValue = 'VERY_HIGH' | 'HIGH' | 'NORMAL';

export interface ReplenishmentRequestListItem {
  id: string;
  destinationId: string;
  movementCube: string;
  typeMovimentPallet: ReplenishmentMovimentType;
  priorityLevel: PriorityLevelValue;
  status: RequestStatusValue;
  preparedAt: string | null;
  awaitingPreparationSince: string | null;
  /** Quando entrou no status atual (preferir sobre updatedAt para tempo no estado). */
  statusSince: string;
  createdAt: string;
  updatedAt: string;
  requestedById: string;
  requestedBy: {
    id: string;
    name: string;
    employeeId: number | null;
    card: string;
    unit: string;
    role: string;
  };
  destination: {
    id: string;
    name: string;
    position: string;
    userId: string | null;
    typeMachine: { id: string; name: string };
    sector: { id: string; typeSector: string };
  };
  _count: { movimentPalletTasks: number };
  /** Lista de pedidos: retirada já solicitada (tarefa PICKUP aberta). */
  hasOpenPickupTask?: boolean;
}

export interface MarkPalletReadyResponse {
  message: string;
  request: ReplenishmentRequestListItem;
}
