import type { TypeMovimentPalletApi } from '@/types/operator-moviment-pallet.types';

/** Tipos de `MovimentPallet` permitidos ao papel (espelho do back-end). */
export function movimentTypesForRole(role: string | undefined): TypeMovimentPalletApi[] {
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
