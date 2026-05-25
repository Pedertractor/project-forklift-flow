import type { FlowStepStatus } from '@/components/activity/HorizontalActivityStepper';
import type {
  DeliveryTaskListItem,
  MachineTaskStatusValue,
  PickupTaskListItem,
} from '@/types/machine-task.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';

const OPEN_STATUSES = new Set<MachineTaskStatusValue>([
  'CREATED',
  'ASSIGNED',
  'IN_PROGRESS',
]);

const ACCEPTED_BY_TRANSPORT_STATUSES = new Set<MachineTaskStatusValue>([
  'ASSIGNED',
  'IN_PROGRESS',
]);

/** Três etapas exibidas ao operador da máquina (alinhadas à lista de solicitações). */
export const PICKUP_FLOW_STEPS = [
  { key: 'awaiting', title: 'Aguardando transporte' },
  { key: 'removing', title: 'Retirada em curso' },
  { key: 'done', title: 'Entregue na expedição' },
] as const;

/** Entrega à máquina (visão do operador). */
export const DELIVERY_FLOW_STEPS = [
  { key: 'supply', title: 'Preparo no recebimento' },
  { key: 'awaiting', title: 'Aguardando transporte' },
  { key: 'delivering', title: 'Entrega na máquina' },
] as const;

/** Sugestão de viagem: entrega preparada + retirada na mesma máquina. */
export const COMBINED_FLOW_STEPS = [
  { key: 'receiving', title: 'Recebimento' },
  { key: 'deliver', title: 'Entrega na máquina' },
  { key: 'on-machine', title: 'Pallet na máquina' },
  { key: 'pickup', title: 'Retirada em curso' },
  { key: 'expedition', title: 'Expedição' },
] as const;

export type PickupFlowPhase = 'AWAITING' | 'IN_PROGRESS' | 'DONE' | 'IDLE';
export type DeliveryFlowPhase = 'SUPPLY' | 'AWAITING' | 'IN_PROGRESS' | 'DONE' | 'IDLE';
export type OperationTimelineMode = 'combined' | 'delivery' | 'pickup' | null;

/**
 * Retirada aberta mais recente — mesma referência para lista e linha do tempo.
 * Evita o stepper acompanhar um pedido antigo enquanto a lista mostra outro.
 */
export function pickupTaskDrivingMachineUi(
  pickupTasks: PickupTaskListItem[],
): PickupTaskListItem | null {
  const open = pickupTasks.filter((p) => OPEN_STATUSES.has(p.status));
  if (!open.length) return null;
  return open.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}

/** Entrega aberta mais recente aceita pelo abastecimento. */
export function deliveryTaskDrivingMachineUi(
  deliveryTasks: DeliveryTaskListItem[],
): DeliveryTaskListItem | null {
  const open = deliveryTasks.filter(
    (d) => OPEN_STATUSES.has(d.status) && d.acceptedBySupply,
  );
  if (!open.length) return null;
  return open.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}

/** Sugestão de viagem: entrega preparada na fila + retirada aberta na mesma máquina. */
export function isCombinedTripSuggestion(
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
): boolean {
  const delivery = deliveryTaskDrivingMachineUi(deliveryTasks);
  const pickup = pickupTaskDrivingMachineUi(pickupTasks);
  return Boolean(
    delivery &&
      pickup &&
      delivery.preparedAt != null &&
      OPEN_STATUSES.has(delivery.status) &&
      OPEN_STATUSES.has(pickup.status),
  );
}

export function resolveOperationTimelineMode(
  deliveryTasks: DeliveryTaskListItem[],
  pickupTasks: PickupTaskListItem[],
): OperationTimelineMode {
  if (isCombinedTripSuggestion(deliveryTasks, pickupTasks)) {
    return 'combined';
  }
  if (deliveryTaskDrivingMachineUi(deliveryTasks)) {
    return 'delivery';
  }
  if (pickupTaskDrivingMachineUi(pickupTasks)) {
    return 'pickup';
  }
  return null;
}

export function canRequestPickup(
  deliveryTasks: DeliveryTaskListItem[],
  _pickupTasks: PickupTaskListItem[],
): boolean {
  return deliveryTasks.some((t) => t.status === 'COMPLETED' && t.completedAt);
}

export function pickupBlockedReason(
  deliveryTasks: DeliveryTaskListItem[],
  _pickupTasks: PickupTaskListItem[],
): string | null {
  if (canRequestPickup(deliveryTasks, _pickupTasks)) return null;
  return 'Aguarde uma entrega ser concluída na máquina para solicitar a retirada do prisma.';
}

