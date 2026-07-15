import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/layout/PageLoader';
import { useSessionRole } from '@/hooks/useAuthMe';
import { useAuthStore } from '@/store/auth.store';
import { resolvePostLoginPath } from '@/lib/route-access';
import type { AppRole } from '@/types/role.types';
import { hasFullSystemAccess } from '@/types/role.types';

const UNAUTHORIZED_PATH = '/nao-autorizado';

interface RequireRolesProps {
  roles: readonly AppRole[];
  /**
   * Se true, ADMIN/SUPERADMIN não bypassam — só os `roles` listados.
   * Usado em «Operação — movimentação» (somente PALLET_TRANSPORTER).
   */
  strict?: boolean;
}

/**
 * Restringe rotas filhas a papéis permitidos (espelho do front-end para `ROTAS_POR_ROLE.md`).
 * Quem não pode acessar é encaminhado direto para a área do próprio papel; a
 * tela `/nao-autorizado` só aparece quando não há destino válido (evita o flash
 * de "sem acesso" ao restaurar a sessão numa rota que o papel não acessa).
 */
export function RequireRoles({ roles, strict = false }: RequireRolesProps) {
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
    (!strict && hasFullSystemAccess(role)) ||
    (role !== undefined && roles.includes(role as AppRole));

  if (!allowed) {
    const target = resolvePostLoginPath(location.pathname, role);
    if (target !== UNAUTHORIZED_PATH && target !== location.pathname) {
      return <Navigate to={target} replace />;
    }
    return (
      <Navigate
        to={UNAUTHORIZED_PATH}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
