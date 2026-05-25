import type {
  DeliveryTaskListItem,
  MachineTaskStatusValue,
  PickupTaskListItem,
} from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
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

export function machineTaskStatusBadge(status: MachineTaskStatusValue): string {
  return taskStatusLabelPt(status);
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
      triggersReplenishment?: false;
    }
  | {
      kind: 'PICKUP';
      id: string;
      createdAt: string;
      title: string;
      subtitle: string;
      statusLabel: string;
      isCritical: boolean;
      triggersReplenishment: boolean;
      canCancel: boolean;
    }
  | {
      kind: 'SUPPLY';
      id: string;
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

export function buildOperatorMachineTaskRows(
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): OperatorMachineTaskListRow[] {
  const rows: OperatorMachineTaskListRow[] = [];

  for (const t of deliveryTasks) {
    if (TERMINAL_MACHINE_TASK_STATUSES.has(t.status)) continue;
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
    rows.push({
      kind: 'PICKUP',
      id: t.id,
      createdAt: t.createdAt,
      title: t.triggersReplenishment
        ? 'Retirada + aviso de abastecimento'
        : 'Retirada para expedição',
      subtitle: t.triggersReplenishment
        ? 'Aviso ao abastecimento para próxima entrega'
        : '',
      statusLabel: machinePickupStatusLabel(t),
      isCritical: t.isCritical,
      triggersReplenishment: t.triggersReplenishment,
      canCancel: t.status === 'CREATED',
    });
  }

  for (const s of supplyRequests) {
    if (s.status !== 'OPEN') continue;
    const statusLabel =
      s.status === 'OPEN'
        ? 'Aguardando abastecimento registrar entrega'
        : s.status === 'FULFILLED'
          ? 'Atendida — entrega registrada'
          : 'Cancelada';
    const cube = s.fulfilledByReplenishmentRequest?.movementCube;
    rows.push({
      kind: 'SUPPLY',
      id: s.id,
      createdAt: s.createdAt,
      title: 'Aviso ao abastecimento',
      subtitle: cube ? `Prisma ${cube}` : 'Solicitação de próximo prisma',
      statusLabel,
      isCritical: false,
    });
  }

  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export { formatTaskDate };
