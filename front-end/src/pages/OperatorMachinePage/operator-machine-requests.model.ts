import type { UseQueryResult } from '@tanstack/react-query';
import type { MachineListItem } from '@/types/machine.types';
import type {
  OperatorMachineSupplyRequestListItem,
} from '@/types/operator-machine.types';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';

export const OPERATOR_MACHINE_REQUEST_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ON_MACHINE', label: 'Na máquina (retirada)' },
  { value: 'CREATED', label: 'Criado' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'AWAITING_PREPARATION', label: 'Aguardando preparo' },
  { value: 'PALLET_READY', label: 'Pallet pronto (fila)' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELED', label: 'Cancelado' },
] as const;

export const OPERATOR_MACHINE_REQUEST_FILTER_SELECT_CLASS =
  'flex h-[var(--control-height,2.5rem)] w-full max-w-xs rounded-xl border-2 border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors focus-visible:border-[#005fb8] focus-visible:ring-[3px] focus-visible:ring-[#005fb8]/25';

export function operatorMachineMovimentTypeLabel(type: string): string {
  return type === 'FORKLIFT' ? 'Empilhadeira' : 'Transpaleteira';
}

/** Exibe link «Ver andamento» da retirada / entrega. */
export function operatorRequestShowsPickupProgress(status: string): boolean {
  return (
    status === 'IN_PROGRESS' || status === 'ON_MACHINE' || status === 'COMPLETED'
  );
}

export function operatorSupplyRequestStatusLabel(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'Aguardando pedido no sistema';
    case 'FULFILLED':
      return 'Atendida (pedido de cubo criado)';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
}

export function formatOperatorSupplyCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export interface OperatorMachineRequestsSectionProps {
  machineBound: MachineListItem | null;
  operatorSupplyQuery: UseQueryResult<OperatorMachineSupplyRequestListItem[], Error>;
  requestsQuery: UseQueryResult<ReplenishmentRequestListItem[], Error>;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  blockingFinalizeRequest: ReplenishmentRequestListItem | null;
  blockingOperatorSupply: OperatorMachineSupplyRequestListItem | null;
  canRequestPallet: boolean;
  finalizePending: boolean;
  busy: boolean;
  apiReady: boolean;
  onSolicitarPallet: () => void;
  onOpenPickupModal: (requestId: string) => void;
  pickupMutationPending: boolean;
}
