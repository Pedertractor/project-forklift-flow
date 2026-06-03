import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  dashboardIncludesToday,
  formatDashboardPeriodLabel,
  resolveDashboardQueryDates,
  todayDashboardDates,
} from './dashboard-date-utils';
import { useDashboardSectorFilter } from './useDashboardSectorFilter';
import { getOperationalDashboardByOperator } from '@/services/operational-dashboard-api';
import { fetchMachines } from '@/services/machines-api';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import type { SectorListItem } from '@/types/machine.types';

export interface DashboardByOperatorPageViewModel {
  data:
    | Awaited<ReturnType<typeof getOperationalDashboardByOperator>>
    | undefined;
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
  typeMovimentPallet: ReplenishmentMovimentType | '';
  setTypeMovimentPallet: (value: ReplenishmentMovimentType | '') => void;
  machines: Awaited<ReturnType<typeof fetchMachines>>;
  isMachinesLoading: boolean;
  formattedDate: string;
}

export function useDashboardByOperatorPage(): DashboardByOperatorPageViewModel {
  const [dates, setDates] = useState<Date[]>(todayDashboardDates);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [typeMovimentPallet, setTypeMovimentPallet] = useState<
    ReplenishmentMovimentType | ''
  >('');
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
      'operational-dashboard-by-operator',
      startDate,
      endDate,
      sectorIdForQuery ?? '',
      selectedMachineId,
      typeMovimentPallet,
    ],
    queryFn: () =>
      getOperationalDashboardByOperator({
        startDate,
        endDate,
        sectorId: sectorIdForQuery,
        machineId: selectedMachineId || undefined,
        typeMovimentPallet: typeMovimentPallet || undefined,
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
    typeMovimentPallet,
    setTypeMovimentPallet,
    machines,
    isMachinesLoading,
    formattedDate,
  };
}
