import type { MachineListItem } from '@/types/machine.types';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';
import type { RequestStatusValue } from '@/types/replenishment-request.types';
import {
  PLANT_MAP_STATE_LABEL,
  type PlantMapVisualKey,
} from '@/utils/plantMapNodeColors';

export type { PlantMapVisualKey } from '@/utils/plantMapNodeColors';

const TERMINAL_STATUSES = new Set<RequestStatusValue>(['COMPLETED', 'CANCELED']);

const AWAITING_DELIVERY_STATUSES = new Set<RequestStatusValue>([
  'AWAITING_PREPARATION',
  'PALLET_READY',
  'CREATED',
  'IN_PROGRESS',
]);

function isOpenRequest(r: ReplenishmentRequestListItem): boolean {
  return !TERMINAL_STATUSES.has(r.status);
}

function requestRecencyMs(r: ReplenishmentRequestListItem): number {
  const iso = r.statusSince ?? r.updatedAt;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function machineHasOperator(machine: MachineListItem): boolean {
  return (
    machine.userId !== null &&
    machine.userId !== undefined &&
    machine.userId.trim() !== ''
  );
}

export function resolvePlantMapVisualKey(
  machine: MachineListItem,
  open: ReplenishmentRequestListItem | null,
): PlantMapVisualKey {
  if (!open) {
    return machineHasOperator(machine) ? 'IDLE_WITH_OPERATOR' : 'IDLE_NO_OPERATOR';
  }
  if (open.status === 'ON_MACHINE') {
    return open.hasOpenPickupTask ? 'AWAITING_PICKUP' : 'IN_PRODUCTION';
  }
  if (AWAITING_DELIVERY_STATUSES.has(open.status)) {
    return 'AWAITING_DELIVERY';
  }
  return 'AWAITING_DELIVERY';
}

export function pickLatestOpenRequestForMachine(
  machineId: string,
  requests: ReplenishmentRequestListItem[],
): ReplenishmentRequestListItem | null {
  const forMachine = requests.filter((r) => r.destinationId === machineId && isOpenRequest(r));
  if (forMachine.length === 0) {
    return null;
  }
  return forMachine.reduce((best, cur) =>
    requestRecencyMs(cur) >= requestRecencyMs(best) ? cur : best,
  );
}

export interface MachineProcessSummary {
  processLabel: string;
  sinceIso: string | null;
  visualKey: PlantMapVisualKey;
  openRequest: ReplenishmentRequestListItem | null;
}

/**
 * Define processo, tempo e cor do ponto no mapa (5 estados de supervisão).
 */
export function summarizeMachineProcess(
  machine: MachineListItem,
  requests: ReplenishmentRequestListItem[],
): MachineProcessSummary {
  const open = pickLatestOpenRequestForMachine(machine.id, requests);
  const visualKey = resolvePlantMapVisualKey(machine, open);
  return {
    processLabel: PLANT_MAP_STATE_LABEL[visualKey],
    sinceIso: open ? (open.statusSince ?? open.updatedAt) : null,
    visualKey,
    openRequest: open,
  };
}
