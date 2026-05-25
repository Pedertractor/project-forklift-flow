export type MachineTaskStatusValue =
  | 'CREATED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED';

export type TypeMovimentPalletValue = 'FORKLIFT' | 'ANY';

export interface DeliveryTaskListItem {
  id: string;
  machineId: string;
  movementCube: string;
  typeMovimentPallet: TypeMovimentPalletValue;
  isCritical: boolean;
  status: MachineTaskStatusValue;
  statusSince: string;
  acceptedBySupply: boolean;
  supplyAcceptedAt: string | null;
  preparedAt: string | null;
  requestedById: string;
  assignedMovimentPalletId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  requestedBy?: {
    id: string;
    name: string;
    employeeId?: number | null;
    card?: string;
    unit?: string;
    role?: string;
  };
  machine?: {
    id: string;
    name: string;
    position: string;
    userId?: string | null;
    sectorId?: string;
    typeMachine?: { id: string; name: string };
    sector?: { id: string; typeSector: string };
  };
}

export interface PickupTaskListItem {
  id: string;
  machineId: string;
  typeMovimentPallet: TypeMovimentPalletValue;
  isCritical: boolean;
  status: MachineTaskStatusValue;
  statusSince: string;
  triggersReplenishment: boolean;
  requestedById: string;
  assignedMovimentPalletId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  machine?: {
    id: string;
    name: string;
    position: string;
  };
}
