import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ENV } from '@/constants/env';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import {
  deleteOperatorUnbindMachine,
  fetchOperatorMachinesForPicker,
  fetchOperatorMyMachine,
  fetchOperatorReplenishmentRequests,
  postOperatorBindMachine,
  postOperatorFinalizeCycle,
  postOperatorRequestPickup,
} from '@/services/operator-machine-api';
import { useAuthStore } from '@/store/auth.store';

const queryKeyMyMachine = ['operator-machine', 'my-machine'] as const;
function queryKeyRequests(status: string) {
  return ['operator-machine', 'replenishment-requests', status] as const;
}

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useOperatorMachinePage() {
  const queryClient = useQueryClient();
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

  const bindMut = useMutation({
    mutationFn: postOperatorBindMachine,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: ['operator-machine', 'replenishment-requests'] });
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
      toast.success(data.message);
    },
    onError: toastApiError,
  });

  const pickupMut = useMutation({
    mutationFn: postOperatorRequestPickup,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['operator-machine', 'replenishment-requests'] });
      setPickupTargetId(null);
      toast.success(
        `Retirada solicitada. Tarefa criada (${data.pickupTask.status}). O transporte verá na fila de tarefas.`,
      );
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
