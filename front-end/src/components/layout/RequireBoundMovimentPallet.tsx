import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/layout/PageLoader';
import { OPERATOR_MOVIMENT_EQUIPMENT_PATH } from '@/constants/operator-moviment-routes';
import { ENV } from '@/constants/env';
import { fetchOperatorMyMovimentPallet } from '@/services/operator-moviment-pallet-api';
import { useAuthStore } from '@/store/auth.store';

/**
 * Exige equipamento vinculado antes de acessar fila de tarefas ou execução.
 */
export function RequireBoundMovimentPallet() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  const apiReady = Boolean(ENV.API_URL && token);

  const myPalletQuery = useQuery({
    queryKey: ['operator-moviment', 'my-pallet'],
    queryFn: fetchOperatorMyMovimentPallet,
    enabled: apiReady,
  });

  if (!apiReady) {
    return <Outlet />;
  }

  if (myPalletQuery.isPending && myPalletQuery.fetchStatus !== 'idle') {
    return <PageLoader />;
  }

  if (myPalletQuery.isSuccess && myPalletQuery.data === null) {
    return (
      <Navigate
        to={OPERATOR_MOVIMENT_EQUIPMENT_PATH}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
