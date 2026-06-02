import type { IsOperatingMode } from '@/types/operator-moviment-pallet.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';

/** Tipos de solicitação na fila conforme o modo de operação escolhido. */
export function replenishmentMovimentTypesForOperatingMode(
  mode: IsOperatingMode | null | undefined,
): ReplenishmentMovimentType[] {
  if (!mode) return [];
  if (mode === 'FORKLIFT') return ['FORKLIFT', 'ANY'];
  return ['ANY'];
}

/** @deprecated Use replenishmentMovimentTypesForOperatingMode */
export function replenishmentMovimentTypesForRole(
  role: string | undefined,
): ReplenishmentMovimentType[] {
  if (role === 'PALLET_TRANSPORTER' || role === 'ADMIN') {
    return ['FORKLIFT', 'ANY'];
  }
  return [];
}
