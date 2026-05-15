import type { PriorityLevelApi, TypeMovimentPalletApi } from '@/types/operator-moviment-pallet.types';

export function priorityLabel(level: PriorityLevelApi): string {
  switch (level) {
    case 'VERY_HIGH':
      return 'Muito alta';
    case 'HIGH':
      return 'Alta';
    default:
      return 'Normal';
  }
}

export function movimentTypeLabel(type: TypeMovimentPalletApi): string {
  return type === 'FORKLIFT' ? 'Empilhadeira' : 'Transpaleteira';
}

/** Caminho em `public/` para uso em `<img src={…} />`. */
export function movimentTypePublicIconPath(type: TypeMovimentPalletApi): string {
  return type === 'FORKLIFT' ? '/FORKLIFT.png' : '/PALLET_TRUCK.png';
}

export function formatTaskDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}
