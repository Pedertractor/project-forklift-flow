import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ENV } from '@/constants/env';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import {
  deleteOperatorUnbindMachine,
  fetchOperatorMachinesForPicker,
  fetchOperatorMyMachine,
  fetchOperatorReplenishmentRequests,
  fetchOperatorSupplyRequests,
  postOperatorBindMachine,
  postOperatorFinalizeCycle,
  postOperatorRequestPickup,
} from '@/services/operator-machine-api';
import { useAuthStore } from '@/store/auth.store';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';
import type { ReplenishmentRequestListItem } from '@/types/replenishment-request.types';

const FINALIZE_BLOCK_STATUSES = new Set<
  ReplenishmentRequestListItem['status']
>(['AWAITING_PREPARATION', 'IN_PROGRESS', 'ON_MACHINE']);

const queryKeyMyMachine = ['operator-machine', 'my-machine'] as const;
const queryKeyOperatorSupply = ['operator-machine', 'operator-supply-requests'] as const;

function queryKeyRequests(status: string) {
  return ['operator-machine', 'replenishment-requests', status] as const;
}

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useOperatorMachinePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasSector = Boolean(user?.sectorId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [pickupTargetId, setPickupTargetId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const myMachineQuery = useQuery({
    queryKey: queryKeyMyMachine,
    queryFn: fetchOperatorMyMachine,
    enabled: apiReady,
  });

  const machinesQuery = useQuery({
    queryKey: ['operator-machine', 'machines'],
    queryFn: fetchOperatorMachinesForPicker,
    enabled: apiReady && hasSector && pickerOpen,
  });

  const requestsQuery = useQuery({
    queryKey: queryKeyRequests(statusFilter),
    queryFn: () => fetchOperatorReplenishmentRequests(statusFilter || undefined),
    enabled: apiReady && Boolean(myMachineQuery.data),
  });

  const operatorSupplyQuery = useQuery({
    queryKey: queryKeyOperatorSupply,
    queryFn: () => fetchOperatorSupplyRequests(),
    enabled: apiReady && Boolean(myMachineQuery.data),
  });

  const finalizeGateQuery = useQuery({
    queryKey: ['operator-machine', 'replenishment-requests', 'finalize-gate'],
    queryFn: () => fetchOperatorReplenishmentRequests(),
    enabled: apiReady && Boolean(myMachineQuery.data),
  });

  const blockingFinalizeRequest = useMemo((): ReplenishmentRequestListItem | null => {
    const list = finalizeGateQuery.data ?? [];
    return list.find((r) => FINALIZE_BLOCK_STATUSES.has(r.status)) ?? null;
  }, [finalizeGateQuery.data]);

  const blockingOperatorSupply = useMemo((): OperatorMachineSupplyRequestListItem | null => {
    const list = operatorSupplyQuery.data ?? [];
    return list.find((r) => r.status === 'OPEN') ?? null;
  }, [operatorSupplyQuery.data]);

  const canRequestPallet =
    blockingFinalizeRequest === null && blockingOperatorSupply === null;

  const bindMut = useMutation({
    mutationFn: postOperatorBindMachine,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: ['operator-machine', 'replenishment-requests'] });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      setPickerOpen(false);
      toast.success('Máquina vinculada ao turno.');
    },
    onError: toastApiError,
  });

  const unbindMut = useMutation({
    mutationFn: deleteOperatorUnbindMachine,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: ['operator-machine', 'replenishment-requests'] });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      setEndShiftOpen(false);
      toast.success('Vínculo encerrado. Bom descanso.');
    },
    onError: toastApiError,
  });

  const finalizeMut = useMutation({
    mutationFn: () => postOperatorFinalizeCycle({}),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: ['operator-machine', 'replenishment-requests'] });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      toast.success(data.message);
    },
    onError: toastApiError,
  });

  const pickupMut = useMutation({
    mutationFn: postOperatorRequestPickup,
    onSuccess: (data, requestId) => {
      void queryClient.invalidateQueries({ queryKey: ['operator-machine', 'replenishment-requests'] });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      void queryClient.invalidateQueries({
        queryKey: ['operator-machine', 'pickup-progress', requestId],
      });
      setPickupTargetId(null);
      toast.success(
        `Retirada solicitada. Tarefa criada (${data.pickupTask.status}). O transporte verá na fila de tarefas.`,
      );
      navigate(`/dobra/retirada/${requestId}`, { replace: true });
    },
    onError: toastApiError,
  });

  const openPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const busy =
    bindMut.isPending ||
    unbindMut.isPending ||
    finalizeMut.isPending ||
    pickupMut.isPending;

  return {
    apiReady,
    token,
    user,
    hasSector,
    myMachineQuery,
    machinesQuery,
    requestsQuery,
    operatorSupplyQuery,
    finalizeGateQuery,
    blockingFinalizeRequest,
    blockingOperatorSupply,
    canRequestPallet,
    statusFilter,
    setStatusFilter,
    pickerOpen,
    setPickerOpen,
    openPicker,
    closePicker,
    bindMut,
    endShiftOpen,
    setEndShiftOpen,
    unbindMut,
    finalizeMut,
    pickupTargetId,
    setPickupTargetId,
    pickupMut,
    busy,
  };
}

export type OperatorMachinePageViewModel = ReturnType<typeof useOperatorMachinePage>;
