import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  dashboardIncludesToday,
  formatDashboardPeriodLabel,
  resolveDashboardQueryDates,
  todayDashboardDates,
} from './dashboard-date-utils';
import { useDashboardSectorFilter } from './useDashboardSectorFilter';
import { getOperationalDashboardSnapshot } from '@/services/operational-dashboard-api';
import { fetchMachines } from '@/services/machines-api';
import type { SectorListItem } from '@/types/machine.types';

export interface DashboardGeneralPageViewModel {
  data: Awaited<ReturnType<typeof getOperationalDashboardSnapshot>> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  dates: Date[];
  setDates: Dispatch<SetStateAction<Date[]>>;
  selectedMachineId: string;
  setSelectedMachineId: (machineId: string) => void;
  selectedSectorId: string;
  setSelectedSectorId: (sectorId: string) => void;
  canFilterBySector: boolean;
  sectors: SectorListItem[];
  isSectorsLoading: boolean;
  sectorScopeLabel: string | null;
  leaderMissingSector: boolean;
  machines: Awaited<ReturnType<typeof fetchMachines>>;
  isMachinesLoading: boolean;
  formattedDate: string;
}

export function useDashboardGeneralPage(): DashboardGeneralPageViewModel {
  const [dates, setDates] = useState<Date[]>(todayDashboardDates);
  const [selectedMachineId, setSelectedMachineId] = useState('');
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

  const { startDate, endDate } = useMemo(
    () => resolveDashboardQueryDates(dates),
    [dates],
  );

  useEffect(() => {
    setSelectedMachineId('');
  }, [sectorIdForQuery]);

  const { data: machines = [], isLoading: isMachinesLoading } = useQuery({
    queryKey: ['machines', 'dashboard-filter', sectorIdForQuery ?? 'all'],
    queryFn: () =>
      fetchMachines({
        sectorId: sectorIdForQuery,
      }),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'operational-dashboard-snapshot',
      startDate,
      endDate,
      sectorIdForQuery ?? '',
      selectedMachineId,
    ],
    queryFn: () =>
      getOperationalDashboardSnapshot({
        startDate,
        endDate,
        sectorId: sectorIdForQuery,
        machineId: selectedMachineId || undefined,
      }),
    enabled: !leaderMissingSector,
    refetchInterval: dashboardIncludesToday(dates) ? 30_000 : false,
  });

  const formattedDate = data
    ? formatDashboardPeriodLabel(data.date, data.end_date)
    : formatDashboardPeriodLabel(
        startDate,
        startDate === endDate ? null : endDate,
      );

  return {
    data,
    isLoading,
    isFetching,
    dates,
    setDates,
    selectedMachineId,
    setSelectedMachineId,
    selectedSectorId,
    setSelectedSectorId,
    canFilterBySector,
    sectors,
    isSectorsLoading,
    sectorScopeLabel,
    leaderMissingSector,
    machines,
    isMachinesLoading,
    formattedDate,
  };
}
