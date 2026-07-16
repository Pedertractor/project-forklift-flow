import type { ForkliftTaskStatusApi } from '@/types/operator-moviment-pallet.types';
import type {
  DeliveryTaskListItem,
  MachineTaskStatusValue,
  PickupTaskListItem,
} from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import {
  canCancelPickupRequest,
  findActiveLinkedPickupForSupply,
  findDeliveryForPickup,
  findDeliveryForSupplyRequest,
  findSupplyForDeliveryTask,
  findSupplyForPickup,
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
      kind: 'DELIVERY';
      id: string;
      createdAt: string;
      title: string;
      subtitle: string;
      statusLabel: string;
      isCritical: boolean;
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
    };

const TERMINAL_MACHINE_TASK_STATUSES = new Set<MachineTaskStatusValue>([
  'COMPLETED',
  'CANCELED',
]);

/**
 * Entrega já representada dentro de um card "Entrega + Retirada" (aviso que a
 * originou tem retirada ativa amarrada via `linkedSupplyRequestId`) — nunca
 * vira card avulso de "Entrega à máquina".
 */
function shouldHideReplenishmentDeliveryRow(
  delivery: DeliveryTaskListItem,
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): boolean {
  const supply = findSupplyForDeliveryTask(delivery, supplyRequests);
  if (!supply) return false;
  return Boolean(findActiveLinkedPickupForSupply(supply, pickupTasks));
}

/**
 * Mantém o continuum do aviso ao abastecimento após o fulfill:
 * a entrega vinculada a um aviso ainda ativo (sem retirada amarrada) não vira
 * card separado de «Entrega à máquina» — aparece dentro do card do aviso.
 */
function shouldHideSupplyOnlyDeliveryRow(
  delivery: DeliveryTaskListItem,
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): boolean {
  const supply = findSupplyForDeliveryTask(delivery, supplyRequests);
  if (!supply) return false;
  return supply.status === 'OPEN' || supply.status === 'FULFILLED';
}

function isSupplyOnlyContinuumActive(
  supply: OperatorMachineSupplyRequestListItem,
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
): boolean {
  if (findActiveLinkedPickupForSupply(supply, pickupTasks)) return false;
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

  for (const t of deliveryTasks) {
    if (TERMINAL_MACHINE_TASK_STATUSES.has(t.status)) continue;
    if (shouldHideReplenishmentDeliveryRow(t, pickupTasks, supplyRequests)) {
      continue;
    }
    if (shouldHideSupplyOnlyDeliveryRow(t, supplyRequests)) {
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

    const linkedToReplenishmentFlow = isPickupLinkedToReplenishmentFlow(t);
    const linkedSupply = linkedToReplenishmentFlow
      ? findSupplyForPickup(t, supplyRequests)
      : null;
    const replenishmentDelivery = linkedToReplenishmentFlow
      ? findDeliveryForPickup(t, supplyRequests, deliveryTasks)
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
      linkedToReplenishmentFlow,
      canCancel: canCancelPickupRequest(t, deliveryTasks, supplyRequests),
      linkedSupplyRequestId: linkedSupply?.id ?? null,
    });
  }

  for (const s of supplyRequests) {
    if (!isSupplyOnlyContinuumActive(s, deliveryTasks, pickupTasks)) {
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

  /** Aceitas primeiro; dentro de cada grupo, mais antiga primeiro. */
  return rows.sort((a, b) =>
    compareOperatorMachineRows(
      a,
      b,
      deliveryTasks,
      pickupTasks,
      supplyRequests,
    ),
  );
}

function isTransportActiveStatus(
  status: string | undefined,
): boolean {
  return status === 'ASSIGNED' || status === 'IN_PROGRESS';
}

/**
 * Fluxo já acatado por empilhadeirista / follow-up (há aceite ou status em curso).
 */
export function operatorMachineRowIsAccepted(
  row: OperatorMachineTaskListRow,
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): boolean {
  if (row.kind === 'DELIVERY') {
    const delivery = deliveryTasks.find((t) => t.id === row.id);
    return Boolean(
      delivery?.assignedAt || isTransportActiveStatus(delivery?.status),
    );
  }
  if (row.kind === 'PICKUP') {
    const pickup = pickupTasks.find((t) => t.id === row.id);
    if (
      pickup?.assignedAt ||
      isTransportActiveStatus(pickup?.status)
    ) {
      return true;
    }
    if (row.linkedToReplenishmentFlow && pickup) {
      const delivery = findDeliveryForPickup(pickup, supplyRequests, deliveryTasks);
      return Boolean(
        delivery?.assignedAt || isTransportActiveStatus(delivery?.status),
      );
    }
  }
  return false;
}

/**
 * Início do cronômetro do card: o `createdAt` mais antigo do continuum.
 * Assim, ao anexar uma retirada à entrega em andamento (junção), o timer
 * não reinicia no horário da retirada nova.
 */
export function operatorMachineRowTimerStartIso(
  row: OperatorMachineTaskListRow,
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): string {
  if (row.kind !== 'PICKUP' || !row.linkedToReplenishmentFlow) {
    return row.createdAt;
  }

  const pickup = pickupTasks.find((t) => t.id === row.id);
  if (!pickup) return row.createdAt;

  const candidates = [row.createdAt];
  const supply = findSupplyForPickup(pickup, supplyRequests);
  if (supply?.createdAt) candidates.push(supply.createdAt);
  const delivery = findDeliveryForPickup(
    pickup,
    supplyRequests,
    deliveryTasks,
  );
  if (delivery?.createdAt) candidates.push(delivery.createdAt);

  let earliestIso = row.createdAt;
  let earliestMs = new Date(row.createdAt).getTime();
  for (const iso of candidates) {
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) continue;
    if (!Number.isFinite(earliestMs) || ms < earliestMs) {
      earliestMs = ms;
      earliestIso = iso;
    }
  }
  return earliestIso;
}

