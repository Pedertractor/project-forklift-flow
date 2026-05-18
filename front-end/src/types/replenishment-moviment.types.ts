import type { MovimentPalletEquipmentType } from '@/types/moviment-pallet.types';

/** Tipo de movimentação em solicitações de reposição (inclui «qualquer equipamento»). */
export type ReplenishmentMovimentType = MovimentPalletEquipmentType | 'ANY';
