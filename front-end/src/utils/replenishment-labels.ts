import type {
  PriorityLevelValue,
  RequestStatusValue,
} from '@/types/replenishment-request.types';

const STATUS_LABELS: Record<RequestStatusValue, string> = {
  CREATED: 'Aguardando preparo',
  IN_PROGRESS: 'Em transporte',
  ON_MACHINE: 'Entregue na máquina',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
  AWAITING_PREPARATION: 'Aguardando abastecimento',
  PALLET_READY: 'Pronto — Aguardando retirada',
};

const PRIORITY_LABELS: Record<PriorityLevelValue, string> = {
  VERY_HIGH: 'Crítico',
  HIGH: 'Crítico',
  NORMAL: 'Normal',
};

export function requestStatusLabel(status: string): string {
  if (status in STATUS_LABELS) {
    return STATUS_LABELS[status as RequestStatusValue];
  }
  return status;
}

export function priorityLevelLabel(level: string): string {
  if (level in PRIORITY_LABELS) {
    return PRIORITY_LABELS[level as PriorityLevelValue];
  }
  return level;
}
