import type {
  PriorityLevelApi,
  TypeMovimentPalletApi,
} from '@/types/operator-moviment-pallet.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';

/** `VERY_HIGH` / `HIGH` legados = crítico; demais = normal. */
export function isCriticalPriority(level: PriorityLevelApi): boolean {
  return level === 'VERY_HIGH' || level === 'HIGH';
}

export function criticalLabel(isCritical: boolean): string {
  return isCritical ? 'Crítico' : 'Normal';
}

export function priorityLabel(level: PriorityLevelApi): string {
  return criticalLabel(isCriticalPriority(level));
}

export function movimentTypeLabel(type: TypeMovimentPalletApi): string {
  return type === 'FORKLIFT' ? 'Empilhadeira' : 'Transpaleteira';
}

export function replenishmentMovimentTypeLabel(
  type: ReplenishmentMovimentType,
): string {
  if (type === 'ANY') {
    return 'Empilhadeira ou transpaleteira';
  }
  return 'Empilhadeira';
}

/** Caminho em `public/` para uso em `<img src={…} />`. */
export function movimentTypePublicIconPath(
  type: TypeMovimentPalletApi,
): string {
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
