import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/layout/PageLoader';
import { useSessionRole } from '@/hooks/useAuthMe';
import { useAuthStore } from '@/store/auth.store';
import type { AppRole } from '@/types/role.types';
import { hasFullSystemAccess } from '@/types/role.types';

interface RequireRolesProps {
  roles: readonly AppRole[];
}

/**
 * Restringe rotas filhas a papéis permitidos (espelho do front-end para `ROTAS_POR_ROLE.md`).
 * Quem não pode acessa a tela `/nao-autorizado`.
 */
export function RequireRoles({ roles }: RequireRolesProps) {
  const user = useAuthStore((s) => s.user);
  const { role, isBootstrapping } = useSessionRole();
  const location = useLocation();

  if (isBootstrapping) {
    return <PageLoader />;
  }

  if (!user && !role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowed =
    hasFullSystemAccess(role) ||
    (role !== undefined && roles.includes(role as AppRole));

  if (!allowed) {
    return (
      <Navigate
        to="/nao-autorizado"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
