import { useLocation } from 'react-router-dom';
import { defaultHomePathForRole } from '@/lib/default-home-path';
import { useAuthStore } from '@/store/auth.store';
import { ADMIN_OR_LEADER_ROLES, type AppRole } from '@/types/role.types';

type UnauthorizedState = { from?: string } | null | undefined;

export function useUnauthorizedPage() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const state = location.state as UnauthorizedState;
  const attemptedPath = typeof state?.from === 'string' ? state.from : null;
  const r = user?.role;
  const canUseHomeAndDashboard = Boolean(
    r && ADMIN_OR_LEADER_ROLES.includes(r as AppRole),
  );
  const workspacePath = defaultHomePathForRole(r);
  const hasWorkspaceLink = workspacePath !== '/nao-autorizado';

  return {
    userName: user?.name ?? null,
    role: r ?? null,
    attemptedPath,
    canUseHomeAndDashboard,
    workspacePath,
    hasWorkspaceLink,
  };
}

export type UnauthorizedPageViewModel = ReturnType<typeof useUnauthorizedPage>;
