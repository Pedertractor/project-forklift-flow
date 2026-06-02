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
  { key: 'transporting', title: 'Transporte a caminho' },
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

/** Entrega aceita pelo abastecimento, pallet pronto no recebimento, aguardando transporte. */
export function hasPalletAtReceiving(
  deliveryTasks: DeliveryTaskListItem[],
): boolean {
  return deliveryTasks.some(
    (t) =>
      t.status === 'CREATED' &&
      t.acceptedBySupply &&
      t.preparedAt != null,
  );
}

export const PALLET_AT_RECEIVING_SUPPLY_BLOCKED_MESSAGE =
  'Há pallet no recebimento aguardando transporte. Solicite apenas a retirada do pallet na máquina para abrir a sugestão de entrega e retirada.';

export function canRequestPickup(
  deliveryTasks: DeliveryTaskListItem[],
  _pickupTasks: PickupTaskListItem[],
): boolean {
  return deliveryTasks.some((t) => t.status === 'COMPLETED' && t.completedAt);
}

export function canRequestPickupWithReplenishment(
  deliveryTasks: DeliveryTaskListItem[],
): boolean {
  return !hasPalletAtReceiving(deliveryTasks);
}

export function pickupBlockedReason(
  deliveryTasks: DeliveryTaskListItem[],
  _pickupTasks: PickupTaskListItem[],
): string | null {
  if (canRequestPickup(deliveryTasks, _pickupTasks)) return null;
  return 'Aguarde uma entrega ser concluída na máquina para solicitar a retirada do pallet.';
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
  const pending4: FlowStepStatus[] = ['pending', 'pending', 'pending', 'pending'];
  if (!task) return pending4;
  if (task.status === 'COMPLETED') return ['done', 'done', 'done', 'done'];
  if (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') {
    return ['done', 'done', 'active', 'pending'];
  }
  if (task.preparedAt) return ['done', 'active', 'pending', 'pending'];
  if (task.acceptedBySupply) return ['active', 'pending', 'pending', 'pending'];
  return pending4;
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
  deliveryTasks: DeliveryTaskListItem[] = [],
): boolean {
  if (hasPalletAtReceiving(deliveryTasks)) return false;
  return !hasOpenOperatorSupply(openSupply);
}

export function canOpenServiceRequestDialog(
  canPickup: boolean,
  openSupply: OperatorMachineSupplyRequestListItem | null,
  deliveryTasks: DeliveryTaskListItem[] = [],
): boolean {
  if (hasPalletAtReceiving(deliveryTasks)) {
    return canPickup;
  }
  return canPickup || canRequestSupply(openSupply, deliveryTasks);
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
    return 'Aguardando o abastecimento montar o próximo pallet.';
  }
  return '';
}

/** Aviso ao abastecimento (somente abastecimento). */
export const SUPPLY_ONLY_FLOW_STEPS = [
  { key: 'notice', title: 'Aviso ao abastecimento' },
  { key: 'assembly', title: 'Montagem do pallet' },
  { key: 'awaiting', title: 'Aguardando transporte' },
  { key: 'delivery', title: 'Entrega na máquina' },
] as const;

/** Próximo prisma vinculado a retirada + abastecimento. */
export const NEXT_PALLET_FLOW_STEPS = [
  { key: 'supply', title: 'Aguardando abastecimento' },
  { key: 'prepare', title: 'Preparo do pallet no recebimento' },
  { key: 'awaiting', title: 'Aguardando transporte' },
  { key: 'deliver', title: 'Entrega na máquina' },
] as const;

/** Retirada + abastecimento: próximo prisma (4) e depois retirada (3). */
export const PICKUP_WITH_REPLENISHMENT_FLOW_STEPS = [
  { key: 'supply', title: 'Aguardando abastecimento' },
  { key: 'prepare', title: 'Preparo do pallet no recebimento' },
  { key: 'awaiting-deliver', title: 'Aguardando transporte' },
  { key: 'deliver', title: 'Entrega na máquina' },
  { key: 'awaiting-pickup', title: 'Aguardando retirada' },
  { key: 'removing', title: 'Retirada em curso' },
  { key: 'done', title: 'Entregue na expedição' },
] as const;

