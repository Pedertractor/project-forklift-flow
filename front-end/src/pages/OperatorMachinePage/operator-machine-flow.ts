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

const TERMINAL_PICKUP_STATUSES = new Set<MachineTaskStatusValue>([
  'COMPLETED',
  'CANCELED',
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
  { key: 'on-the-way', title: 'A caminho...' },
  { key: 'delivering', title: 'Entrega na máquina' },
] as const;

export type PickupFlowPhase = 'AWAITING' | 'IN_PROGRESS' | 'DONE' | 'IDLE';
export type DeliveryFlowPhase =
  | 'SUPPLY'
  | 'AWAITING'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'IDLE';

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

/** Entrega aceita pelo abastecimento, pallet pronto no recebimento, aguardando transporte. */
export function hasPalletAtReceiving(
  deliveryTasks: DeliveryTaskListItem[],
): boolean {
  return deliveryTasks.some(
    (t) => t.status === 'CREATED' && t.acceptedBySupply && t.preparedAt != null,
  );
}

/**
 * Existe um pallet a caminho da máquina: qualquer entrega em aberto
 * (registrada, em preparo, aguardando transporte ou em rota).
 */
export function hasIncomingDelivery(
  deliveryTasks: DeliveryTaskListItem[],
): boolean {
  return deliveryTasks.some((t) => OPEN_STATUSES.has(t.status));
}

/** Pallet pronto no recebimento para a mesma máquina da retirada (sugestão entrega + retirada). */
export function hasPalletAtReceivingForMachine(
  deliveryTasks: DeliveryTaskListItem[],
  machineId: string,
): boolean {
  return deliveryTasks.some(
    (t) =>
      t.machineId === machineId &&
      t.status === 'CREATED' &&
      t.acceptedBySupply &&
      t.preparedAt != null,
  );
}

/** Retirada em CREATED pode ser cancelada pelo operador da máquina. */
export function canCancelPickupRequest(
  pickup: PickupTaskListItem,
  deliveryTasks: DeliveryTaskListItem[],
): boolean {
  if (pickup.status !== 'CREATED') return false;
  if (hasPalletAtReceivingForMachine(deliveryTasks, pickup.machineId)) {
    return false;
  }
  return true;
}

export const PALLET_AT_RECEIVING_SUPPLY_BLOCKED_MESSAGE =
  'Há pallet destinado a esta máquina. Nova solicitação de abastecimento só após a entrega.';

export const PICKUP_WITH_REPLENISHMENT_BLOCKED_MESSAGE =
  'Já há um pallet a caminho desta máquina. Conclua a entrega antes de pedir retirada com novo abastecimento.';

export function canRequestPickup(
  _deliveryTasks: DeliveryTaskListItem[],
  _pickupTasks: PickupTaskListItem[],
): boolean {
  return true;
}

/**
 * Retirada amarrada a abastecimento. Bloqueada só com pallet/entrega a caminho
 * (evita segundo continuum). Com aviso OPEN, ainda pode pedir retirada amarrada
 * sem criar novo aviso.
 */
export function canRequestPickupWithReplenishment(
  _openSupply: OperatorMachineSupplyRequestListItem | null,
  deliveryTasks: DeliveryTaskListItem[],
): boolean {
  if (hasIncomingDelivery(deliveryTasks)) return false;
  return true;
}

export function pickupBlockedReason(
  _deliveryTasks: DeliveryTaskListItem[],
  _pickupTasks: PickupTaskListItem[],
): string | null {
  return null;
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
  const pending4: FlowStepStatus[] = [
    'pending',
    'pending',
    'pending',
    'pending',
  ];
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

export function pickupFlowHeadline(
  phase: PickupFlowPhase,
  task?: PickupTaskListItem | null,
): string {
  const status = task?.status;
  if (status === 'CREATED' || phase === 'AWAITING') {
    return 'Aguardando o transporte aceitar a retirada.';
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
  // Qualquer entrega em aberto (recebimento / preparo / em rota) bloqueia
  // novo abastecimento até COMPLETED na máquina.
  if (hasIncomingDelivery(deliveryTasks)) return false;
  return !hasOpenOperatorSupply(openSupply);
}

export function canOpenServiceRequestDialog(
  canPickup: boolean,
  openSupply: OperatorMachineSupplyRequestListItem | null,
  deliveryTasks: DeliveryTaskListItem[] = [],
): boolean {
  if (hasIncomingDelivery(deliveryTasks)) {
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
  { key: 'on-the-way', title: 'A caminho...' },
  { key: 'delivery', title: 'Entrega na máquina' },
] as const;

/** Próximo prisma vinculado a retirada + abastecimento. */
export const NEXT_PALLET_FLOW_STEPS = [
  { key: 'supply', title: 'Aguardando abastecimento' },
  { key: 'prepare', title: 'Preparo do pallet no recebimento' },
  { key: 'awaiting', title: 'Aguardando transporte' },
  { key: 'on-the-way', title: 'A caminho...' },
  { key: 'deliver', title: 'Entrega na máquina' },
] as const;

/** Retirada + abastecimento: próximo prisma e depois retirada. */
export const PICKUP_WITH_REPLENISHMENT_FLOW_STEPS = [
  { key: 'supply', title: 'Aguardando abastecimento' },
  { key: 'prepare', title: 'Preparo do pallet no recebimento' },
  { key: 'awaiting-deliver', title: 'Aguardando transporte' },
  { key: 'on-the-way', title: 'A caminho...' },
  { key: 'deliver', title: 'Entrega na máquina' },
  { key: 'awaiting-pickup', title: 'Aguardando retirada' },
  { key: 'removing', title: 'Retirada em curso' },
  { key: 'done', title: 'Entregue na expedição' },
] as const;

/** Mesmas chaves de `PICKUP_WITH_REPLENISHMENT_FLOW_STEPS`, títulos curtos (monitor TV). */
export const PICKUP_WITH_REPLENISHMENT_FLOW_STEPS_TV = [
  { key: 'supply', title: 'Abastecimento' },
  { key: 'prepare', title: 'Preparo' },
  { key: 'awaiting-deliver', title: 'Aguardando' },
  { key: 'on-the-way', title: 'A caminho' },
  { key: 'deliver', title: 'Entrega' },
  { key: 'awaiting-pickup', title: 'Aguard. retirada' },
  { key: 'removing', title: 'Retirada' },
  { key: 'done', title: 'Expedição' },
] as const;

type ReplenishmentDeliveryStatuses = [
  FlowStepStatus,
  FlowStepStatus,
  FlowStepStatus,
  FlowStepStatus,
  FlowStepStatus,
];

/** Abastecimento → preparo → aguardando → a caminho → entrega na máquina. */
function replenishmentDeliveryPhaseStatuses(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): ReplenishmentDeliveryStatuses {
  if (openSupply?.status === 'OPEN' && !delivery) {
    return ['active', 'pending', 'pending', 'pending', 'pending'];
  }
  if (!delivery) return ['active', 'pending', 'pending', 'pending', 'pending'];
  if (delivery.status === 'COMPLETED') {
    return ['done', 'done', 'done', 'done', 'done'];
  }
  if (delivery.status === 'ASSIGNED' || delivery.status === 'IN_PROGRESS') {
    return ['done', 'done', 'done', 'active', 'pending'];
  }
  if (delivery.preparedAt && delivery.status === 'CREATED') {
    return ['done', 'done', 'active', 'pending', 'pending'];
  }
  if (delivery.acceptedBySupply) {
    return ['done', 'active', 'pending', 'pending', 'pending'];
  }
  return ['active', 'pending', 'pending', 'pending', 'pending'];
}

function supplyOnlyPhaseStatuses(
  supply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
): FlowStepStatus[] {
  if (!supply || supply.status !== 'OPEN') {
    if (!delivery) {
      return ['pending', 'pending', 'pending', 'pending', 'pending'];
    }
    const [, prepare, awaiting, onTheWay, deliver] =
      replenishmentDeliveryPhaseStatuses(null, delivery);
    return ['done', prepare, awaiting, onTheWay, deliver];
  }
  if (!delivery) {
    return ['done', 'active', 'pending', 'pending', 'pending'];
  }
  const [, prepare, awaiting, onTheWay, deliver] =
    replenishmentDeliveryPhaseStatuses(supply, delivery);
  return ['done', prepare, awaiting, onTheWay, deliver];
}

/**
 * Etapa atualmente ativa (1-based) do fluxo único de retirada + abastecimento.
 *
 * O fluxo é SEQUENCIAL: primeiro a entrega do próximo pallet (etapas 1–5) e só
 * depois a retirada do pallet atual (etapas 6–8). A fase de retirada só avança
 * quando a entrega estiver CONCLUÍDA.
 *
 * 1 Aguardando abastecimento · 2 Preparo · 3 Aguardando transporte ·
 * 4 A caminho... · 5 Entrega na máquina · 6 Aguardando retirada ·
 * 7 Retirada em curso · 8 Expedição
 */
export function replenishmentPickupActiveStep(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
  pickup: PickupTaskListItem,
): number {
  /** Lista aberta pode omitir a entrega; nested no aviso cobre status persistido. */
  const nested = openSupply?.deliveryTask;
  const effectiveStatus = delivery?.status ?? nested?.status ?? null;
  const effectivePreparedAt =
    delivery?.preparedAt ?? nested?.preparedAt ?? null;

  const deliveryComplete = effectiveStatus === 'COMPLETED';

  if (!deliveryComplete) {
    if (!effectiveStatus) {
      // Sem DeliveryTask: aviso OPEN (ou ainda não materializado) → etapa 1.
      // Nunca pular para 6 só porque a retirada já existe amarrada ao aviso.
      if (!openSupply || openSupply.status === 'OPEN') {
        return 1;
      }
      // Aviso FULFILLED sem payload da entrega ainda → preparo.
      return 2;
    }
    if (effectiveStatus === 'ASSIGNED' || effectiveStatus === 'IN_PROGRESS') {
      return 4;
    }
    if (effectivePreparedAt && effectiveStatus === 'CREATED') return 3;
    return 2;
  }

  if (pickup.status === 'COMPLETED') return 9;
  if (pickup.status === 'ASSIGNED' || pickup.status === 'IN_PROGRESS') return 7;
  return 6;
}

export function pickupWithReplenishmentFlowStepStatuses(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  delivery: DeliveryTaskListItem | null,
  pickup: PickupTaskListItem,
): FlowStepStatus[] {
  const active = replenishmentPickupActiveStep(openSupply, delivery, pickup);
  return PICKUP_WITH_REPLENISHMENT_FLOW_STEPS.map((_, index) => {
    const step = index + 1;
    if (step < active) return 'done';
    if (step === active) return 'active';
    return 'pending';
  });
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
    'O transporte está a caminho da máquina com o próximo pallet.',
    'Pallet entregue na máquina.',
    'Pallet na máquina — aguardando o transporte aceitar a retirada.',
    'O transporte aceitou — retirada em curso até a expedição.',
    'Pallet entregue na expedição.',
  ];
  return messages[activeIdx] ?? messages[0];
}

/**
 * Aviso de abastecimento explicitamente amarrado a esta retirada
 * (`pickup.linkedSupplyRequestId`). Sem heurística por máquina/data — é a
 * mesma FK gravada no banco pelo `pickup-supply-link.service.ts` no back-end.
 * `null` = retirada avulsa, sem nenhum vínculo.
 */
export function findSupplyForPickup(
  pickup: PickupTaskListItem,
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): OperatorMachineSupplyRequestListItem | null {
  if (!pickup.linkedSupplyRequestId) return null;
  return (
    supplyRequests.find((s) => s.id === pickup.linkedSupplyRequestId) ?? null
  );
}

/**
 * Entrega do próximo prisma vinculada à retirada + abastecimento desta
 * retirada específica, via `supply.deliveryTaskId` (FK gravada quando o
 * abastecedor cria a entrega). Identifica a entrega correta em qualquer
 * status — inclusive COMPLETED.
 */
export function findDeliveryForPickup(
  pickup: PickupTaskListItem,
  supplyRequests: OperatorMachineSupplyRequestListItem[],
  deliveryTasks: DeliveryTaskListItem[],
): DeliveryTaskListItem | null {
  const supply = findSupplyForPickup(pickup, supplyRequests);
  if (!supply?.deliveryTaskId) return null;
  return deliveryTasks.find((d) => d.id === supply.deliveryTaskId) ?? null;
}

/**
 * Aviso de abastecimento que originou esta entrega (`supply.deliveryTaskId`
 * apontando para ela) — usado para decidir se a entrega já aparece dentro de
 * um card "Entrega + Retirada" ou de "Aviso ao abastecimento", e não deve
 * virar card avulso de "Entrega à máquina".
 */
export function findSupplyForDeliveryTask(
  delivery: DeliveryTaskListItem,
  supplyRequests: OperatorMachineSupplyRequestListItem[],
): OperatorMachineSupplyRequestListItem | null {
  return (
    supplyRequests.find((s) => s.deliveryTaskId === delivery.id) ?? null
  );
}

/**
 * Retirada ativa (não concluída/cancelada) amarrada a este aviso de
 * abastecimento via `linkedSupplyRequestId`. Existindo, o aviso (e a entrega
 * ligada a ele) deixam de virar card avulso — passam a ser exibidos dentro do
 * único card "Entrega + Retirada" desta retirada.
 */
export function findActiveLinkedPickupForSupply(
  supply: OperatorMachineSupplyRequestListItem,
  pickupTasks: PickupTaskListItem[],
): PickupTaskListItem | null {
  return (
    pickupTasks.find(
      (p) =>
        p.linkedSupplyRequestId === supply.id &&
        !TERMINAL_PICKUP_STATUSES.has(p.status),
    ) ?? null
  );
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

/**
 * Entrega vinculada ao aviso de abastecimento (somente abastecimento).
 * Preferência pelo `deliveryTaskId` após o abastecedor cumprir o aviso.
 */
export function findDeliveryForSupplyRequest(
  deliveryTasks: DeliveryTaskListItem[],
  supply: OperatorMachineSupplyRequestListItem,
): DeliveryTaskListItem | null {
  if (supply.deliveryTaskId) {
    return (
      deliveryTasks.find((d) => d.id === supply.deliveryTaskId) ?? null
    );
  }
  if (supply.status === 'OPEN') {
    return findOpenReplenishmentDelivery(deliveryTasks, supply.machineId);
  }
  return null;
}

/** Existe retirada aberta explicitamente amarrada a um aviso de abastecimento. */
export function hasOpenPickupWithReplenishment(
  pickupTasks: PickupTaskListItem[],
): boolean {
  return pickupTasks.some(
    (p) => p.linkedSupplyRequestId != null && OPEN_STATUSES.has(p.status),
  );
}

/**
 * Retirada vinculada ao fluxo de reposição (entrega + retirada).
 *
 * Único critério: `linkedSupplyRequestId` explícito, gravado no banco pelo
 * `pickup-supply-link.service.ts` no momento da solicitação. Sem heurística
 * por máquina/data — cada retirada carrega seu próprio vínculo (ou nenhum),
 * então nunca há ambiguidade entre retiradas irmãs da mesma máquina.
 */
export function isPickupLinkedToReplenishmentFlow(
  pickup: PickupTaskListItem,
): boolean {
  return pickup.linkedSupplyRequestId != null;
}

export function hasPickupLinkedToReplenishmentFlow(
  pickupTasks: PickupTaskListItem[],
): boolean {
  return pickupTasks.some((pickup) => isPickupLinkedToReplenishmentFlow(pickup));
}
