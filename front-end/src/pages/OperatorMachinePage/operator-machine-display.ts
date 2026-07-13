import type { ForkliftTaskStatusApi } from '@/types/operator-moviment-pallet.types';
import type {
  DeliveryTaskListItem,
  MachineTaskStatusValue,
  PickupTaskListItem,
} from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import {
  canCancelPickupRequest,
  combinedFlowHeadline,
  findCombinedTripPair,
  findDeliveryForSupplyRequest,
  findReplenishmentDeliveryForPickup,
  findReplenishmentSupplyForMachine,
  isCombinedTripSuggestion,
  isPickupLinkedToReplenishmentFlow,
  nextPalletFlowHeadline,
  supplyFlowHeadline,
} from './operator-machine-flow';
import { taskStatusLabelPt } from '@/utils/operator-moviment-labels';
import { formatTaskDate } from '@/utils/operator-moviment-display';

export function machineDeliveryStatusLabel(task: DeliveryTaskListItem): string {
  if (task.status === 'CANCELED') return 'Cancelada';
  if (task.status === 'COMPLETED') return 'Entregue na máquina';
  if (task.status === 'IN_PROGRESS') return 'Transporte a caminho da máquina';
  if (task.status === 'ASSIGNED') {
    return task.preparedAt
      ? 'Transporte atribuído — pallet pronto'
      : 'Transporte atribuído';
  }
  if (!task.acceptedBySupply) return 'Aguardando registro do abastecimento';
  if (!task.preparedAt) return 'Aguardando preparo no recebimento';
  return 'Aguardando transporte (pallet pronto)';
}

export const PICKUP_STATUS_AWAITING = 'Aguardando transporte';
export const PICKUP_STATUS_IN_PROGRESS = 'Retirada em curso';
export const PICKUP_STATUS_DONE = 'Entregue na expedição';

/**
 * Três status do operador da máquina:
 * - CREATED → aguardando o transporte aceitar
 * - ASSIGNED / IN_PROGRESS → retirada em curso (já aceitou)
 * - COMPLETED → entregue na expedição
 */
export function machinePickupStatusLabel(task: PickupTaskListItem): string {
  if (task.status === 'CANCELED') return 'Cancelada';
  if (task.status === 'COMPLETED') return PICKUP_STATUS_DONE;
  if (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') {
    return PICKUP_STATUS_IN_PROGRESS;
  }
  return PICKUP_STATUS_AWAITING;
}

export function machineSupplyStatusLabel(
  supply: OperatorMachineSupplyRequestListItem,
  delivery: DeliveryTaskListItem | null,
): string {
  if (supply.status === 'OPEN' && !delivery) {
    return 'Aguardando abastecimento montar o pallet';
  }
  if (delivery) {
    return machineDeliveryStatusLabel(delivery);
  }
  return supplyFlowHeadline(supply) || 'Aguardando abastecimento';
}

export function machineTaskStatusBadge(status: MachineTaskStatusValue): string {
  const normalizedStatus = (
    status === 'CANCELED' ? 'CANCELLED' : status
  ) as ForkliftTaskStatusApi;
  return taskStatusLabelPt(normalizedStatus);
}

export type OperatorMachineTaskListRow =
  | {
      kind: 'COMBINED';
      id: string;
      deliveryId: string;
      pickupId: string;
      createdAt: string;
      title: string;
      subtitle: string;
      statusLabel: string;
      isCritical: boolean;
    }
  | {
      kind: 'DELIVERY';
      id: string;
      createdAt: string;
      title: string;
      subtitle: string;
      statusLabel: string;
      isCritical: boolean;
      triggersReplenishment?: false;
    }
  | {
      kind: 'PICKUP';
      id: string;
      machineId: string;
      createdAt: string;
      title: string;
      subtitle: string;
      statusLabel: string;
      isCritical: boolean;
      triggersReplenishment: boolean;
      linkedToReplenishmentFlow: boolean;
      canCancel: boolean;
      linkedSupplyRequestId: string | null;
    }
  | {
      kind: 'SUPPLY';
      id: string;
      machineId: string;
      createdAt: string;
      title: string;
      subtitle: string;
      statusLabel: string;
      isCritical: false;
      triggersReplenishment?: false;
    };

const TERMINAL_MACHINE_TASK_STATUSES = new Set<MachineTaskStatusValue>([
  'COMPLETED',
  'CANCELED',
]);

