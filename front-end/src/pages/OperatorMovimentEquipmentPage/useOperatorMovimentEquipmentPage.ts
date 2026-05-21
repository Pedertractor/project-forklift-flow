import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
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
  fetchOperatorMovimentPallets,
  fetchOperatorMyMovimentPallet,
  postBindOperatorMovimentPallet,
} from '@/services/operator-moviment-pallet-api';
import { useAuthStore } from '@/store/auth.store';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

function readChangeEquipmentFlag(
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
  const sectorMissing = Boolean(user && !user.sectorId);
  const changeEquipment = readChangeEquipmentFlag(
    location.state as OperatorMovimentEquipmentNavigateState | null,
  );

  const [pickerMovimentId, setPickerMovimentId] = useState('');

  const myPalletQuery = useQuery({
    queryKey: ['operator-moviment', 'my-pallet'],
    queryFn: fetchOperatorMyMovimentPallet,
    enabled: apiReady,
  });

  const pickerQuery = useQuery({
    queryKey: ['operator-moviment', 'moviment-pallets'],
    queryFn: fetchOperatorMovimentPallets,
    enabled: apiReady,
  });

  const invalidateOperator = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['operator-moviment'] });
  }, [queryClient]);

  const goToTasksQueue = useCallback(() => {
    void navigate(OPERATOR_MOVIMENT_TASKS_QUEUE_PATH, { replace: true });
  }, [navigate]);

  const bindMut = useMutation({
    mutationFn: postBindOperatorMovimentPallet,
    onSuccess: () => {
      invalidateOperator();
      setPickerMovimentId('');
      toast.success('Equipamento vinculado.');
      goToTasksQueue();
    },
    onError: toastApiError,
  });

  const unbindMut = useMutation({
    mutationFn: deleteUnbindOperatorMovimentPallet,
    onSuccess: () => {
      invalidateOperator();
      setPickerMovimentId('');
      toast.success('Equipamento desvinculado.');
    },
    onError: toastApiError,
  });

  const busy = bindMut.isPending || unbindMut.isPending;
  const currentPallet = myPalletQuery.data ?? null;
  const bound = currentPallet !== null;
  const redirectingToTasks =
    bound && !changeEquipment && myPalletQuery.isSuccess;

  useEffect(() => {
    if (currentPallet?.id) {
      setPickerMovimentId(currentPallet.id);
    }
  }, [currentPallet?.id]);

  useEffect(() => {
    if (!apiReady || myPalletQuery.isLoading || changeEquipment) {
      return;
    }
    if (bound) {
      goToTasksQueue();
    }
  }, [
    apiReady,
    myPalletQuery.isLoading,
    changeEquipment,
    bound,
    goToTasksQueue,
  ]);

  const currentUserId = user?.id ?? '';

  const selectMovimentEquipment = useCallback(
    (movimentId: string) => {
      if (bindMut.isPending || busy) {
        return;
      }
      const pallet = pickerQuery.data?.find((p) => p.id === movimentId);
      if (
        pallet?.operatorId &&
        pallet.operatorId !== currentUserId
      ) {
        return;
      }
      setPickerMovimentId(movimentId);
      if (currentPallet?.id === movimentId) {
        goToTasksQueue();
        return;
      }
      bindMut.mutate(movimentId);
    },
    [
      bindMut,
      busy,
      currentPallet?.id,
      currentUserId,
      goToTasksQueue,
      pickerQuery.data,
    ],
  );

  return {
    apiReady,
    token,
    currentUserId,
    sectorMissing,
    currentPallet,
    bound,
    changeEquipment,
    redirectingToTasks,
    myPalletQuery,
    pickerQuery,
    pickerMovimentId,
    selectMovimentEquipment,
    unbindMut,
    busy,
    bindPending: bindMut.isPending,
  };
}

export type OperatorMovimentEquipmentPageViewModel = ReturnType<
  typeof useOperatorMovimentEquipmentPage
>;
