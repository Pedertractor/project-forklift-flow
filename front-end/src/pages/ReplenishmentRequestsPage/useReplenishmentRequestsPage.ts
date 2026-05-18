import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import {
  createReplenishmentRequest,
  deleteReplenishmentRequest,
  fetchReplenishmentRequests,
  updateReplenishmentRequest,
} from '@/services/machine-replenishment-requests-api';
import { fetchMachines } from '@/services/machines-api';
import { useAuthStore } from '@/store/auth.store';
import type { MachineListItem } from '@/types/machine.types';
import type { MovimentPalletEquipmentType } from '@/types/moviment-pallet.types';
import type {
  PriorityLevelValue,
  ReplenishmentRequestListItem,
} from '@/types/replenishment-request.types';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

function canDeleteRequest(row: ReplenishmentRequestListItem): boolean {
  const okStatus =
    row.status === 'CREATED' ||
    row.status === 'AWAITING_PREPARATION' ||
    row.status === 'PALLET_READY';
  return okStatus && row._count.movimentPalletTasks === 0;
}

function canEditRequest(row: ReplenishmentRequestListItem): boolean {
  return row.status !== 'COMPLETED' && row.status !== 'CANCELED';
}

export function useReplenishmentRequestsPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const machinesQuery = useQuery({
    queryKey: ['machines', user?.sectorId ?? ''],
    queryFn: () =>
      fetchMachines({
        sectorId: user?.sectorId ?? undefined,
      }),
    enabled: apiReady,
  });

  const machinesForSelect: MachineListItem[] = machinesQuery.data ?? [];

  const [statusFilter, setStatusFilter] = useState('');
  const [onlyMySector, setOnlyMySector] = useState(true);

  const listQuery = useQuery({
    queryKey: ['machine-replenishment-requests', statusFilter],
    queryFn: () =>
      fetchReplenishmentRequests({
        ...(statusFilter.trim() !== '' ? { status: statusFilter } : {}),
      }),
    enabled: apiReady,
  });

  const visibleRequests = useMemo(() => {
    const rows = listQuery.data ?? [];
    if (onlyMySector && user?.sectorId) {
      return rows.filter((r) => r.destination.sector.id === user.sectorId);
    }
    return rows;
  }, [listQuery.data, onlyMySector, user?.sectorId]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<ReplenishmentRequestListItem | null>(null);
  const [deleteRow, setDeleteRow] = useState<ReplenishmentRequestListItem | null>(null);
  const [detailRow, setDetailRow] = useState<ReplenishmentRequestListItem | null>(null);

  const [destinationId, setDestinationId] = useState('');
  const [movementCube, setMovementCube] = useState('');
  const [typeMovimentPallet, setTypeMovimentPallet] =
    useState<MovimentPalletEquipmentType>('FORKLIFT');
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevelValue>('NORMAL');
  const [palletReady, setPalletReady] = useState(false);

  const resetForm = useCallback(() => {
    setDestinationId('');
    setMovementCube('');
    setTypeMovimentPallet('FORKLIFT');
    setPriorityLevel('NORMAL');
    setPalletReady(false);
  }, []);

  const openCreate = () => {
    resetForm();
    if (machinesForSelect.length === 1) {
      setDestinationId(machinesForSelect[0].id);
    }
    setCreateOpen(true);
  };

  const openEdit = (row: ReplenishmentRequestListItem) => {
    setDestinationId(row.destinationId);
    setMovementCube(row.movementCube);
    setTypeMovimentPallet(row.typeMovimentPallet);
    setPriorityLevel(row.priorityLevel);
    setEditRow(row);
  };

  const createMut = useMutation({
    mutationFn: async () => {
      if (!destinationId.trim()) {
        throw new Error('Selecione a máquina de destino.');
      }
      const cube = movementCube.trim();
      if (!cube) {
        throw new Error('Informe o código do cubo / pallet.');
      }
      return createReplenishmentRequest({
        destinationId: destinationId.trim(),
        movementCube: cube,
        typeMovimentPallet: typeMovimentPallet,
        priorityLevel,
        ...(palletReady ? { palletReady: true } : {}),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machine-replenishment-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-preparation-requests'] });
      setCreateOpen(false);
      resetForm();
      toast.success('Solicitação criada.');
    },
    onError: toastApiError,
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editRow) {
        throw new Error('Sem registro.');
      }
      const cube = movementCube.trim();
      if (!cube) {
        throw new Error('Informe o código do cubo / pallet.');
      }
      if (!destinationId.trim()) {
        throw new Error('Selecione a máquina de destino.');
      }
      return updateReplenishmentRequest(editRow.id, {
        destinationId: destinationId.trim(),
        movementCube: cube,
        typeMovimentPallet: typeMovimentPallet,
        priorityLevel,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machine-replenishment-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-preparation-requests'] });
      setEditRow(null);
      resetForm();
      toast.success('Solicitação atualizada.');
    },
    onError: toastApiError,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteReplenishmentRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['machine-replenishment-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-preparation-requests'] });
      setDeleteRow(null);
      toast.success('Solicitação excluída.');
    },
    onError: toastApiError,
  });

  const busy =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const createError =
    createMut.error instanceof Error ? createMut.error.message : null;
  const updateError =
    updateMut.error instanceof Error ? updateMut.error.message : null;

  const machinesEmpty =
    apiReady && machinesQuery.isSuccess && machinesForSelect.length === 0;

  return {
    apiReady,
    token,
    user,
    statusFilter,
    setStatusFilter,
    onlyMySector,
    setOnlyMySector,
    listQuery,
    visibleRequests,
    machinesQuery,
    machinesForSelect,
    machinesEmpty,
    createOpen,
    setCreateOpen,
    editRow,
    setEditRow,
    deleteRow,
    setDeleteRow,
    detailRow,
    setDetailRow,
    destinationId,
    setDestinationId,
    movementCube,
    setMovementCube,
    typeMovimentPallet,
    setTypeMovimentPallet,
    priorityLevel,
    setPriorityLevel,
    palletReady,
    setPalletReady,
    openCreate,
    openEdit,
    createMut,
    updateMut,
    deleteMut,
    busy,
    createError,
    updateError,
    canDeleteRequest,
    canEditRequest,
  };
}

export type ReplenishmentRequestsPageViewModel = ReturnType<typeof useReplenishmentRequestsPage>;