export function hasOpenPickup(pickupTasks: PickupTaskListItem[]): boolean {
  return pickupTasks.some((p) => OPEN_STATUSES.has(p.status));
}

/** Linha do tempo só para a retirada mais recente, após o transporte aceitar. */
export function shouldShowPickupTimeline(
  pickupTasks: PickupTaskListItem[],
): boolean {
  const task = pickupTaskDrivingMachineUi(pickupTasks);
  return Boolean(task && ACCEPTED_BY_TRANSPORT_STATUSES.has(task.status));
}

export function hasOpenDeliveryInProgress(
  deliveryTasks: DeliveryTaskListItem[],
): boolean {
  return deliveryTasks.some(
    (t) =>
      OPEN_STATUSES.has(t.status) && t.acceptedBySupply && t.preparedAt != null,
  );
}

/**
 * Fase visual = três status do operador da máquina.
 * ASSIGNED (transporte aceitou) já é «Retirada em curso», não «Aguardando transporte».
 */
export function derivePickupFlowPhaseFromTask(
  task: PickupTaskListItem | null,
): PickupFlowPhase {
  if (!task) return 'IDLE';
  if (task.status === 'COMPLETED') return 'DONE';
  if (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') {
    return 'IN_PROGRESS';
  }
  if (task.status === 'CREATED') return 'AWAITING';
  return 'IDLE';
}

/** Círculos do stepper = mesmo significado que `machinePickupStatusLabel`. */
export function pickupFlowStepStatusesFromTask(
  task: PickupTaskListItem | null,
): FlowStepStatus[] {
  if (!task) return ['pending', 'pending', 'pending'];
  switch (task.status) {
    case 'COMPLETED':
      return ['done', 'done', 'done'];
    case 'ASSIGNED':
    case 'IN_PROGRESS':
      return ['done', 'active', 'pending'];
    case 'CREATED':
      return ['active', 'pending', 'pending'];
    default:
      return ['pending', 'pending', 'pending'];
  }
}

export function deriveAcceptedPickupFlowPhase(
  pickupTasks: PickupTaskListItem[],
): PickupFlowPhase {
  return derivePickupFlowPhaseFromTask(pickupTaskDrivingMachineUi(pickupTasks));
}

export function pickupFlowStepStatuses(
  phase: PickupFlowPhase,
): FlowStepStatus[] {
  switch (phase) {
    case 'AWAITING':
      return ['active', 'pending', 'pending'];
    case 'IN_PROGRESS':
      return ['done', 'active', 'pending'];
    case 'DONE':
      return ['done', 'done', 'done'];
    default:
      return ['pending', 'pending', 'pending'];
  }
}

export function deriveDeliveryFlowPhaseFromTask(
  task: DeliveryTaskListItem | null,
): DeliveryFlowPhase {
  if (!task) return 'IDLE';
  if (task.status === 'COMPLETED') return 'DONE';
  if (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') {
    return 'IN_PROGRESS';
  }
  if (task.preparedAt) return 'AWAITING';
  if (task.acceptedBySupply) return 'SUPPLY';
  return 'IDLE';
}

export function deliveryFlowStepStatusesFromTask(
  task: DeliveryTaskListItem | null,
): FlowStepStatus[] {
  if (!task) return ['pending', 'pending', 'pending'];
  if (task.status === 'COMPLETED') return ['done', 'done', 'done'];
  if (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') {
    return ['done', 'done', 'active'];
  }
  if (task.preparedAt) return ['done', 'active', 'pending'];
  if (task.acceptedBySupply) return ['active', 'pending', 'pending'];
  return ['pending', 'pending', 'pending'];
}

export function deliveryFlowHeadline(
  phase: DeliveryFlowPhase,
  task?: DeliveryTaskListItem | null,
): string {
  if (!task) return 'Acompanhe a entrega do prisma à máquina.';
  if (!task.acceptedBySupply || phase === 'SUPPLY') {
    return 'Aguardando o abastecimento registrar e preparar o pallet.';
  }
  if (task.preparedAt && task.status === 'CREATED') {
    return 'Pallet pronto — aguardando o transporte buscar no recebimento.';
  }
  if (phase === 'IN_PROGRESS') {
    return 'O transporte está levando o pallet até a máquina.';
  }
  if (phase === 'DONE') return 'Prisma entregue na máquina.';
  return 'Acompanhe a entrega do prisma à máquina.';
}

/**
 * Sugestão combinada: etapas de retirada só avançam após `DeliveryTask` COMPLETED
 * (empilhadeirista confirmou entrega na máquina).
 */
