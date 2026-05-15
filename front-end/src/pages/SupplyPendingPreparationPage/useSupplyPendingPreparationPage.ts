import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { ENV } from '@/constants/env';
import {
  fetchPendingPreparationRequests,
  markReplenishmentPalletReady,
} from '@/services/machine-replenishment-requests-api';
import { useAuthStore } from '@/store/auth.store';

function useApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  return Boolean(ENV.API_URL && token);
}

export function useSupplyPendingPreparationPage() {
  const queryClient = useQueryClient();
  const apiReady = useApiReady();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const hasSector = Boolean(user?.sectorId);

  const pendingQuery = useQuery({
    queryKey: ['pending-preparation-requests'],
    queryFn: fetchPendingPreparationRequests,
    enabled: apiReady && hasSector,
  });

  const markMut = useMutation({
    mutationFn: (requestId: string) => markReplenishmentPalletReady(requestId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['pending-preparation-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['machine-replenishment-requests'] });
      toast.success(data.message);
    },
    onError: toastApiError,
  });

  return {
    apiReady,
    token,
    user,
    hasSector,
    pendingQuery,
    markMut,
  };
}

export type SupplyPendingPreparationPageViewModel = ReturnType<
  typeof useSupplyPendingPreparationPage
>;
