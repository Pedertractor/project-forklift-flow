import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ENV } from '@/constants/env';
import { fetchOperatorPickupProgress } from '@/services/operator-machine-api';
import { useAuthStore } from '@/store/auth.store';

function queryKeyPickupProgress(requestId: string) {
  return ['operator-machine', 'pickup-progress', requestId] as const;
}

export function useOperatorMachinePickupProgressPage() {
  const { requestId } = useParams();
  const id = requestId?.trim() ?? '';
  const token = useAuthStore((s) => s.token);
  const apiReady = Boolean(ENV.API_URL && token);

  const query = useQuery({
    queryKey: queryKeyPickupProgress(id),
    queryFn: () => fetchOperatorPickupProgress(id),
    enabled: apiReady && Boolean(id),
    refetchInterval: (q) => {
      const phase = q.state.data?.phase;
      if (!phase || phase === 'PICKUP_FINISHED') {
        return false;
      }
      return 4000;
    },
  });

  return { requestId: id, apiReady, query };
}

export type OperatorMachinePickupProgressPageViewModel = ReturnType<
  typeof useOperatorMachinePickupProgressPage
>;
