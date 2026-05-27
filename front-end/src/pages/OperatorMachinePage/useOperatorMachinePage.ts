import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import {
  deleteOperatorUnbindMachine,
  fetchOperatorMachineTasks,
  fetchOperatorMachinesForPicker,
  fetchOperatorMyMachine,
  fetchOperatorSupplyRequests,
  postOperatorBindMachine,
  postCancelOperatorPickup,
  postOperatorPickupOnly,
  postOperatorPickupWithReplenishment,
  postOperatorSupplyOnly,
} from '@/services/operator-machine-api';
import {
  canOpenServiceRequestDialog,
  canRequestSupply,
} from './operator-machine-flow';
import { useOperatorMovimentWork } from '@/components/layout/OperatorMovimentWorkProvider';
import {
  canRequestPickup,
  deliveryTaskDrivingMachineUi,
  deriveDeliveryFlowPhaseFromTask,
  derivePickupFlowPhaseFromTask,
  pickupBlockedReason,
  pickupTaskDrivingMachineUi,
  resolveOperationTimelineMode,
} from './operator-machine-flow';
import { useAuthStore } from '@/store/auth.store';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';

const queryKeyMyMachine = ['operator-machine', 'my-machine'] as const;
const queryKeyOperatorSupply = [
  'operator-machine',
  'operator-supply-requests',
] as const;
const queryKeyTasks = ['operator-machine', 'machine-tasks'] as const;

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

const MACHINE_POLL_MS_WS_DOWN = 8_000;

