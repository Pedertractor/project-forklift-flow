import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import {
  deleteOperatorUnbindMachine,
  fetchOperatorMachinesForPicker,
  fetchOperatorMyMachine,
  fetchOperatorPickupProgress,
  fetchOperatorReplenishmentRequests,
  fetchOperatorSupplyRequests,
  postOperatorBindMachine,
  postOperatorFinalizeCycle,
  postOperatorRequestPickup,
} from '@/services/operator-machine-api';
import {
  selectPickupPanelReplenishment,
  selectSupplyFlowReplenishment,
  shouldFetchPickupProgress,
} from './operator-machine-flow';
import { useAuthStore } from '@/store/auth.store';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';

const FINALIZE_BLOCK_STATUSES = new Set<
  ReplenishmentRequestListItem['status']
>(['PALLET_READY', 'IN_PROGRESS', 'ON_MACHINE']);

const queryKeyMyMachine = ['operator-machine', 'my-machine'] as const;
const queryKeyOperatorSupply = ['operator-machine', 'operator-supply-requests'] as const;
const queryKeyRequests = ['operator-machine', 'replenishment-requests', 'active'] as const;

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useOperatorMachinePage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const user = useAuthStore((s) => s.user);
  const hasSector = Boolean(user?.sectorId);

  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [pickupTargetId, setPickupTargetId] = useState<string | null>(null);
  const [showMachinePicker, setShowMachinePicker] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState('');

  const myMachineQuery = useQuery({
    queryKey: queryKeyMyMachine,
    queryFn: fetchOperatorMyMachine,
    enabled: apiReady,
  });

  const current = myMachineQuery.data ?? null;

  const machinesQuery = useQuery({
    queryKey: ['operator-machine', 'machines'],
    queryFn: fetchOperatorMachinesForPicker,
    enabled: apiReady && hasSector && showMachinePicker,
  });

  useEffect(() => {
    if (myMachineQuery.isSuccess && current === null) {
      setShowMachinePicker(true);
    }
  }, [myMachineQuery.isSuccess, current]);

  useEffect(() => {
    if (current?.id) {
      setSelectedMachineId(current.id);
      setShowMachinePicker(false);
    }
  }, [current?.id]);

  const bindMut = useMutation({
    mutationFn: postOperatorBindMachine,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: queryKeyRequests });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      setShowMachinePicker(false);
      toast.success('Máquina vinculada ao turno.');
    },
    onError: toastApiError,
  });

  const selectMachine = (machineId: string) => {
    if (bindMut.isPending) {
      return;
    }
    setSelectedMachineId(machineId);
    if (current?.id === machineId) {
      setShowMachinePicker(false);
      return;
    }
    bindMut.mutate(machineId);
  };

  const requestsQuery = useQuery({
    queryKey: queryKeyRequests,
    queryFn: () => fetchOperatorReplenishmentRequests(),
    enabled: apiReady && Boolean(current),
    refetchInterval: 15_000,
  });

  const operatorSupplyQuery = useQuery({
    queryKey: queryKeyOperatorSupply,
    queryFn: () => fetchOperatorSupplyRequests(),
    enabled: apiReady && Boolean(current),
    refetchInterval: 15_000,
  });

  const replenishmentList = requestsQuery.data ?? [];

  const hasBlockingReplenishment = useMemo(
    () =>
      replenishmentList.some((r) => FINALIZE_BLOCK_STATUSES.has(r.status)),
    [replenishmentList],
  );

  const openOperatorSupply = useMemo((): OperatorMachineSupplyRequestListItem | null => {
    const list = operatorSupplyQuery.data ?? [];
    return list.find((r) => r.status === 'OPEN') ?? null;
  }, [operatorSupplyQuery.data]);

  const supplyFlowReplenishment = useMemo(
    () => selectSupplyFlowReplenishment(replenishmentList),
    [replenishmentList],
  );

  const pickupPanelReplenishment = useMemo(
    () => selectPickupPanelReplenishment(replenishmentList),
    [replenishmentList],
  );

  const pickupProgressQuery = useQuery({
    queryKey: [
      'operator-machine',
      'pickup-progress',
      pickupPanelReplenishment?.id ?? '',
    ] as const,
    queryFn: () => fetchOperatorPickupProgress(pickupPanelReplenishment!.id),
    enabled:
      apiReady &&
      Boolean(current) &&
      shouldFetchPickupProgress(pickupPanelReplenishment),
    refetchInterval: 10_000,
  });

  const canRequestPallet = !hasBlockingReplenishment && openOperatorSupply === null;

  const unbindMut = useMutation({
    mutationFn: deleteOperatorUnbindMachine,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: queryKeyRequests });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      setEndShiftOpen(false);
      setShowMachinePicker(true);
      toast.success('Vínculo encerrado. Bom descanso.');
    },
    onError: toastApiError,
  });

  const finalizeMut = useMutation({
    mutationFn: () => postOperatorFinalizeCycle({}),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: queryKeyRequests });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      toast.success(data.message);
    },
    onError: toastApiError,
  });

  const pickupMut = useMutation({
    mutationFn: postOperatorRequestPickup,
    onSuccess: (data, requestId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeyRequests });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      void queryClient.invalidateQueries({
        queryKey: ['operator-machine', 'pickup-progress', requestId],
      });
      setPickupTargetId(null);
      toast.success(
        `Retirada solicitada. Tarefa criada (${data.pickupTask.status}). Acompanhe o fluxo no painel de reposição.`,
      );
    },
    onError: toastApiError,
  });

  const pickupRow = pickupTargetId
    ? (requestsQuery.data ?? []).find((r) => r.id === pickupTargetId)
    : undefined;

  const busy =
    unbindMut.isPending ||
    finalizeMut.isPending ||
    pickupMut.isPending ||
    bindMut.isPending;

  return {
    apiReady,
    hasSector,
    myMachineQuery,
    current,
    showMachinePicker,
    setShowMachinePicker,
    machinesQuery,
    machines: machinesQuery.data ?? [],
    selectedMachineId,
    selectMachine,
    bindPending: bindMut.isPending,
    requestsQuery,
    operatorSupplyQuery,
    openOperatorSupply,
    supplyFlowReplenishment,
    pickupPanelReplenishment,
    pickupProgressQuery,
    pickupPhase: pickupProgressQuery.data?.phase ?? null,
    pickupTransportLabel:
      pickupProgressQuery.data?.transportLabel ?? 'transporte',
    canRequestPallet,
    endShiftOpen,
    setEndShiftOpen,
    unbindMut,
    finalizeMut,
    pickupTargetId,
    setPickupTargetId,
    pickupMut,
    pickupRow,
    busy,
  };
}

export type OperatorMachinePageViewModel = ReturnType<typeof useOperatorMachinePage>;
