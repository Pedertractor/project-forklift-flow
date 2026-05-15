import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OPERATOR_MOVIMENT_TASKS_QUEUE_PATH } from '@/constants/operator-moviment-routes';
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

export function useOperatorMovimentEquipmentPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const sectorMissing = Boolean(user && !user.sectorId);

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
    void navigate(OPERATOR_MOVIMENT_TASKS_QUEUE_PATH);
  }, [navigate]);

  const bindMut = useMutation({
    mutationFn: () => {
      const id = pickerMovimentId.trim();
      if (!id) {
        throw new Error('Selecione um equipamento.');
      }
      return postBindOperatorMovimentPallet(id);
    },
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
      toast.success('Equipamento desvinculado.');
    },
    onError: toastApiError,
  });

  const busy = bindMut.isPending || unbindMut.isPending;
  const currentPallet = myPalletQuery.data ?? null;
  const bound = currentPallet !== null;

  return {
    apiReady,
    token,
    sectorMissing,
    currentPallet,
    bound,
    myPalletQuery,
    pickerQuery,
    pickerMovimentId,
    setPickerMovimentId,
    bindMut,
    unbindMut,
    busy,
    goToTasksQueue,
  };
}

export type OperatorMovimentEquipmentPageViewModel = ReturnType<
  typeof useOperatorMovimentEquipmentPage
>;