export function useOperatorMachinePage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const user = useAuthStore((s) => s.user);
  const hasSector = Boolean(user?.sectorId);
  const { wsConnected } = useOperatorMovimentWork();
  const machinePollInterval = wsConnected ? false : MACHINE_POLL_MS_WS_DOWN;

  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [cancelPickupId, setCancelPickupId] = useState<string | null>(null);
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
      void queryClient.invalidateQueries({ queryKey: queryKeyTasks });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      setShowMachinePicker(false);
      toast.success('Máquina vinculada com sucesso!');
    },
    onError: toastApiError,
  });

  const selectMachine = (machineId: string) => {
    if (bindMut.isPending) return;
    setSelectedMachineId(machineId);
    if (current?.id === machineId) {
      setShowMachinePicker(false);
      return;
    }
    bindMut.mutate(machineId);
  };

  const tasksQuery = useQuery({
    queryKey: queryKeyTasks,
    queryFn: fetchOperatorMachineTasks,
    enabled: apiReady && Boolean(current),
    refetchInterval: machinePollInterval,
  });

  const operatorSupplyQuery = useQuery({
    queryKey: queryKeyOperatorSupply,
    queryFn: () => fetchOperatorSupplyRequests(),
    enabled: apiReady && Boolean(current),
    refetchInterval: machinePollInterval,
  });

  const deliveryTasks = tasksQuery.data?.deliveryTasks ?? [];
  const pickupTasks = tasksQuery.data?.pickupTasks ?? [];

  const openOperatorSupply =
    useMemo((): OperatorMachineSupplyRequestListItem | null => {
      const list = operatorSupplyQuery.data ?? [];
      return list.find((r) => r.status === 'OPEN') ?? null;
    }, [operatorSupplyQuery.data]);

  const canPickup = canRequestPickup(deliveryTasks, pickupTasks);
  const timelineDelivery = useMemo(
    () => deliveryTaskDrivingMachineUi(deliveryTasks),
    [deliveryTasks],
  );
  const timelinePickup = useMemo(
    () => pickupTaskDrivingMachineUi(pickupTasks),
    [pickupTasks],
  );
  const operationTimelineMode = useMemo(
    () => resolveOperationTimelineMode(deliveryTasks, pickupTasks),
    [deliveryTasks, pickupTasks],
  );
  const pickupPhase = derivePickupFlowPhaseFromTask(
    operationTimelineMode === 'pickup' ? timelinePickup : null,
  );
  const deliveryPhase = deriveDeliveryFlowPhaseFromTask(
    operationTimelineMode === 'delivery' ? timelineDelivery : null,
  );
  const pickupBlockedMessage = pickupBlockedReason(deliveryTasks, pickupTasks);
  const canRequestSupplyNow = canRequestSupply(openOperatorSupply);
  const canOpenRequestDialog = canOpenServiceRequestDialog(
    canPickup,
    openOperatorSupply,
  );

  const unbindMut = useMutation({
    mutationFn: deleteOperatorUnbindMachine,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: queryKeyTasks });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      setEndShiftOpen(false);
      setShowMachinePicker(true);
      toast.success('Vínculo encerrado.');
    },
    onError: toastApiError,
  });

  const pickupOnlyMut = useMutation({
    mutationFn: (isCritical?: boolean) =>
      postOperatorPickupOnly({ isCritical: isCritical === true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyTasks });
      toast.success('Retirada solicitada. O transporte será acionado.');
    },
    onError: toastApiError,
  });

  const pickupWithReplenishmentMut = useMutation({
    mutationFn: (isCritical?: boolean) =>
      postOperatorPickupWithReplenishment({ isCritical: isCritical === true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyTasks });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      toast.success(
        'Retirada solicitada e abastecimento avisado para o próximo prisma.',
      );
    },
    onError: toastApiError,
  });

  const supplyOnlyMut = useMutation({
    mutationFn: postOperatorSupplyOnly,
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      if (res.created) {
        toast.success('Solicitação ao abastecimento registrada.');
      } else {
        toast.info('Já existe uma solicitação de abastecimento em aberto.');
      }
    },
    onError: toastApiError,
  });

  const submitServiceRequest = async (selection: {
    pickup: boolean;
    supply: boolean;
    pickupIsCritical?: boolean;
  }) => {
    const { pickup, supply, pickupIsCritical } = selection;
    if (!pickup && !supply) return;
    const critical = pickupIsCritical === true;

    if (supply && !pickup) {
      await supplyOnlyMut.mutateAsync();
      return;
    }

    if (pickup && supply) {
      await pickupWithReplenishmentMut.mutateAsync(critical);
      return;
    }

    if (pickup) {
      await pickupOnlyMut.mutateAsync(critical);
    }
  };

  const cancelPickupMut = useMutation({
    mutationFn: (pickupTaskId: string) =>
      postCancelOperatorPickup(pickupTaskId),
    onSuccess: () => {
      setCancelPickupId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeyTasks });
      void queryClient.invalidateQueries({ queryKey: ['operator-moviment'] });
      toast.success('Solicitação de retirada cancelada.');
    },
    onError: toastApiError,
  });

  const busy =
    unbindMut.isPending ||
    pickupOnlyMut.isPending ||
    pickupWithReplenishmentMut.isPending ||
    supplyOnlyMut.isPending ||
    cancelPickupMut.isPending ||
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
    tasksQuery,
    deliveryTasks,
    pickupTasks,
    operatorSupplyQuery,
    openOperatorSupply,
    timelineDelivery,
    timelinePickup,
    operationTimelineMode,
    pickupPhase,
    deliveryPhase,
    canPickup,
    canRequestSupplyNow,
    canOpenRequestDialog,
    pickupBlockedMessage,
    operatorSupplyRequests: operatorSupplyQuery.data ?? [],
    submitServiceRequest,
    serviceRequestSubmitPending:
      pickupOnlyMut.isPending ||
      pickupWithReplenishmentMut.isPending ||
      supplyOnlyMut.isPending,
    endShiftOpen,
    setEndShiftOpen,
    unbindMut,
    pickupOnlyMut,
    pickupWithReplenishmentMut,
    cancelPickupMut,
    cancelPickupId,
    setCancelPickupId,
    busy,
  };
}

export type OperatorMachinePageViewModel = ReturnType<
  typeof useOperatorMachinePage
>;
