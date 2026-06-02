import type { MachineListItem } from '@/types/machine.types';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';

/** Resposta de `GET /operator-machine/operator-supply-requests` (Prisma → JSON). */
export interface OperatorMachineSupplyRequestListItem {
  id: string;
  machineId: string;
  requestedById: string;
  status: 'OPEN' | 'FULFILLED' | 'CANCELLED';
  fulfilledAt: string | null;
  fulfilledByReplenishmentRequestId: string | null;
  deliveryTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  deliveryTask?: {
    id: string;
    movementCube: string;
    status: string;
    acceptedBySupply: boolean;
    preparedAt: string | null;
    isCritical: boolean;
  } | null;
  machine: {
    id: string;
    name: string;
    sectorId: string;
    typeMachine: { id: string; name: string; urlImage: string };
  };
  requestedBy: {
    id: string;
    name: string;
    employeeId: number;
    card: string;
    unit: string;
    role: string;
  };
  fulfilledByReplenishmentRequest: {
    id: string;
    movementCube: string;
    status: string;
  } | null;
}

export interface MovimentPalletTaskPickupSummary {
  id: string;
  type: string;
  status: string;
}

export interface OperatorMachinePickupResponse {
  request: ReplenishmentRequestListItem;
  pickupTask: MovimentPalletTaskPickupSummary;
}

export type FinalizeMachineCycleOutcome = 'TRANSPORT_QUEUED' | 'SUPPLY_NOTIFIED';

export interface FinalizeMachineCycleResponse {
  outcome: FinalizeMachineCycleOutcome;
  message: string;
  request?: ReplenishmentRequestListItem;
  operatorSupplyRequest?: OperatorMachineSupplyRequestListItem;
}

export interface OperatorMachineBindResponse {
  machine: MachineListItem;
}

export interface OperatorMyMachineResponse {
  machine: MachineListItem | null;
}

export interface OperatorMachinesListResponse {
  machines: MachineListItem[];
}

export interface OperatorReplenishmentRequestsResponse {
  requests: ReplenishmentRequestListItem[];
}

export interface OperatorSupplyRequestsResponse {
  operatorSupplyRequests: OperatorMachineSupplyRequestListItem[];
}

export type OperatorPickupProgressPhase =
  | 'DELIVERY_IN_PROGRESS'
  | 'AT_MACHINE_AWAITING_PICKUP'
  | 'AWAITING_TRANSPORT_PICKUP'
  | 'TRANSPORT_ASSIGNED'
  | 'TRANSPORT_REMOVING'
  | 'PICKUP_FINISHED'
  | 'OTHER';

export interface OperatorPickupProgressPickupTask {
  id: string;
  requestId: string;
  type: string;
  status: string;
  assignedMovimentPalletId: string | null;
  requestedById: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface OperatorPickupProgressResponse {
  phase: OperatorPickupProgressPhase;
  transportLabel: string;
  request: {
    id: string;
    movementCube: string;
    status: string;
    typeMovimentPallet: string;
  };
  pickupTask: OperatorPickupProgressPickupTask | null;
}