function shouldHideReplenishmentDeliveryRow(
  delivery: DeliveryTaskListItem,
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
  deliveryTasks: DeliveryTaskListItem[],
): boolean {
  return pickupTasks.some((pickup) => {
    if (
      !isPickupLinkedToReplenishmentFlow(pickup, supplyRequests, deliveryTasks)
    ) {
      return false;
    }
    if (TERMINAL_MACHINE_TASK_STATUSES.has(pickup.status)) return false;
    return pickup.machineId === delivery.machineId;
  });
}

/**
 * Mantém o continuum do aviso ao abastecimento após o fulfill:
 * a entrega vinculada não vira card separado de «Entrega à máquina».
 */
function shouldHideSupplyOnlyDeliveryRow(
  delivery: DeliveryTaskListItem,
  supplyRequests: OperatorMachineSupplyRequestListItem[],
  hideSupplyForReplenishmentPickup: boolean,
): boolean {
  if (hideSupplyForReplenishmentPickup) return false;
  return supplyRequests.some((supply) => {
    if (supply.status === 'CANCELLED') return false;
    if (supply.deliveryTaskId === delivery.id) {
      return supply.status === 'OPEN' || supply.status === 'FULFILLED';
    }
    return (
      supply.status === 'OPEN' &&
      !supply.deliveryTaskId &&
      supply.machineId === delivery.machineId &&
      !TERMINAL_MACHINE_TASK_STATUSES.has(delivery.status)
    );
  });
}

function isSupplyOnlyContinuumActive(
  supply: OperatorMachineSupplyRequestListItem,
  deliveryTasks: DeliveryTaskListItem[],
  hideSupplyForReplenishmentPickup: boolean,
): boolean {
  if (hideSupplyForReplenishmentPickup) return false;
  if (supply.status === 'CANCELLED') return false;
  if (supply.status === 'OPEN') return true;
  if (supply.status !== 'FULFILLED') return false;

  const delivery = findDeliveryForSupplyRequest(deliveryTasks, supply);
  if (!delivery) {
    // Ainda não chegou na lista local, mas o aviso foi cumprido — mantém o card.
    return Boolean(supply.deliveryTaskId);
  }
  return !TERMINAL_MACHINE_TASK_STATUSES.has(delivery.status);
}

