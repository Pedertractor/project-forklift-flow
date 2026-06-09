import type { IsOperatingMode } from '@/types/operator-moviment-pallet.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import { hasAdminPrivileges } from '@/types/role.types';

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
  if (role === 'PALLET_TRANSPORTER' || hasAdminPrivileges(role)) {
    return ['FORKLIFT', 'ANY'];
  }
  return [];
}
