import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';
import { toastApiError } from '@/lib/toast-helpers';
import { toast } from '@/lib/toast';
import type { OperatorMovimentTaskItem } from '@/types/operator-moviment-pallet.types';
import {
  completeOperatorTaskAccept,
  tryRecoverOperatorTaskAcceptAfterFailure,
} from '@/lib/operator-moviment-after-accept';

type AcceptMutationCallbacks = {
  onMutate?: () => void;
  onSuccess: (
    successMessage: string,
    acceptedTasks?: OperatorMovimentTaskItem[],
  ) => void;
  onError: (error: Error) => void;
};

export function createOperatorTaskAcceptMutationCallbacks(
  queryClient: QueryClient,
  navigate: NavigateFunction,
  setEnteringTaskFlow: (value: boolean) => void,
): AcceptMutationCallbacks {
  return {
    onMutate: () => {
      setEnteringTaskFlow(false);
    },
    onSuccess: (successMessage, acceptedTasks) => {
      setEnteringTaskFlow(true);
      completeOperatorTaskAccept(queryClient, navigate, acceptedTasks);
      toast.success(successMessage);
    },
    onError: async (error) => {
      const recovered = await tryRecoverOperatorTaskAcceptAfterFailure(
        queryClient,
        navigate,
      );
      if (recovered) {
        setEnteringTaskFlow(true);
        toast.info('Atividade já estava aceita. Abrindo suas tarefas…');
        return;
      }
      setEnteringTaskFlow(false);
      toastApiError(error);
    },
  };
}
