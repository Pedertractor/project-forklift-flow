import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from '@/lib/toast';
import { markOperatorMachineInitiatedChange } from '@/lib/operator-machine-self-unbind';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import {
  deleteOperatorUnbindMachine,
  fetchOperatorMachineTasks,
  fetchOperatorMachineToolings,
  fetchOperatorMachinesForPicker,
  fetchOperatorMyMachine,
  fetchOperatorSupplyRequests,
  postOperatorBindMachine,
  postCancelOperatorPickup,
  postOperatorMachineTooling,
  deleteOperatorMachineTooling,
  postOperatorPickupOnly,
  postOperatorPickupWithReplenishment,
  postOperatorSupplyOnly,
} from '@/services/operator-machine-api';
import {
  canOpenServiceRequestDialog,
  canRequestSupply,
  canRequestPickup,
  canRequestPickupWithReplenishment,
  hasPalletAtReceiving,
  hasPickupLinkedToReplenishmentFlow,
  PALLET_AT_RECEIVING_SUPPLY_BLOCKED_MESSAGE,
  pickupBlockedReason,
} from './operator-machine-flow';
import { useOperatorMovimentWork } from '@/components/layout/OperatorMovimentWorkProvider';
import { useAuthStore } from '@/store/auth.store';
import { hasAdminPrivileges } from '@/types/role.types';
import type { OperatorMachineSupplyRequestListItem } from '@/types/operator-machine.types';

const queryKeyMyMachine = ['operator-machine', 'my-machine'] as const;
const queryKeyOperatorSupply = [
  'operator-machine',
  'operator-supply-requests',
] as const;
const queryKeyTasks = ['operator-machine', 'machine-tasks'] as const;
const queryKeyToolings = ['operator-machine', 'toolings'] as const;

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

const MACHINE_POLL_MS_WS_DOWN = 5_000;
/** Fallback leve com WS ativo (a UI já atualiza via patch no evento). */
const MACHINE_POLL_MS_WS_UP = 3_000;

