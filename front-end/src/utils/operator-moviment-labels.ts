import type {
  ForkliftTaskStatusApi,
  ForkliftTaskTypeApi,
} from '@/types/operator-moviment-pallet.types';

export function taskTypeLabelPt(type: ForkliftTaskTypeApi): string {
  return type === 'DELIVER_TO_MACHINE'
    ? 'Entrega à máquina'
    : 'Retirada para expedição';
}

export function taskStatusLabelPt(status: ForkliftTaskStatusApi): string {
  switch (status) {
    case 'CREATED':
      return 'Criada';
    case 'ASSIGNED':
      return 'Atribuída';
    case 'IN_PROGRESS':
      return 'Em andamento';
    case 'COMPLETED':
      return 'Concluída';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
}
