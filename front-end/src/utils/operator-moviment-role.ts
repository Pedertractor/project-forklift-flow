import type { MovimentPalletEquipmentType } from '@/types/moviment-pallet.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';

/** Tipos de equipamento (`MovimentPallet`) permitidos ao papel (espelho do back-end). */
export function movimentTypesForRole(
  role: string | undefined,
): MovimentPalletEquipmentType[] {
  switch (role) {
    case 'FORKLIFT_OPERATOR':
      return ['FORKLIFT'];
    case 'FOLLOW_UP_OPERATOR':
      return ['PALLET_TRUCK'];
    case 'ADMIN':
      return ['FORKLIFT', 'PALLET_TRUCK'];
    default:
      return [];
  }
}

/** Tipos de solicitação (`typeMovimentPallet` no pedido) que disparam WS/fila para o papel. */
export function replenishmentMovimentTypesForRole(
  role: string | undefined,
): ReplenishmentMovimentType[] {
  switch (role) {
    case 'FORKLIFT_OPERATOR':
      return ['FORKLIFT', 'ANY'];
    case 'FOLLOW_UP_OPERATOR':
      return ['ANY'];
    case 'ADMIN':
      return ['FORKLIFT', 'ANY'];
    default:
      return [];
  }
}