type ReplenishmentDeliveryStatuses = [
  FlowStepStatus,
  FlowStepStatus,
  FlowStepStatus,
  FlowStepStatus,
];

/** Abastecimento → preparo → aguardando transporte → entrega na máquina. */
function replenishmentDeliveryPhaseStatuses(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): ReplenishmentDeliveryStatuses {
  if (openSupply?.status === 'OPEN' && !delivery) {
    return ['active', 'pending', 'pending', 'pending'];
  }
  if (!delivery) return ['active', 'pending', 'pending', 'pending'];
  if (delivery.status === 'COMPLETED') return ['done', 'done', 'done', 'done'];
  if (delivery.status === 'ASSIGNED' || delivery.status === 'IN_PROGRESS') {
    return ['done', 'done', 'done', 'active'];
  }
  if (delivery.preparedAt && delivery.status === 'CREATED') {
    return ['done', 'done', 'active', 'pending'];
  }
  if (delivery.acceptedBySupply) return ['done', 'active', 'pending', 'pending'];
  return ['active', 'pending', 'pending', 'pending'];
}

function supplyOnlyPhaseStatuses(
  supply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): FlowStepStatus[] {
  if (!supply || supply.status !== 'OPEN') {
    if (!delivery) return ['pending', 'pending', 'pending', 'pending'];
    const [, prepare, awaiting, deliver] = replenishmentDeliveryPhaseStatuses(
      null,
      delivery,
    );
    return ['done', prepare, awaiting, deliver];
  }
  if (!delivery) return ['done', 'active', 'pending', 'pending'];
  const [, prepare, awaiting, deliver] = replenishmentDeliveryPhaseStatuses(
    supply,
    delivery,
  );
  return ['done', prepare, awaiting, deliver];
}

function nextPalletPhaseStatuses(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): ReplenishmentDeliveryStatuses {
  return replenishmentDeliveryPhaseStatuses(openSupply, delivery);
}

function isNextPalletDeliveredToMachine(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): boolean {
  if (delivery?.status === 'COMPLETED') return true;
  if (openSupply?.status === 'OPEN') return false;
  if (delivery) return false;
  return openSupply == null;
}

function pickupPhaseStatuses(
  pickup: PickupTaskListItem,
  nextPalletDelivered: boolean,
): [FlowStepStatus, FlowStepStatus, FlowStepStatus] {
  if (!nextPalletDelivered) return ['pending', 'pending', 'pending'];
  if (pickup.status === 'COMPLETED') return ['done', 'done', 'done'];
  if (pickup.status === 'ASSIGNED' || pickup.status === 'IN_PROGRESS') {
    return ['done', 'active', 'pending'];
  }
  return ['active', 'pending', 'pending'];
}

export function pickupWithReplenishmentFlowStepStatuses(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
  pickup: PickupTaskListItem,
): FlowStepStatus[] {
  const deliveryPhase = nextPalletPhaseStatuses(openSupply, delivery);
  const nextPalletDelivered = isNextPalletDeliveredToMachine(openSupply, delivery);
  const pickupPhase = pickupPhaseStatuses(pickup, nextPalletDelivered);
  return [...deliveryPhase, ...pickupPhase];
}

export function pickupWithReplenishmentFlowHeadline(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
  pickup: PickupTaskListItem,
): string {
  const statuses = pickupWithReplenishmentFlowStepStatuses(
    openSupply,
    delivery,
    pickup,
  );
  const activeIdx = statuses.findIndex((s) => s === 'active');
  if (activeIdx < 0) {
    if (statuses.every((s) => s === 'done')) {
      return 'Pallet entregue na expedição.';
    }
    return 'Acompanhe o fluxo de retirada com reposição do prisma.';
  }

  const messages = [
    'Aguardando o abastecimento montar o próximo pallet.',
    'O abastecimento registrou a entrega — pallet em preparo no recebimento.',
    'Pallet pronto — aguardando o transporte buscar no recebimento.',
    'O transporte está levando o próximo pallet até a máquina.',
    'Pallet na máquina — aguardando um empilhadeirista aceitar a retirada.',
    'O transporte aceitou — retirada em curso até a expedição.',
    'Pallet entregue na expedição.',
  ];
  return messages[activeIdx] ?? messages[0];
}

