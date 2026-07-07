import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import { fetchMachines, updateMachine } from '@/services/machines-api';
import { SUPPLY_MACHINE_STATUS_QUERY_KEY } from '@/lib/operator-moviment-ws-invalidation';
import { useAuthStore } from '@/store/auth.store';
import type { MachineListItem, MachineProductionStatus } from '@/types/machine.types';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useSupplyMachineStatusPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSector = Boolean(user?.sectorId);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    machineId: string;
    productionStatus: MachineProductionStatus;
  } | null>(null);

  const machinesQuery = useQuery({
    queryKey: [...SUPPLY_MACHINE_STATUS_QUERY_KEY, user?.sectorId ?? ''],
    queryFn: () =>
      fetchMachines({
        sectorId: user?.sectorId ?? undefined,
      }),
    enabled: apiReady && hasSector,
  });

  const machines = useMemo(
    () => machinesQuery.data ?? [],
    [machinesQuery.data],
  );
  const machinesEmpty =
    apiReady && machinesQuery.isSuccess && machines.length === 0;

  const statusMut = useMutation({
    mutationFn: async ({
      machineId,
      productionStatus,
    }: {
      machineId: string;
      productionStatus: MachineProductionStatus;
    }) => updateMachine(machineId, { productionStatus }),
    onMutate: ({ machineId, productionStatus }) => {
      setPendingStatusUpdate({ machineId, productionStatus });
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({
        queryKey: SUPPLY_MACHINE_STATUS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: ['machines'],
      });
      const label =
        updated.productionStatus === 'ABASTECER'
          ? 'ABASTECER'
          : 'TRABALHANDO';
      toast.success(`${updated.name}: status atualizado para ${label}.`);
    },
    onError: (error) => {
      toastApiError(error, 'Não foi possível atualizar o status da máquina.');
    },
    onSettled: () => {
      setPendingStatusUpdate(null);
    },
  });

  const setMachineStatus = useCallback(
    (machine: MachineListItem, productionStatus: MachineProductionStatus) => {
      if (machine.productionStatus === productionStatus) {
        return;
      }
      statusMut.mutate({ machineId: machine.id, productionStatus });
    },
    [statusMut],
  );

  const busy = statusMut.isPending;

  return {
    apiReady,
    token,
    hasSector,
    machinesQuery,
    machines,
    machinesEmpty,
    pendingStatusUpdate,
    setMachineStatus,
    busy,
  };
}

export type SupplyMachineStatusPageViewModel = ReturnType<
  typeof useSupplyMachineStatusPage
>;