export function combinedFlowStepStatusesFromTasks(
  delivery: DeliveryTaskListItem | null,
  pickup: PickupTaskListItem | null,
): FlowStepStatus[] {
  if (!delivery || !pickup) {
    return ['pending', 'pending', 'pending', 'pending', 'pending'];
  }

  const prepared = Boolean(delivery.preparedAt);
  const deliveryDone = delivery.status === 'COMPLETED';
  const deliveryInProgress =
    delivery.status === 'ASSIGNED' ||
    delivery.status === 'IN_PROGRESS' ||
    (delivery.status === 'CREATED' && prepared);

  const pickupDone = pickup.status === 'COMPLETED';
  const pickupInProgress =
    pickup.status === 'ASSIGNED' || pickup.status === 'IN_PROGRESS';

  const receiving: FlowStepStatus = prepared ? 'done' : 'active';

  let deliver: FlowStepStatus = 'pending';
  if (deliveryDone) deliver = 'done';
  else if (deliveryInProgress) deliver = 'active';

  let onMachine: FlowStepStatus = 'pending';
  if (deliveryDone) {
    if (pickupInProgress || pickupDone) onMachine = 'done';
    else onMachine = 'active';
  }

  let pickupStep: FlowStepStatus = 'pending';
  if (pickupDone) pickupStep = 'done';
  else if (pickupInProgress && deliveryDone) pickupStep = 'active';

  let expedition: FlowStepStatus = 'pending';
  if (pickupDone) expedition = 'done';
  else if (pickupInProgress) expedition = 'active';

  return [receiving, deliver, onMachine, pickupStep, expedition];
}

export function combinedFlowHeadline(
  delivery: DeliveryTaskListItem | null,
  pickup: PickupTaskListItem | null,
): string {
  if (!delivery || !pickup) {
    return 'Sugestão de viagem combinada (entrega + retirada) para o transporte.';
  }
  const deliveryDone = delivery.status === 'COMPLETED';
  const pickupInProgress =
    pickup.status === 'ASSIGNED' || pickup.status === 'IN_PROGRESS';

  if (!deliveryDone && delivery.preparedAt) {
    return 'Primeiro o transporte entrega o pallet na máquina; a retirada só começa depois dessa confirmação.';
  }
  if (deliveryDone && pickupInProgress) {
    return 'Pallet na máquina — retirada em curso até a expedição.';
  }
  if (deliveryDone && pickup.status === 'CREATED') {
    return 'Entrega confirmada na máquina — aguardando o transporte iniciar a retirada.';
  }
  return 'Acompanhe a sugestão de viagem (entrega e retirada) na fila do transporte.';
}

export function operationTimelineTitle(mode: OperationTimelineMode): string {
  switch (mode) {
    case 'combined':
      return 'Sugestão de viagem';
    case 'delivery':
      return 'Entrega de pallet';
    case 'pickup':
      return 'Retirada de pallet';
    default:
      return 'Movimentação';
  }
}

export function pickupFlowHeadline(
  phase: PickupFlowPhase,
  task?: PickupTaskListItem | null,
): string {
  const status = task?.status;
  if (status === 'CREATED' || phase === 'AWAITING') {
    return 'Aguardando um empilhadeirista aceitar a retirada.';
  }
  if (
    status === 'ASSIGNED' ||
    status === 'IN_PROGRESS' ||
    phase === 'IN_PROGRESS'
  ) {
    return 'O transporte aceitou — retirada em curso até a expedição.';
  }
  if (status === 'COMPLETED' || phase === 'DONE') {
    return 'Pallet entregue na expedição.';
  }
  return 'Acompanhe a retirada mais recente solicitada.';
}

export function hasOpenOperatorSupply(
  openSupply: OperatorMachineSupplyRequestListItem | null,
): boolean {
  return openSupply?.status === 'OPEN';
}

export function canRequestSupply(
  openSupply: OperatorMachineSupplyRequestListItem | null,
): boolean {
  return !hasOpenOperatorSupply(openSupply);
}

export function canOpenServiceRequestDialog(
  canPickup: boolean,
  openSupply: OperatorMachineSupplyRequestListItem | null,
): boolean {
  return canPickup || canRequestSupply(openSupply);
}

export function shouldShowSupplyPanel(
  openSupply: OperatorMachineSupplyRequestListItem | null,
): boolean {
  return hasOpenOperatorSupply(openSupply);
}

export function supplyFlowHeadline(
  openSupply: OperatorMachineSupplyRequestListItem | null,
): string {
  if (openSupply?.status === 'OPEN') {
    return 'O abastecimento foi avisado e deve registrar a entrega do próximo prisma.';
  }
  return '';
}
