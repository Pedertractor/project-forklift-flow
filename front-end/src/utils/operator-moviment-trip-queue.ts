import type {
  TripCombinedSuggestionApi,
  TripStandaloneDeliverApi,
  TripStandalonePickupApi,
} from '@/types/operator-moviment-pallet.types';

export type MainTripQueueItem =
  | {
      displayKind: 'combined';
      critical: boolean;
      sortAt: number;
      combined: TripCombinedSuggestionApi;
    }
  | {
      displayKind: 'deliver';
      critical: boolean;
      sortAt: number;
      deliver: TripStandaloneDeliverApi;
    }
  | {
      displayKind: 'pickup';
      critical: boolean;
      sortAt: number;
      pickup: TripStandalonePickupApi;
    };

/** Ordena por criticidade e, em empate, pela tarefa mais antiga (menor `createdAt`). */
export function buildMainTripQueueItems(
  combined: TripCombinedSuggestionApi[],
  standaloneDelivers: TripStandaloneDeliverApi[],
  standalonePickups: TripStandalonePickupApi[],
): MainTripQueueItem[] {
  const items: MainTripQueueItem[] = [
    ...combined.map((row) => ({
      displayKind: 'combined' as const,
      critical: row.effectivePriority === 'VERY_HIGH',
      sortAt: Math.min(
        new Date(row.deliverTask.createdAt).getTime(),
        new Date(row.pickupTask.createdAt).getTime(),
      ),
      combined: row,
    })),
    ...standaloneDelivers.map((row) => ({
      displayKind: 'deliver' as const,
      critical: row.effectivePriority === 'VERY_HIGH',
      sortAt: row.deliverTask
        ? new Date(row.deliverTask.createdAt).getTime()
        : 0,
      deliver: row,
    })),
    ...standalonePickups.map((row) => ({
      displayKind: 'pickup' as const,
      critical: row.effectivePriority === 'VERY_HIGH',
      sortAt: new Date(row.pickupTask.createdAt).getTime(),
      pickup: row,
    })),
  ];

  return items.sort((a, b) => {
    if (a.critical !== b.critical) {
      return a.critical ? -1 : 1;
    }
    return a.sortAt - b.sortAt;
  });
}

export function pickTopMainTripQueueItem(
  items: MainTripQueueItem[],
): MainTripQueueItem | null {
  return items[0] ?? null;
}