export function findReplenishmentDeliveryForPickup(
  deliveryTasks: DeliveryTaskListItem[],
  machineId: string,
  pickupCreatedAt: string,
): DeliveryTaskListItem | null {
  const open = findOpenReplenishmentDelivery(deliveryTasks, machineId);
  if (open) return open;

  const pickupTime = new Date(pickupCreatedAt).getTime();
  const completed = deliveryTasks
    .filter(
      (d) =>
        d.machineId === machineId &&
        d.status === 'COMPLETED' &&
        new Date(d.createdAt).getTime() >= pickupTime - 60_000,
    )
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.createdAt).getTime() -
        new Date(a.completedAt ?? a.createdAt).getTime(),
    );

  return completed[0] ?? null;
}

export function supplyOnlyFlowStepStatuses(
  supply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): FlowStepStatus[] {
  return supplyOnlyPhaseStatuses(supply, delivery);
}

export function supplyOnlyFlowHeadline(
  supply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): string {
  if (supply?.status === 'OPEN' && !delivery) {
    return 'Aguardando o abastecimento montar o próximo pallet.';
  }
  if (!delivery) {
    return 'Acompanhe o aviso ao abastecimento para a próxima entrega.';
  }
  if (delivery.status === 'COMPLETED') {
    return 'Próximo pallet entregue na máquina.';
  }
  if (delivery.status === 'ASSIGNED' || delivery.status === 'IN_PROGRESS') {
    return 'O transporte está levando o próximo pallet até a máquina.';
  }
  if (!delivery.preparedAt) {
    return 'O abastecimento registrou a entrega — pallet em preparo no recebimento.';
  }
  return 'Pallet pronto — aguardando o transporte buscar no recebimento.';
}

export function nextPalletFlowStepStatuses(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): FlowStepStatus[] {
  return [...replenishmentDeliveryPhaseStatuses(openSupply, delivery)];
}

export function nextPalletFlowHeadline(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): string {
  if (openSupply?.status === 'OPEN' && !delivery) {
    return 'Próximo prisma: aguardando o abastecimento montar o pallet.';
  }
  if (!delivery) {
    return 'Próximo prisma: aguardando registro do abastecimento.';
  }
  if (delivery.status === 'COMPLETED') {
    return 'Próximo prisma atendido — entrega na máquina concluída.';
  }
  if (delivery.status === 'ASSIGNED' || delivery.status === 'IN_PROGRESS') {
    return 'Próximo prisma a caminho — transporte indo à máquina.';
  }
  if (!delivery.preparedAt) {
    return 'Próximo prisma em preparo no recebimento.';
  }
  return 'Próximo prisma pronto — aguardando o transporte.';
}

export function findOpenSupplyForMachine(
  supplyRequests: OperatorMachineSupplyRequestListItem[],
  machineId: string,
): OperatorMachineSupplyRequestListItem | null {
  return (
    supplyRequests.find(
      (s) => s.status === 'OPEN' && s.machineId === machineId,
    ) ?? null
  );
}

export function findOpenReplenishmentDelivery(
  deliveryTasks: DeliveryTaskListItem[],
  machineId: string,
): DeliveryTaskListItem | null {
  const open = deliveryTasks.filter(
    (d) => d.machineId === machineId && OPEN_STATUSES.has(d.status),
  );
  if (!open.length) return null;
  return open.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}

export function hasOpenPickupWithReplenishment(
  pickupTasks: PickupTaskListItem[],
): boolean {
  return pickupTasks.some(
    (p) => p.triggersReplenishment && OPEN_STATUSES.has(p.status),
  );
}
