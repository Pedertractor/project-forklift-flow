import { useQuery } from '@tanstack/react-query';

import { useDashboardSectorFilter } from './useDashboardSectorFilter';
import { getOperationalTvMonitorSnapshot } from '@/services/operational-dashboard-api';
import type { SectorListItem } from '@/types/machine.types';

const TV_LIVE_REFETCH_MS = 12_000;
export const TV_MONITOR_QUERY_KEY = 'operational-dashboard-tv-monitor' as const;

export interface DashboardTvMonitorPageViewModel {
  data: Awaited<ReturnType<typeof getOperationalTvMonitorSnapshot>> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  selectedSectorId: string;
  setSelectedSectorId: (sectorId: string) => void;
  canFilterBySector: boolean;
  sectors: SectorListItem[];
  isSectorsLoading: boolean;
  sectorScopeLabel: string | null;
  leaderMissingSector: boolean;
  lastUpdatedLabel: string | null;
}

export function useDashboardTvMonitorPage(): DashboardTvMonitorPageViewModel {
  const {
    canFilterBySector,
    selectedSectorId,
    setSelectedSectorId,
    sectorIdForQuery,
    sectors,
    isSectorsLoading,
    sectorScopeLabel,
    leaderMissingSector,
  } = useDashboardSectorFilter();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [TV_MONITOR_QUERY_KEY, sectorIdForQuery ?? 'all'],
    queryFn: () =>
      getOperationalTvMonitorSnapshot({
        sectorId: sectorIdForQuery,
      }),
    refetchInterval: TV_LIVE_REFETCH_MS,
    refetchIntervalInBackground: true,
    enabled: !leaderMissingSector,
  });

  const lastUpdatedLabel = data?.now
    ? new Date(data.now).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return {
    data,
    isLoading,
    isFetching,
    selectedSectorId,
    setSelectedSectorId,
    canFilterBySector,
    sectors,
    isSectorsLoading,
    sectorScopeLabel,
    leaderMissingSector,
    lastUpdatedLabel,
  };
}
