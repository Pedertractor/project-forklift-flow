import type { MachineStreetBrief } from '@/types/machine.types';

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
  assignedAt: string | null;
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
    userId?: string | null;
    sectorId?: string;
    assetNumber?: string | null;
    pillar?: string | null;
    machineStreet?: MachineStreetBrief | null;
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
  /**
   * Vínculo explícito e único com o aviso de abastecimento que forma o
   * continuum "Entrega + Retirada" desta retirada (substitui a antiga flag
   * `triggersReplenishment`, reinferida por heurística). `null` = retirada
   * avulsa, sem nenhum vínculo.
   */
  linkedSupplyRequestId: string | null;
  requestedById: string;
  assignedMovimentPalletId: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
  completedAt: string | null;
  machine?: {
    id: string;
    name: string;
    assetNumber?: string | null;
    pillar?: string | null;
    machineStreet?: MachineStreetBrief | null;
  };
}
