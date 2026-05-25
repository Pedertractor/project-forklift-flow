import type { FlowStepStatus } from '@/components/activity/HorizontalActivityStepper';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { OperatorPickupProgressPhase } from '@/types/operator-machine.types';
import type {
  ReplenishmentRequestListItem,
  RequestStatusValue,
} from '@/types/replenishment-request.types';

/** Pedido ainda em abastecimento / transporte (antes de chegar na máquina). */
const INCOMING_SUPPLY_STATUSES = new Set<RequestStatusValue>([
  'CREATED',
  'AWAITING_PREPARATION',
  'PALLET_READY',
  'IN_PROGRESS',
]);

function pickNewestByStatusSince(
  requests: ReplenishmentRequestListItem[],
): ReplenishmentRequestListItem | null {
  if (requests.length === 0) {
    return null;
  }
  return [...requests].sort(
    (a, b) =>
      new Date(b.statusSince).getTime() - new Date(a.statusSince).getTime(),
  )[0]!;
}

/**
 * Fluxo do card de abastecimento: só o pedido “a caminho”.
 * Enquanto houver pallet na máquina (ON_MACHINE), não exibe o próximo do recebimento.
 */
export function selectSupplyFlowReplenishment(
  requests: ReplenishmentRequestListItem[],
): ReplenishmentRequestListItem | null {
  const hasPalletOnMachine = requests.some((r) => r.status === 'ON_MACHINE');
  if (hasPalletOnMachine) {
    return null;
  }
  const incoming = requests.filter((r) =>
    INCOMING_SUPPLY_STATUSES.has(r.status),
  );
  return pickNewestByStatusSince(incoming);
}

/**
 * Card de reposição / retirada: prioriza o pallet já na máquina (mais recente).
 * Não usa pedidos só em transporte (IN_PROGRESS) — isso fica no card de abastecimento.
 */
export function selectPickupPanelReplenishment(
  requests: ReplenishmentRequestListItem[],
): ReplenishmentRequestListItem | null {
  const onMachine = requests.filter((r) => r.status === 'ON_MACHINE');
  const awaitingPickup = onMachine.filter((r) => !r.hasOpenPickupTask);
  if (awaitingPickup.length > 0) {
    return pickNewestByStatusSince(awaitingPickup);
  }
  if (onMachine.length > 0) {
    return pickNewestByStatusSince(onMachine);
  }
  return null;
}

export const SUPPLY_FLOW_STEPS = [
  { key: 'supply', title: 'Aviso ao abastecimento' },
  { key: 'ready', title: 'Pallet no recebimento' },
  { key: 'deliver', title: 'Movimento em curso' },
  { key: 'on-machine', title: 'Entregue na máquina' },
] as const;

export const PICKUP_FLOW_STEPS = [
  { key: 'on-machine', title: 'Pallet na máquina' },
  { key: 'requested', title: 'Retirada solicitada' },
  { key: 'awaiting', title: 'Aguardando transporte' },
  { key: 'removing', title: 'Retirada em curso' },
  { key: 'done', title: 'Entregue na expedição' },
] as const;

export type SupplyFlowPhase =
  | 'IDLE'
  | 'SUPPLY_OPEN'
  | 'PALLET_READY'
  | 'DELIVERING'
  | 'ON_MACHINE'
  | 'COMPLETED';

const SUPPLY_PHASE_ORDER: SupplyFlowPhase[] = [
  'SUPPLY_OPEN',
  'PALLET_READY',
  'DELIVERING',
  'ON_MACHINE',
  'COMPLETED',
];

export function deriveSupplyFlowPhase(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  replenishment: ReplenishmentRequestListItem | null,
): SupplyFlowPhase {
  if (replenishment) {
    switch (replenishment.status) {
      case 'COMPLETED':
        return 'COMPLETED';
      case 'ON_MACHINE':
        return 'ON_MACHINE';
      case 'IN_PROGRESS':
        return 'DELIVERING';
      case 'PALLET_READY':
      case 'AWAITING_PREPARATION':
      case 'CREATED':
        return 'PALLET_READY';
      default:
        break;
    }
  }
  if (openSupply?.status === 'OPEN') {
    return 'SUPPLY_OPEN';
  }
  return 'IDLE';
}

export function supplyFlowStepStatuses(
  phase: SupplyFlowPhase,
): FlowStepStatus[] {
  if (phase === 'IDLE') {
    return ['pending', 'pending', 'pending', 'pending', 'pending'];
  }
  const idx = SUPPLY_PHASE_ORDER.indexOf(phase);
  if (idx < 0) {
    return ['pending', 'pending', 'pending', 'pending', 'pending'];
  }
  return SUPPLY_FLOW_STEPS.map((_, i) => {
    if (i < idx) {
      return 'done';
    }
    if (i === idx) {
      return 'active';
    }
    return 'pending';
  });
}

export function supplyFlowHeadline(phase: SupplyFlowPhase): string {
  switch (phase) {
    case 'SUPPLY_OPEN':
      return 'O abastecimento foi avisado e deve registrar o pedido de reposição.';
    case 'PALLET_READY':
      return 'O pallet está pronto no recebimento — aguardando o transporte aceitar.';
    case 'DELIVERING':
      return 'O operador de movimentação está levando o pallet até a máquina.';
    case 'ON_MACHINE':
      return 'O material chegou na máquina.';
    case 'COMPLETED':
      return 'Ciclo de entrega concluído para este pedido.';
    default:
      return 'Solicite pallet quando não houver prisma na dobra.';
  }
}

