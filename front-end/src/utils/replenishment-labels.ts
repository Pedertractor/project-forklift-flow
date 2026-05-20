import type {
  PriorityLevelValue,
  RequestStatusValue,
} from '@/types/replenishment-request.types';

const STATUS_LABELS: Record<RequestStatusValue, string> = {
  CREATED: 'Criado',
  IN_PROGRESS: 'Em andamento',
  ON_MACHINE: 'Na máquina',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
  AWAITING_PREPARATION: 'Pallet no recebimento',
  PALLET_READY: 'Pallet no recebimento',
};

const PRIORITY_LABELS: Record<PriorityLevelValue, string> = {
  VERY_HIGH: 'Muito alta',
  HIGH: 'Alta',
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
