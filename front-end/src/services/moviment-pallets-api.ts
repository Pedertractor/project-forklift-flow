import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';
import { apiAuthFetch } from '@/lib/api';
import type { MovimentPalletEquipmentType, MovimentPalletListItem } from '@/types/moviment-pallet.types';

export async function fetchMovimentPallets(filters?: {
  sectorId?: string;
  type?: MovimentPalletEquipmentType;
  /** Inclui contagem de tarefas em aberto por equipamento (painel do abastecedor). */
  includeTaskAvailability?: boolean;
}): Promise<MovimentPalletListItem[]> {
  if (filters?.includeTaskAvailability) {
    const params = new URLSearchParams();
    if (filters.sectorId !== undefined && filters.sectorId.trim() !== '') {
      params.set('sectorId', filters.sectorId.trim());
    }
    const q = params.toString();
    const path = q
      ? `${API_ENDPOINTS.DELIVERY_TASKS.SECTOR_TRANSPORT_OPERATORS}?${q}`
      : API_ENDPOINTS.DELIVERY_TASKS.SECTOR_TRANSPORT_OPERATORS;
    const res = await apiAuthFetch<{ movimentPallets: MovimentPalletListItem[] }>(
      path,
      { method: 'GET' },
    );
    return res?.movimentPallets ?? [];
  }

  const params = new URLSearchParams();
  if (filters?.sectorId !== undefined && filters.sectorId.trim() !== '') {
    params.set('sectorId', filters.sectorId.trim());
  }
  if (filters?.type !== undefined) {
    params.set('type', filters.type);
  }
  const q = params.toString();
  const path = q ? `${API_ENDPOINTS.MOVIMENT_PALLETS.LIST}?${q}` : API_ENDPOINTS.MOVIMENT_PALLETS.LIST;
  const res = await apiAuthFetch<{ movimentPallets: MovimentPalletListItem[] }>(path, {
    method: 'GET',
  });
  return res?.movimentPallets ?? [];
}

export async function createMovimentPallet(input: {
  code: string;
  type: MovimentPalletEquipmentType;
  sectorId?: string | null;
}): Promise<MovimentPalletListItem> {
  const body: { code: string; type: MovimentPalletEquipmentType; sectorId?: string | null } = {
    code: input.code.trim(),
    type: input.type,
  };
  if (input.sectorId !== undefined) {
    body.sectorId = input.sectorId === '' ? null : input.sectorId;
  }
  const res = await apiAuthFetch<MovimentPalletListItem>(API_ENDPOINTS.MOVIMENT_PALLETS.LIST, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function updateMovimentPallet(
  id: string,
  patch: {
    code?: string;
    type?: MovimentPalletEquipmentType;
    sectorId?: string | null;
  },
): Promise<MovimentPalletListItem> {
  const res = await apiAuthFetch<MovimentPalletListItem>(API_ENDPOINTS.MOVIMENT_PALLETS.BY_ID(id), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res) {
    throw new Error('Resposta vazia.');
  }
  return res;
}

export async function deleteMovimentPallet(id: string): Promise<void> {
  await apiAuthFetch(API_ENDPOINTS.MOVIMENT_PALLETS.BY_ID(id), { method: 'DELETE' });
}
