import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import {
  createReplenishmentRequest,
  deleteReplenishmentRequest,
  fetchPendingPreparationRequests,
  fetchReplenishmentRequests,
  updateReplenishmentRequest,
} from '@/services/machine-replenishment-requests-api';
import { fetchMachines } from '@/services/machines-api';
import { fetchMovimentPallets } from '@/services/moviment-pallets-api';
import { useAuthStore } from '@/store/auth.store';
import { buildEquipmentColumnStats } from './replenishment-equipment-status';
import type { MachineListItem } from '@/types/machine.types';
import type { ReplenishmentMovimentType } from '@/types/replenishment-moviment.types';
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
    row.status === 'CREATED' || row.status === 'PALLET_READY';
  return okStatus && row._count.movimentPalletTasks === 0;
}

function canEditRequest(row: ReplenishmentRequestListItem): boolean {
  return row.status !== 'COMPLETED' && row.status !== 'CANCELED';
}

const QUEUE_STATUSES_FOR_TRANSPORT = new Set([
  'PALLET_READY',
  'IN_PROGRESS',
  'CREATED',
]);

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

  const hasSector = Boolean(user?.sectorId);

  const pendingPreparationQuery = useQuery({
    queryKey: ['pending-preparation-requests'],
    queryFn: fetchPendingPreparationRequests,
    enabled: apiReady && hasSector,
  });

  const pendingPreparationCount = useMemo(() => {
    const data = pendingPreparationQuery.data;
    if (!data) {
      return 0;
    }
    return data.operatorSupplyRequests.length;
  }, [pendingPreparationQuery.data]);

  const visibleRequests = useMemo(() => {
    const rows = listQuery.data ?? [];
    if (onlyMySector && user?.sectorId) {
      return rows.filter((r) => r.destination.sector.id === user.sectorId);
    }
    return rows;
  }, [listQuery.data, onlyMySector, user?.sectorId]);

  const equipmentSectorId =
    onlyMySector && user?.sectorId ? user.sectorId : undefined;

  const equipmentQuery = useQuery({
    queryKey: [
      'moviment-pallets',
      'replenishment-sidebar',
      equipmentSectorId ?? 'all',
    ],
    queryFn: () =>
      fetchMovimentPallets({
        ...(equipmentSectorId ? { sectorId: equipmentSectorId } : {}),
        includeTaskAvailability: true,
      }),
    enabled: apiReady,
    refetchInterval: 15_000,
  });

  const sectorEquipment = equipmentQuery.data ?? [];

  const forklifts = useMemo(
    () => sectorEquipment.filter((p) => p.type === 'FORKLIFT'),
    [sectorEquipment],
  );

  const palletTrucks = useMemo(
    () => sectorEquipment.filter((p) => p.type === 'PALLET_TRUCK'),
    [sectorEquipment],
  );

  const queueByType = useMemo(() => {
    let forklift = 0;
    let palletTruck = 0;
    for (const row of visibleRequests) {
      if (!QUEUE_STATUSES_FOR_TRANSPORT.has(row.status)) continue;
      if (
        row.typeMovimentPallet === 'FORKLIFT' ||
        row.typeMovimentPallet === 'ANY'
      ) {
        forklift += 1;
      }
      if (row.typeMovimentPallet === 'ANY') {
        palletTruck += 1;
      }
    }
    return { forklift, palletTruck };
  }, [visibleRequests]);

  const forkliftStats = useMemo(
    () => buildEquipmentColumnStats(forklifts, queueByType.forklift),
    [forklifts, queueByType.forklift],
  );

  const palletTruckStats = useMemo(
    () => buildEquipmentColumnStats(palletTrucks, queueByType.palletTruck),
    [palletTrucks, queueByType.palletTruck],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<ReplenishmentRequestListItem | null>(
    null,
  );
  const [deleteRow, setDeleteRow] =
    useState<ReplenishmentRequestListItem | null>(null);
  const [detailRow, setDetailRow] =
    useState<ReplenishmentRequestListItem | null>(null);

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
        throw new Error('Informe o código do prisma / pallet.');
      }
      return createReplenishmentRequest({
        destinationId: destinationId.trim(),
        movementCube: cube,
        typeMovimentPallet: typeMovimentPallet,
        priorityLevel,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['machine-replenishment-requests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['pending-preparation-requests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['operator-machine', 'operator-supply-requests'],
      });
      void queryClient.invalidateQueries({ queryKey: ['moviment-pallets'] });
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
        throw new Error('Informe o código do prisma / pallet.');
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
      void queryClient.invalidateQueries({
        queryKey: ['machine-replenishment-requests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['pending-preparation-requests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['operator-machine', 'operator-supply-requests'],
      });
      setEditRow(null);
      resetForm();
      toast.success('Solicitação atualizada.');
    },
    onError: toastApiError,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteReplenishmentRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['machine-replenishment-requests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['pending-preparation-requests'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['operator-machine', 'operator-supply-requests'],
      });
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
    pendingPreparationCount,
    visibleRequests,
    forklifts,
    palletTrucks,
    forkliftStats,
    palletTruckStats,
    equipmentQuery,
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

export type ReplenishmentRequestsPageViewModel = ReturnType<
  typeof useReplenishmentRequestsPage
>;
