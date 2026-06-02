import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOperationalDashboardSnapshot } from '@/services/operational-dashboard-api';
import { fetchMachines } from '@/services/machines-api';

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDashboardDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

export interface DashboardPageViewModel {
  data: Awaited<ReturnType<typeof getOperationalDashboardSnapshot>> | undefined;
  isLoading: boolean;
  isFetching: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedMachineId: string;
  setSelectedMachineId: (machineId: string) => void;
  machines: Awaited<ReturnType<typeof fetchMachines>>;
  isMachinesLoading: boolean;
  formattedDate: string;
}

export function useDashboardPage(): DashboardPageViewModel {
  const [selectedDate, setSelectedDate] = useState(todayIsoDate);
  const [selectedMachineId, setSelectedMachineId] = useState('');

  const { data: machines = [], isLoading: isMachinesLoading } = useQuery({
    queryKey: ['machines', 'dashboard-filter'],
    queryFn: () => fetchMachines(),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'operational-dashboard-snapshot',
      selectedDate,
      selectedMachineId,
    ],
    queryFn: () =>
      getOperationalDashboardSnapshot({
        date: selectedDate,
        machineId: selectedMachineId || undefined,
      }),
    refetchInterval: 30_000,
  });

  const formattedDate = data
    ? formatDashboardDate(data.date)
    : formatDashboardDate(selectedDate);

  return {
    data,
    isLoading,
    isFetching,
    selectedDate,
    setSelectedDate,
    selectedMachineId,
    setSelectedMachineId,
    machines,
    isMachinesLoading,
    formattedDate,
  };
}
