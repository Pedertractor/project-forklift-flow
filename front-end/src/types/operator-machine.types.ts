import type { MachineListItem } from '@/types/machine.types';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';

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
  request: ReplenishmentRequestListItem;
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
