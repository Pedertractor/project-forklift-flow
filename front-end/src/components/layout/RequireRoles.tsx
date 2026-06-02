import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import type { AppRole } from '@/types/role.types';

interface RequireRolesProps {
  roles: readonly AppRole[];
}

/**
 * Restringe rotas filhas a papéis permitidos (espelho do front-end para `ROTAS_POR_ROLE.md`).
 * Quem não pode acessa a tela `/nao-autorizado`.
 */
export function RequireRoles({ roles }: RequireRolesProps) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const role = user.role;
  const allowed = role !== undefined && roles.includes(role as AppRole);

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