export function buildOperatorMachineTaskRows(
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): OperatorMachineTaskListRow[] {
  const rows: OperatorMachineTaskListRow[] = [];

  const machineHasReplenishmentPickup = (machineId: string) =>
    pickupTasks.some(
      (pickup) =>
        pickup.machineId === machineId &&
        isPickupLinkedToReplenishmentFlow(
          pickup,
          supplyRequests,
          deliveryTasks,
        ),
    );

  let combinedDeliveryId: string | null = null;
  let combinedPickupId: string | null = null;

  if (isCombinedTripSuggestion(deliveryTasks, pickupTasks, supplyRequests)) {
    const pair = findCombinedTripPair(
      deliveryTasks,
      pickupTasks,
      supplyRequests,
    );
    if (
      pair &&
      pair.delivery.machineId === pair.pickup.machineId &&
      !TERMINAL_MACHINE_TASK_STATUSES.has(pair.pickup.status)
    ) {
      const { delivery, pickup } = pair;
      combinedDeliveryId = delivery.id;
      combinedPickupId = pickup.id;
      rows.push({
        kind: 'COMBINED',
        id: `combined-${delivery.id}-${pickup.id}`,
        deliveryId: delivery.id,
        pickupId: pickup.id,
        createdAt:
          new Date(pickup.createdAt).getTime() >=
          new Date(delivery.createdAt).getTime()
            ? pickup.createdAt
            : delivery.createdAt,
        title: 'Sugestão de viagem',
        subtitle: 'Entrega do pallet no recebimento + retirada na máquina',
        statusLabel: combinedFlowHeadline(delivery, pickup),
        isCritical: delivery.isCritical || pickup.isCritical,
      });
    }
  }

  for (const t of deliveryTasks) {
    if (TERMINAL_MACHINE_TASK_STATUSES.has(t.status)) continue;
    if (t.id === combinedDeliveryId) continue;
    if (
      shouldHideReplenishmentDeliveryRow(
        t,
        pickupTasks,
        supplyRequests,
        deliveryTasks,
      )
    ) {
      continue;
    }
    if (
      shouldHideSupplyOnlyDeliveryRow(
        t,
        supplyRequests,
        machineHasReplenishmentPickup(t.machineId),
      )
    ) {
      continue;
    }
    rows.push({
      kind: 'DELIVERY',
      id: t.id,
      createdAt: t.createdAt,
      title: 'Entrega à máquina',
      subtitle: `Prisma ${t.movementCube}`,
      statusLabel: machineDeliveryStatusLabel(t),
      isCritical: t.isCritical,
    });
  }

  for (const t of pickupTasks) {
    if (TERMINAL_MACHINE_TASK_STATUSES.has(t.status)) continue;
    if (t.id === combinedPickupId) continue;
    const linkedToReplenishmentFlow = isPickupLinkedToReplenishmentFlow(
      t,
      supplyRequests,
      deliveryTasks,
    );
    const linkedSupply = linkedToReplenishmentFlow
      ? findReplenishmentSupplyForMachine(supplyRequests, t.machineId)
      : null;
    const replenishmentDelivery = linkedToReplenishmentFlow
      ? findReplenishmentDeliveryForPickup(
          deliveryTasks,
          supplyRequests,
          t.machineId,
        )
      : null;

    let statusLabel = machinePickupStatusLabel(t);
    if (linkedToReplenishmentFlow) {
      statusLabel = `${statusLabel} · ${nextPalletFlowHeadline(linkedSupply, replenishmentDelivery)}`;
    }

    rows.push({
      kind: 'PICKUP',
      id: t.id,
      machineId: t.machineId,
      createdAt: t.createdAt,
      title: linkedToReplenishmentFlow
        ? 'Retirada + aviso de abastecimento'
        : 'Retirada para expedição',
      subtitle: linkedToReplenishmentFlow
        ? 'Aviso ao abastecimento para próxima entrega'
        : '',
      statusLabel,
      isCritical: t.isCritical,
      triggersReplenishment: t.triggersReplenishment,
      linkedToReplenishmentFlow,
      canCancel: canCancelPickupRequest(t, deliveryTasks),
      linkedSupplyRequestId: linkedSupply?.id ?? null,
    });
  }

  for (const s of supplyRequests) {
    if (
      !isSupplyOnlyContinuumActive(
        s,
        deliveryTasks,
        machineHasReplenishmentPickup(s.machineId),
      )
    ) {
      continue;
    }
    const delivery = findDeliveryForSupplyRequest(deliveryTasks, s);
    const cube = delivery?.movementCube ?? s.deliveryTask?.movementCube ?? null;
    rows.push({
      kind: 'SUPPLY',
      id: s.id,
      machineId: s.machineId,
      createdAt: s.createdAt,
      title: 'Aviso ao abastecimento',
      subtitle: cube ? `Prisma ${cube}` : 'Solicitação de próximo prisma',
      statusLabel: machineSupplyStatusLabel(s, delivery),
      isCritical: false,
    });
  }

  /** Mais antiga primeiro — ordem da solicitação (fila). */
  return rows.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** Recorta as listas para renderizar um único card de fluxo (ex.: monitor TV ordenado). */
export function tasksForOperatorMachineRow(
  row: OperatorMachineTaskListRow,
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): {
  deliveryTasks: DeliveryTaskListItem[];
  pickupTasks: PickupTaskListItem[];
  supplyRequests: OperatorMachineSupplyRequestListItem[];
} {
  if (row.kind === 'COMBINED') {
    return {
      deliveryTasks: deliveryTasks.filter((t) => t.id === row.deliveryId),
      pickupTasks: pickupTasks.filter((t) => t.id === row.pickupId),
      supplyRequests: [],
    };
  }
  if (row.kind === 'DELIVERY') {
    return {
      deliveryTasks: deliveryTasks.filter((t) => t.id === row.id),
      pickupTasks: [],
      supplyRequests: [],
    };
  }
  if (row.kind === 'PICKUP') {
    const pickup = pickupTasks.find((t) => t.id === row.id);
    if (!pickup) {
      return { deliveryTasks: [], pickupTasks: [], supplyRequests: [] };
    }
    if (row.linkedToReplenishmentFlow) {
      const supply = findReplenishmentSupplyForMachine(
        supplyRequests,
        pickup.machineId,
      );
      const delivery = findReplenishmentDeliveryForPickup(
        deliveryTasks,
        supplyRequests,
        pickup.machineId,
      );
      return {
        deliveryTasks: delivery ? [delivery] : [],
        pickupTasks: [pickup],
        supplyRequests: supply ? [supply] : [],
      };
    }
    return {
      deliveryTasks: [],
      pickupTasks: [pickup],
      supplyRequests: [],
    };
  }
  const supply = supplyRequests.find((s) => s.id === row.id);
  if (!supply) {
    return { deliveryTasks: [], pickupTasks: [], supplyRequests: [] };
  }
  const delivery = findDeliveryForSupplyRequest(deliveryTasks, supply);
  return {
    deliveryTasks: delivery ? [delivery] : [],
    pickupTasks: [],
    supplyRequests: [supply],
  };
}

export { formatTaskDate };
