import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import {
  fetchPendingSupplyRequests,
  normalizeOperatorSupplyRequests,
  postCreateDeliveryTask,
  SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY,
} from '@/services/delivery-tasks-api';
import {
  createMachineTooling,
  deleteMachineTooling,
  fetchMachineToolings,
  fetchMachines,
  updateMachineTooling,
} from '@/services/machines-api';
import { useAuthStore } from '@/store/auth.store';
import { hasAdminPrivileges } from '@/types/role.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useSupplyPendingPreparationPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isAdmin = hasAdminPrivileges(user?.role);
  const hasSector = isAdmin || Boolean(user?.sectorId);

  const pendingQuery = useQuery({
    queryKey: SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY,
    queryFn: fetchPendingSupplyRequests,
    enabled: apiReady && hasSector,
  });

  const machinesScopeKey = isAdmin ? 'all' : (user?.sectorId ?? '');
  const machinesQuery = useQuery({
    queryKey: ['machines', machinesScopeKey],
    queryFn: () =>
      fetchMachines({
        ...(isAdmin ? {} : { sectorId: user?.sectorId ?? undefined }),
      }),
    enabled: apiReady,
  });

  const machinesForSelect = machinesQuery.data ?? [];
  const machinesEmpty =
    apiReady && machinesQuery.isSuccess && machinesForSelect.length === 0;

  const operatorSupplyRows = useMemo(
    () => normalizeOperatorSupplyRequests(pendingQuery.data),
    [pendingQuery.data],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState(1);
  const [destinationId, setDestinationId] = useState('');
  const [movementCube, setMovementCube] = useState('');
  const [typeMovimentPallet, setTypeMovimentPallet] =
    useState<ReplenishmentMovimentType>('FORKLIFT');
  const [isCritical, setIsCritical] = useState(false);
  const [operatorSupplyRequestId, setOperatorSupplyRequestId] = useState<
    string | undefined
  >(undefined);

  const toolingsQuery = useQuery({
    queryKey: ['machines', destinationId, 'toolings'],
    queryFn: () => fetchMachineToolings(destinationId),
    enabled: apiReady && createOpen && destinationId.trim() !== '',
  });

  const invalidateToolings = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['machines', destinationId, 'toolings'],
    });
    void queryClient.invalidateQueries({
      queryKey: SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY,
    });
  }, [destinationId, queryClient]);

  const createToolingMut = useMutation({
    mutationFn: (name: string) => createMachineTooling(destinationId, name),
    onSuccess: () => {
      invalidateToolings();
      toast.success('Ferramental cadastrado.');
    },
    onError: toastApiError,
  });

  const updateToolingMut = useMutation({
    mutationFn: ({ toolingId, name }: { toolingId: string; name: string }) =>
      updateMachineTooling(destinationId, toolingId, name),
    onSuccess: () => {
      invalidateToolings();
      toast.success('Ferramental atualizado.');
    },
    onError: toastApiError,
  });

  const deleteToolingMut = useMutation({
    mutationFn: (toolingId: string) =>
      deleteMachineTooling(destinationId, toolingId),
    onSuccess: () => {
      invalidateToolings();
      toast.success('Ferramental removido.');
    },
    onError: toastApiError,
  });

  const resetForm = useCallback(() => {
    setDestinationId('');
    setMovementCube('');
    setTypeMovimentPallet('FORKLIFT');
    setIsCritical(false);
    setOperatorSupplyRequestId(undefined);
    setWizardInitialStep(1);
  }, []);

  const openCreateFromOperatorSupply = (
    row: OperatorMachineSupplyRequestListItem,
  ) => {
    resetForm();
    setDestinationId(row.machineId);
    setOperatorSupplyRequestId(row.id);
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
      return postCreateDeliveryTask({
        machineId: destinationId.trim(),
        movementCube: cube,
        typeMovimentPallet,
        isCritical,
        markReady: true,
        operatorSupplyRequestId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: SUPPLY_PENDING_OPERATOR_REQUESTS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: ['replenishment', 'pending-preparation'],
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
      toast.success('Tarefa de entrega criada — pallet pronto para o transporte.');
    },
    onError: toastApiError,
  });

  const busy =
    createMut.isPending ||
    createToolingMut.isPending ||
    updateToolingMut.isPending ||
    deleteToolingMut.isPending;
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
    isCritical,
    setIsCritical,
    toolings: toolingsQuery.data ?? [],
    toolingsLoading: toolingsQuery.isLoading,
    createTooling: async (name: string) => {
      await createToolingMut.mutateAsync(name);
    },
    createToolingPending: createToolingMut.isPending,
    updateTooling: async (toolingId: string, name: string) => {
      await updateToolingMut.mutateAsync({ toolingId, name });
    },
    updateToolingPendingId: updateToolingMut.isPending
      ? (updateToolingMut.variables?.toolingId ?? null)
      : null,
    deleteTooling: async (toolingId: string) => {
      await deleteToolingMut.mutateAsync(toolingId);
    },
    deleteToolingPendingId: deleteToolingMut.isPending
      ? (deleteToolingMut.variables ?? null)
      : null,
    openCreateFromOperatorSupply,
    createMut,
    busy,
    createError,
  };
}

export type SupplyPendingPreparationPageViewModel = ReturnType<
  typeof useSupplyPendingPreparationPage
>;