/**
 * Instante usado para ordenar o card na fila:
 * - se já houve aceite (`assignedAt`), usa o mais antigo entre as tarefas do fluxo;
 * - senão, usa a data da solicitação.
 */
export function operatorMachineRowSortTime(
  row: OperatorMachineTaskListRow,
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): number {
  const created = new Date(row.createdAt).getTime();
  const assignedTimes: number[] = [];

  const pushAssigned = (iso: string | null | undefined) => {
    if (!iso) return;
    const t = new Date(iso).getTime();
    if (Number.isFinite(t)) assignedTimes.push(t);
  };

  if (row.kind === 'DELIVERY') {
    pushAssigned(deliveryTasks.find((t) => t.id === row.id)?.assignedAt);
  } else if (row.kind === 'PICKUP') {
    const pickup = pickupTasks.find((t) => t.id === row.id);
    pushAssigned(pickup?.assignedAt);
    if (row.linkedToReplenishmentFlow && pickup) {
      pushAssigned(
        findDeliveryForPickup(pickup, supplyRequests, deliveryTasks)
          ?.assignedAt,
      );
    }
  }

  if (assignedTimes.length > 0) {
    return Math.min(...assignedTimes);
  }
  return Number.isFinite(created) ? created : 0;
}

export function compareOperatorMachineRows(
  a: OperatorMachineTaskListRow,
  b: OperatorMachineTaskListRow,
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): number {
  const aAccepted = operatorMachineRowIsAccepted(
    a,
    deliveryTasks,
    pickupTasks,
    supplyRequests,
  );
  const bAccepted = operatorMachineRowIsAccepted(
    b,
    deliveryTasks,
    pickupTasks,
    supplyRequests,
  );
  if (aAccepted !== bAccepted) {
    return aAccepted ? -1 : 1;
  }
  return (
    operatorMachineRowSortTime(a, deliveryTasks, pickupTasks, supplyRequests) -
    operatorMachineRowSortTime(b, deliveryTasks, pickupTasks, supplyRequests)
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
      const supply = findSupplyForPickup(pickup, supplyRequests);
      const delivery = findDeliveryForPickup(
        pickup,
        supplyRequests,
        deliveryTasks,
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
