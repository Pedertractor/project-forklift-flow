import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

type LoginLocationState = { from?: { pathname?: string } } | null | undefined;

function defaultHomeForRole(role: string | undefined): string {
  if (role === 'SUPPLY_OPERATOR') {
    return '/abastecimento/preparo-pendente';
  }
  if (role === 'OPERATOR_MACHINE') {
    return '/dobra';
  }
  return '/';
}

export function useLoginPage(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const requiresPasswordChange = useAuthStore((s) => s.requiresPasswordChange);

  const fromState = (location.state as LoginLocationState)?.from?.pathname;
  const fromPath = fromState ?? '/';

  useEffect(() => {
    if (user) {
      if (requiresPasswordChange) {
        navigate('/definir-senha', { replace: true });
        return;
      }
      const resolvedFrom =
        fromPath === '/' ? defaultHomeForRole(user.role) : fromPath;
      navigate(resolvedFrom, { replace: true });
    }
  }, [user, requiresPasswordChange, navigate, fromPath]);
}
