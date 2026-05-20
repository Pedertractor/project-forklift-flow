import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import {
  createReplenishmentRequest,
  fetchPendingPreparationRequests,
} from '@/services/machine-replenishment-requests-api';
import { fetchMachines } from '@/services/machines-api';
import { useAuthStore } from '@/store/auth.store';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
import type { PriorityLevelValue } from '@/types/replenishment-request.types';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useSupplyPendingPreparationPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const hasSector = Boolean(user?.sectorId);

  const pendingQuery = useQuery({
    queryKey: ['pending-preparation-requests'],
    queryFn: fetchPendingPreparationRequests,
    enabled: apiReady && hasSector,
  });

  const machinesQuery = useQuery({
    queryKey: ['machines', user?.sectorId ?? ''],
    queryFn: () =>
      fetchMachines({
        sectorId: user?.sectorId ?? undefined,
      }),
    enabled: apiReady,
  });

  const machinesForSelect = machinesQuery.data ?? [];
  const machinesEmpty =
    apiReady && machinesQuery.isSuccess && machinesForSelect.length === 0;

  const operatorSupplyRows =
    pendingQuery.data?.operatorSupplyRequests ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState(1);
  const [destinationId, setDestinationId] = useState('');
  const [movementCube, setMovementCube] = useState('');
  const [typeMovimentPallet, setTypeMovimentPallet] =
    useState<ReplenishmentMovimentType>('FORKLIFT');
  const [priorityLevel, setPriorityLevel] =
    useState<PriorityLevelValue>('NORMAL');

  const resetForm = useCallback(() => {
    setDestinationId('');
    setMovementCube('');
    setTypeMovimentPallet('FORKLIFT');
    setPriorityLevel('NORMAL');
    setWizardInitialStep(1);
  }, []);

  const openCreateFromOperatorSupply = (
    row: OperatorMachineSupplyRequestListItem,
  ) => {
    resetForm();
    setDestinationId(row.machineId);
    setWizardInitialStep(2);
    setCreateOpen(true);
  };

  const createMut = useMutation({
    mutationFn: async () => {
      if (!destinationId.trim()) {
        throw new Error('Selecione a máquina de destino.');
      }
      const cube = movementCube.trim();
      if (!cube) {
        throw new Error('Informe o código do prisma / pallet.');
      }
      return createReplenishmentRequest({
        destinationId: destinationId.trim(),
        movementCube: cube,
        typeMovimentPallet,
        priorityLevel,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['pending-preparation-requests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['machine-replenishment-requests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['operator-machine', 'operator-supply-requests'],
      });
      void queryClient.invalidateQueries({ queryKey: ['moviment-pallets'] });
      setCreateOpen(false);
      resetForm();
      toast.success('Solicitação de retirada criada.');
    },
    onError: toastApiError,
  });

  const busy = createMut.isPending;
  const createError =
    createMut.error instanceof Error ? createMut.error.message : null;

  return {
    apiReady,
    token,
    user,
    hasSector,
    pendingQuery,
    operatorSupplyRows,
    machinesForSelect,
    machinesEmpty,
    createOpen,
    setCreateOpen,
    wizardInitialStep,
    destinationId,
    setDestinationId,
    movementCube,
    setMovementCube,
    typeMovimentPallet,
    setTypeMovimentPallet,
    priorityLevel,
    setPriorityLevel,
    openCreateFromOperatorSupply,
    createMut,
    busy,
    createError,
  };
}

export type SupplyPendingPreparationPageViewModel = ReturnType<
  typeof useSupplyPendingPreparationPage
>;