export function useOperatorMachinePage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const user = useAuthStore((s) => s.user);
  const isAdmin = hasAdminPrivileges(user?.role);
  const hasSector = isAdmin || Boolean(user?.sectorId);
  const { wsConnected } = useOperatorMovimentWork();
  const machinePollInterval = wsConnected
    ? MACHINE_POLL_MS_WS_UP
    : MACHINE_POLL_MS_WS_DOWN;

  const [endShiftOpen, setEndShiftOpen] = useState(false);
  const [cancelPickupId, setCancelPickupId] = useState<string | null>(null);
  const [bindConfirmMachineId, setBindConfirmMachineId] = useState<
    string | null
  >(null);
  const [showMachinePicker, setShowMachinePicker] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState('');

  const myMachineQuery = useQuery({
    queryKey: queryKeyMyMachine,
    queryFn: fetchOperatorMyMachine,
    enabled: apiReady,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data != null ? machinePollInterval : false,
    refetchOnWindowFocus: true,
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
    mutationFn: (machineId: string) => {
      if (user?.id) {
        markOperatorMachineInitiatedChange(user.id);
      }
      return postOperatorBindMachine(machineId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: queryKeyTasks });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      setBindConfirmMachineId(null);
      setShowMachinePicker(false);
      toast.success('Máquina vinculada com sucesso!');
    },
    onError: toastApiError,
  });

  const machines = machinesQuery.data ?? [];

  const bindConfirmMachine = useMemo(
    () => machines.find((m) => m.id === bindConfirmMachineId) ?? null,
    [bindConfirmMachineId, machines],
  );

  const confirmBindMachine = () => {
    if (!bindConfirmMachineId || bindMut.isPending) {
      return;
    }
    bindMut.mutate(bindConfirmMachineId);
  };

  const selectMachine = (machineId: string) => {
    if (bindMut.isPending) return;
    setSelectedMachineId(machineId);
    if (current?.id === machineId) {
      setShowMachinePicker(false);
      return;
    }

    const machine = machines.find((m) => m.id === machineId);
    if (machine?.user && machine.user.id !== user?.id) {
      setBindConfirmMachineId(machineId);
      return;
    }

    bindMut.mutate(machineId);
  };

  const tasksQuery = useQuery({
    queryKey: queryKeyTasks,
    queryFn: fetchOperatorMachineTasks,
    enabled: apiReady && Boolean(current),
    staleTime: 0,
    refetchInterval: machinePollInterval,
    refetchOnWindowFocus: true,
  });

  const operatorSupplyQuery = useQuery({
    queryKey: queryKeyOperatorSupply,
    queryFn: () => fetchOperatorSupplyRequests(),
    enabled: apiReady && Boolean(current),
    staleTime: 0,
    refetchInterval: machinePollInterval,
    refetchOnWindowFocus: true,
  });

  const deliveryTasks = tasksQuery.data?.deliveryTasks ?? [];
  const pickupTasks = tasksQuery.data?.pickupTasks ?? [];

  const openOperatorSupply =
    useMemo((): OperatorMachineSupplyRequestListItem | null => {
      const list = operatorSupplyQuery.data ?? [];
      return list.find((r) => r.status === 'OPEN') ?? null;
    }, [operatorSupplyQuery.data]);

  const palletAtReceiving = hasPalletAtReceiving(deliveryTasks);
  const hasLinkedReplenishmentFlow =
    hasPickupLinkedToReplenishmentFlow(pickupTasks);
  const canPickup = canRequestPickup(deliveryTasks, pickupTasks);
  const pickupBlockedMessage = pickupBlockedReason(deliveryTasks, pickupTasks);
  const canRequestSupplyNow = canRequestSupply(
    openOperatorSupply,
    deliveryTasks,
  );
  const canPickupWithReplenishment = canRequestPickupWithReplenishment(
    openOperatorSupply,
    deliveryTasks,
  );
  const canOpenRequestDialog = canOpenServiceRequestDialog(
    canPickup,
    openOperatorSupply,
    deliveryTasks,
  );

  const toolingsQuery = useQuery({
    queryKey: [...queryKeyToolings, current?.id ?? ''],
    queryFn: fetchOperatorMachineToolings,
    enabled: apiReady && Boolean(current?.id),
  });

  const createToolingMut = useMutation({
    mutationFn: (name: string) => postOperatorMachineTooling(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyToolings });
      toast.success('Ferramental cadastrado.');
    },
    onError: toastApiError,
  });

  const deleteToolingMut = useMutation({
    mutationFn: (toolingId: string) => deleteOperatorMachineTooling(toolingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyToolings });
      toast.success('Ferramental removido.');
    },
    onError: toastApiError,
  });

  const unbindMut = useMutation({
    mutationFn: () => {
      if (user?.id) {
        markOperatorMachineInitiatedChange(user.id);
      }
      return deleteOperatorUnbindMachine();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeyMyMachine });
      void queryClient.invalidateQueries({ queryKey: queryKeyTasks });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      void queryClient.invalidateQueries({ queryKey: queryKeyToolings });
      setEndShiftOpen(false);
      setShowMachinePicker(true);
      toast.success('Vínculo encerrado.');
    },
    onError: toastApiError,
  });

  const pickupOnlyMut = useMutation({
    mutationFn: (input?: {
      isCritical?: boolean;
      typeMovimentPallet?: 'FORKLIFT' | 'ANY';
    }) =>
      postOperatorPickupOnly({
        isCritical: input?.isCritical === true,
        typeMovimentPallet: input?.typeMovimentPallet,
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: queryKeyTasks });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      void queryClient.invalidateQueries({ queryKey: ['operator-moviment'] });
      const linked = res.pickupTask.linkedSupplyRequestId != null;
      const joinedInFlight =
        linked &&
        (res.pickupTask.status === 'ASSIGNED' ||
          res.pickupTask.status === 'IN_PROGRESS');
      toast.success(
        joinedInFlight
          ? 'Retirada anexada à entrega em andamento. O empilhadeirista foi notificado.'
          : linked
            ? 'Retirada solicitada e vinculada à entrega. O transporte receberá a sugestão combinada.'
            : hasLinkedReplenishmentFlow
              ? 'Retirada solicitada.'
              : palletAtReceiving
                ? 'Retirada solicitada. O transporte receberá a sugestão de entrega e retirada.'
                : 'Retirada solicitada. O transporte será acionado.',
      );
    },
    onError: toastApiError,
  });

  const pickupWithReplenishmentMut = useMutation({
    mutationFn: (input?: {
      isCritical?: boolean;
      typeMovimentPallet?: 'FORKLIFT' | 'ANY';
    }) =>
      postOperatorPickupWithReplenishment({
        isCritical: input?.isCritical === true,
        typeMovimentPallet: input?.typeMovimentPallet,
      }),
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
    mutationFn: () => postOperatorSupplyOnly(),
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
    typeMovimentPallet?: 'FORKLIFT' | 'ANY';
  }) => {
    const { pickup, supply, pickupIsCritical, typeMovimentPallet } = selection;
    if (!pickup && !supply) return;
    const critical = pickupIsCritical === true;
    const pickupOptions =
      pickup && typeMovimentPallet
        ? { isCritical: critical, typeMovimentPallet }
        : { isCritical: critical };

    if (supply && !pickup) {
      await supplyOnlyMut.mutateAsync();
      return;
    }

    if (pickup && supply) {
      await pickupWithReplenishmentMut.mutateAsync(pickupOptions);
      return;
    }

    if (pickup) {
      await pickupOnlyMut.mutateAsync(pickupOptions);
    }
  };

  const cancelPickupMut = useMutation({
    mutationFn: (pickupTaskId: string) =>
      postCancelOperatorPickup(pickupTaskId),
    onSuccess: (result) => {
      setCancelPickupId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeyTasks });
      void queryClient.invalidateQueries({ queryKey: queryKeyOperatorSupply });
      void queryClient.invalidateQueries({ queryKey: ['operator-moviment'] });
      void queryClient.invalidateQueries({ queryKey: ['delivery-tasks'] });
      toast.success(
        result.replenishmentCanceled
          ? 'Solicitação de retirada e abastecimento canceladas.'
          : 'Solicitação de retirada cancelada.',
      );
    },
    onError: toastApiError,
  });

  const busy =
    unbindMut.isPending ||
    pickupOnlyMut.isPending ||
    pickupWithReplenishmentMut.isPending ||
    supplyOnlyMut.isPending ||
    cancelPickupMut.isPending ||
    bindMut.isPending ||
    createToolingMut.isPending ||
    deleteToolingMut.isPending;

  return {
    apiReady,
    hasSector,
    myMachineQuery,
    current,
    showMachinePicker,
    setShowMachinePicker,
    machinesQuery,
    machines,
    selectedMachineId,
    selectMachine,
    bindConfirmMachine,
    bindConfirmMachineId,
    setBindConfirmMachineId,
    confirmBindMachine,
    bindPending: bindMut.isPending,
    tasksQuery,
    deliveryTasks,
    pickupTasks,
    operatorSupplyQuery,
    openOperatorSupply,
    canPickup,
    canRequestSupplyNow,
    canPickupWithReplenishment,
    palletAtReceiving,
    palletAtReceivingBlockedMessage: PALLET_AT_RECEIVING_SUPPLY_BLOCKED_MESSAGE,
    canOpenRequestDialog,
    pickupBlockedMessage,
    operatorSupplyRequests: operatorSupplyQuery.data ?? [],
    toolings: toolingsQuery.data ?? [],
    toolingsLoading: toolingsQuery.isLoading,
    createTooling: async (name: string) => {
      return createToolingMut.mutateAsync(name);
    },
    createToolingPending: createToolingMut.isPending,
    deleteTooling: async (toolingId: string) => {
      await deleteToolingMut.mutateAsync(toolingId);
    },
    deleteToolingPendingId: deleteToolingMut.isPending
      ? (deleteToolingMut.variables ?? null)
      : null,
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
