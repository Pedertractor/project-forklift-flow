import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  OPERATOR_MOVIMENT_TASKS_QUEUE_PATH,
  type OperatorMovimentEquipmentNavigateState,
} from '@/constants/operator-moviment-routes';
import { ENV } from '@/constants/env';
import { toastApiError } from '@/lib/toast-helpers';
import { toast } from '@/lib/toast';
import {
  deleteUnbindOperatorMovimentPallet,
  fetchOperatorMyMovimentPallet,
  postBindOperatorMovimentPallet,
} from '@/services/operator-moviment-pallet-api';
import type { IsOperatingMode } from '@/types/operator-moviment-pallet.types';
import { useAuthStore } from '@/store/auth.store';
import { hasAdminPrivileges } from '@/types/role.types';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

function readChangeOperatingModeFlag(
  state: OperatorMovimentEquipmentNavigateState | null,
): boolean {
  return state?.changeEquipment === true;
}

export function useOperatorMovimentEquipmentPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const syncSessionFromProfile = useAuthStore((s) => s.syncSessionFromProfile);
  const sectorMissing =
    Boolean(user && !user.sectorId) && !hasAdminPrivileges(user?.role);
  const changeOperatingMode = readChangeOperatingModeFlag(
    location.state as OperatorMovimentEquipmentNavigateState | null,
  );

  const operatingQuery = useQuery({
    queryKey: ['operator-moviment', 'operating-mode'],
    queryFn: fetchOperatorMyMovimentPallet,
    enabled: apiReady,
  });

  const invalidateOperator = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['operator-moviment'] });
    void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  }, [queryClient]);

  const goToTasksQueue = useCallback(() => {
    void navigate(OPERATOR_MOVIMENT_TASKS_QUEUE_PATH, { replace: true });
  }, [navigate]);

  const bindMut = useMutation({
    mutationFn: (isOperating: IsOperatingMode) =>
      postBindOperatorMovimentPallet(isOperating),
    onSuccess: (pallet) => {
      invalidateOperator();
      if (user) {
        syncSessionFromProfile(
          { ...user, isOperating: pallet.type as IsOperatingMode },
          useAuthStore.getState().requiresPasswordChange,
        );
      }
      toast.success('Modo de operação definido.');
      goToTasksQueue();
    },
    onError: toastApiError,
  });

  const unbindMut = useMutation({
    mutationFn: deleteUnbindOperatorMovimentPallet,
    onSuccess: () => {
      invalidateOperator();
      if (user) {
        syncSessionFromProfile(
          { ...user, isOperating: null },
          useAuthStore.getState().requiresPasswordChange,
        );
      }
      toast.success('Modo de operação desconectado.');
    },
    onError: toastApiError,
  });

  const busy = bindMut.isPending || unbindMut.isPending;
  const currentOperatingMode =
    (operatingQuery.data?.type as IsOperatingMode | undefined) ??
    user?.isOperating ??
    null;
  const bound = currentOperatingMode !== null;
  const redirectingToTasks =
    bound && !changeOperatingMode && operatingQuery.isSuccess;

  useEffect(() => {
    if (!apiReady || operatingQuery.isLoading || changeOperatingMode) {
      return;
    }
    if (bound) {
      goToTasksQueue();
    }
  }, [
    apiReady,
    operatingQuery.isLoading,
    changeOperatingMode,
    bound,
    goToTasksQueue,
  ]);

  const selectOperatingMode = useCallback(
    (mode: IsOperatingMode) => {
      if (bindMut.isPending || busy) {
        return;
      }
      if (currentOperatingMode === mode) {
        goToTasksQueue();
        return;
      }
      bindMut.mutate(mode);
    },
    [bindMut, busy, currentOperatingMode, goToTasksQueue],
  );

  return {
    apiReady,
    token,
    sectorMissing,
    currentOperatingMode,
    bound,
    changeOperatingMode,
    redirectingToTasks,
    operatingQuery,
    selectOperatingMode,
    unbindMut,
    busy,
    bindPending: bindMut.isPending,
  };
}

export type OperatorMovimentEquipmentPageViewModel = ReturnType<
  typeof useOperatorMovimentEquipmentPage
>;
