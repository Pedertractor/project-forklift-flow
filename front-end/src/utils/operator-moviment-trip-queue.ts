import type {
  TripCombinedSuggestionApi,
  TripStandaloneDeliverApi,
  TripStandalonePickupApi,
} from '@/types/operator-moviment-pallet.types';

export type LastCompletedTripTaskKind = 'DELIVER' | 'PICKUP';

export type MainTripQueueItem =
  | {
      displayKind: 'combined';
      preferredMachine: boolean;
      critical: boolean;
      kindRank: number;
      sortAt: number;
      combined: TripCombinedSuggestionApi;
    }
  | {
      displayKind: 'deliver';
      preferredMachine: boolean;
      critical: boolean;
      kindRank: number;
      sortAt: number;
      deliver: TripStandaloneDeliverApi;
    }
  | {
      displayKind: 'pickup';
      preferredMachine: boolean;
      critical: boolean;
      kindRank: number;
      sortAt: number;
      pickup: TripStandalonePickupApi;
    };

/**
 * Após retirada → entrega+retirada ou entrega.
 * Após entrega (abastecimento) → entrega+retirada ou retirada.
 * Sem histórico → combina primeiro; depois age decide.
 */
export function tripQueueKindAffinityRank(
  kind: MainTripQueueItem['displayKind'],
  lastCompleted: LastCompletedTripTaskKind | null | undefined,
): number {
  if (lastCompleted === 'PICKUP') {
    if (kind === 'combined') return 0;
    if (kind === 'deliver') return 1;
    return 2;
  }
  if (lastCompleted === 'DELIVER') {
    if (kind === 'combined') return 0;
    if (kind === 'pickup') return 1;
    return 2;
  }
  if (kind === 'combined') return 0;
  return 1;
}

/**
 * Ordena a fila principal:
 * 1. Máquinas vinculadas ao operador (cortam a fila)
 * 2. Criticidade
 * 3. Afinidade com a última tarefa concluída
 * 4. Mais antiga
 */
export function buildMainTripQueueItems(
  combined: TripCombinedSuggestionApi[],
  standaloneDelivers: TripStandaloneDeliverApi[],
  standalonePickups: TripStandalonePickupApi[],
  lastCompleted: LastCompletedTripTaskKind | null | undefined = null,
): MainTripQueueItem[] {
  const items: MainTripQueueItem[] = [
    ...combined.map((row) => ({
      displayKind: 'combined' as const,
      preferredMachine: Boolean(row.preferredMachine),
      critical: row.effectivePriority === 'VERY_HIGH',
      kindRank: tripQueueKindAffinityRank('combined', lastCompleted),
      sortAt: Math.min(
        new Date(row.deliverTask.createdAt).getTime(),
        new Date(row.pickupTask.createdAt).getTime(),
      ),
      combined: row,
    })),
    ...standaloneDelivers.map((row) => ({
      displayKind: 'deliver' as const,
      preferredMachine: Boolean(row.preferredMachine),
      critical: row.effectivePriority === 'VERY_HIGH',
      kindRank: tripQueueKindAffinityRank('deliver', lastCompleted),
      sortAt: row.deliverTask
        ? new Date(row.deliverTask.createdAt).getTime()
        : 0,
      deliver: row,
    })),
    ...standalonePickups.map((row) => ({
      displayKind: 'pickup' as const,
      preferredMachine: Boolean(row.preferredMachine),
      critical: row.effectivePriority === 'VERY_HIGH',
      kindRank: tripQueueKindAffinityRank('pickup', lastCompleted),
      sortAt: new Date(row.pickupTask.createdAt).getTime(),
      pickup: row,
    })),
  ];

  return items.sort((a, b) => {
    if (a.preferredMachine !== b.preferredMachine) {
      return a.preferredMachine ? -1 : 1;
    }
    if (a.critical !== b.critical) {
      return a.critical ? -1 : 1;
    }
    if (a.kindRank !== b.kindRank) {
      return a.kindRank - b.kindRank;
    }
    return a.sortAt - b.sortAt;
  });
}

export function pickTopMainTripQueueItem(
  items: MainTripQueueItem[],
): MainTripQueueItem | null {
  return items[0] ?? null;
}

/** Chave estável da sugestão exibida (detectar troca / nova atividade). */
export function mainTripQueueItemAlertKey(item: MainTripQueueItem): string {
  if (item.displayKind === 'combined') {
    return `trip:${item.combined.tripSuggestion.id}`;
  }
  if (item.displayKind === 'deliver') {
    const id =
      item.deliver.deliverTask?.id ?? item.deliver.requestId;
    return `deliver:${id}`;
  }
  return `pickup:${item.pickup.pickupTask.id}`;
}