export function supplyFlowProgressPct(phase: SupplyFlowPhase): number {
  if (phase === 'IDLE') {
    return 0;
  }
  const idx = SUPPLY_PHASE_ORDER.indexOf(phase);
  if (idx < 0) {
    return 0;
  }
  return Math.round(((idx + 1) / SUPPLY_FLOW_STEPS.length) * 100);
}

export function shouldShowSupplyFlow(
  openSupply: OperatorMachineSupplyRequestListItem | null,
  replenishment: ReplenishmentRequestListItem | null,
): boolean {
  return deriveSupplyFlowPhase(openSupply, replenishment) !== 'IDLE';
}

export function hasReplenishmentIncomingForMachine(
  requests: ReplenishmentRequestListItem[],
): boolean {
  return requests.some((r) => INCOMING_SUPPLY_STATUSES.has(r.status));
}

export function hasPalletOnMachine(
  requests: ReplenishmentRequestListItem[],
): boolean {
  return requests.some((r) => r.status === 'ON_MACHINE');
}

/**
 * Card "Solicitação ao abastecimento": oculto com prisma na máquina ou retirada em curso.
 * Visível com fluxo de abastecimento/transporte a caminho, ou quando não há pedido no
 * recebimento nem material na máquina (estado para solicitar pallet).
 */
export function shouldShowSupplyPanel(
  requests: ReplenishmentRequestListItem[],
  openSupply: OperatorMachineSupplyRequestListItem | null,
  pickupPanelReplenishment: ReplenishmentRequestListItem | null,
  pickupPhase: OperatorPickupProgressPhase | null,
): boolean {
  if (hasPalletOnMachine(requests)) {
    return false;
  }
  if (shouldShowReplenishmentPanel(pickupPanelReplenishment, pickupPhase)) {
    return false;
  }
  const supplyFlowReplenishment = selectSupplyFlowReplenishment(requests);
  if (openSupply?.status === 'OPEN' || supplyFlowReplenishment) {
    return true;
  }
  return !hasReplenishmentIncomingForMachine(requests);
}

export function pickupFlowStepStatuses(
  phase: OperatorPickupProgressPhase,
): FlowStepStatus[] {
  switch (phase) {
    case 'DELIVERY_IN_PROGRESS':
      return ['active', 'pending', 'pending', 'pending', 'pending'];
    case 'AT_MACHINE_AWAITING_PICKUP':
      return ['done', 'active', 'pending', 'pending', 'pending'];
    case 'AWAITING_TRANSPORT_PICKUP':
      return ['done', 'done', 'active', 'pending', 'pending'];
    case 'TRANSPORT_ASSIGNED':
      return ['done', 'done', 'done', 'active', 'pending'];
    case 'TRANSPORT_REMOVING':
      return ['done', 'done', 'done', 'active', 'pending'];
    case 'PICKUP_FINISHED':
      return ['done', 'done', 'done', 'done', 'done'];
    default:
      return ['pending', 'pending', 'pending', 'pending', 'pending'];
  }
}

export function pickupFlowHeadline(
  phase: OperatorPickupProgressPhase,
  transportLabel: string,
): string {
  switch (phase) {
    case 'DELIVERY_IN_PROGRESS':
      return 'O pallet ainda está a caminho da máquina.';
    case 'AT_MACHINE_AWAITING_PICKUP':
      return 'O material está na máquina. Solicite a retirada quando estiver pronto.';
    case 'AWAITING_TRANSPORT_PICKUP':
      return 'Retirada registrada — aguardando o transporte aceitar a tarefa.';
    case 'TRANSPORT_ASSIGNED':
      return `Um ${transportLabel.toLowerCase()} aceitou a retirada e deve ir até a máquina.`;
    case 'TRANSPORT_REMOVING':
      return 'A retirada está em andamento até a expedição.';
    case 'PICKUP_FINISHED':
      return 'Retirada concluída — o prisma saiu da máquina.';
    default:
      return 'O andamento da retirada aparece aqui após solicitar.';
  }
}

export function pickupFlowProgressPct(
  phase: OperatorPickupProgressPhase,
): number {
  switch (phase) {
    case 'DELIVERY_IN_PROGRESS':
      return 15;
    case 'AT_MACHINE_AWAITING_PICKUP':
      return 28;
    case 'AWAITING_TRANSPORT_PICKUP':
      return 48;
    case 'TRANSPORT_ASSIGNED':
      return 68;
    case 'TRANSPORT_REMOVING':
      return 86;
    case 'PICKUP_FINISHED':
      return 100;
    default:
      return 0;
  }
}

export function shouldFetchPickupProgress(
  replenishment: ReplenishmentRequestListItem | null,
): boolean {
  if (!replenishment) {
    return false;
  }
  return replenishment.status === 'ON_MACHINE';
}

export function shouldShowPickupFlow(
  replenishment: ReplenishmentRequestListItem | null,
): boolean {
  return shouldFetchPickupProgress(replenishment);
}

/** Card "Pedido de reposição": só enquanto o prisma está na máquina e o fluxo não terminou. */
export function shouldShowReplenishmentPanel(
  replenishment: ReplenishmentRequestListItem | null,
  pickupPhase: OperatorPickupProgressPhase | null,
): boolean {
  if (!replenishment || replenishment.status !== 'ON_MACHINE') {
    return false;
  }
  return pickupPhase !== 'PICKUP_FINISHED';
}
