import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
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

type StatusQueueItem = {
  machineId: string;
  productionStatus: MachineProductionStatus;
  snapshotStatus: MachineProductionStatus;
  machineName: string;
};

export function useSupplyMachineStatusPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSector = Boolean(user?.sectorId);
  const queueRef = useRef<StatusQueueItem[]>([]);
  const processingRef = useRef(false);

  const machinesQueryKey = useMemo(
    () => [...SUPPLY_MACHINE_STATUS_QUERY_KEY, user?.sectorId ?? ''] as const,
    [user?.sectorId],
  );

  const machinesQuery = useQuery({
    queryKey: machinesQueryKey,
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

  const patchMachineInCache = useCallback(
    (machineId: string, productionStatus: MachineProductionStatus) => {
      queryClient.setQueryData<MachineListItem[]>(machinesQueryKey, (prev) => {
        if (!prev) {
          return prev;
        }
        return prev.map((machine) =>
          machine.id === machineId
            ? { ...machine, productionStatus }
            : machine,
        );
      });
    },
    [queryClient, machinesQueryKey],
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) {
      return;
    }
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift();
      if (!item) {
        break;
      }

      try {
        const updated = await updateMachine(item.machineId, {
          productionStatus: item.productionStatus,
        });
        const label =
          updated.productionStatus === 'ABASTECER'
            ? 'ABASTECER'
            : 'TRABALHANDO';
        toast.success(`${updated.name}: status atualizado para ${label}.`);
      } catch (error) {
        patchMachineInCache(item.machineId, item.snapshotStatus);
        queueRef.current = queueRef.current.filter(
          (queued) => queued.machineId !== item.machineId,
        );
        toastApiError(
          error instanceof Error
            ? error
            : new Error('Não foi possível atualizar o status da máquina.'),
        );
      }
    }

    processingRef.current = false;

    if (queueRef.current.length > 0) {
      void processQueue();
      return;
    }

    void queryClient.invalidateQueries({
      queryKey: SUPPLY_MACHINE_STATUS_QUERY_KEY,
    });
    void queryClient.invalidateQueries({
      queryKey: ['machines'],
    });
  }, [patchMachineInCache, queryClient]);

  const setMachineStatus = useCallback(
    (machine: MachineListItem, productionStatus: MachineProductionStatus) => {
      const currentStatus =
        queryClient
          .getQueryData<MachineListItem[]>(machinesQueryKey)
          ?.find((item) => item.id === machine.id)?.productionStatus ??
        machine.productionStatus;

      if (currentStatus === productionStatus) {
        return;
      }

      const existingItem = queueRef.current.find(
        (queued) => queued.machineId === machine.id,
      );
      const snapshotStatus = existingItem?.snapshotStatus ?? currentStatus;

      queueRef.current = queueRef.current.filter(
        (queued) => queued.machineId !== machine.id,
      );
      queueRef.current.push({
        machineId: machine.id,
        productionStatus,
        snapshotStatus,
        machineName: machine.name,
      });

      patchMachineInCache(machine.id, productionStatus);
      void processQueue();
    },
    [machinesQueryKey, patchMachineInCache, processQueue, queryClient],
  );

  return {
    apiReady,
    token,
    hasSector,
    machinesQuery,
    machines,
    machinesEmpty,
    setMachineStatus,
  };
}

export type SupplyMachineStatusPageViewModel = ReturnType<
  typeof useSupplyMachineStatusPage
>;
