import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

type LoginLocationState = { from?: { pathname?: string } } | null | undefined;

export function useLoginPage(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const requiresPasswordChange = useAuthStore((s) => s.requiresPasswordChange);

  const fromPath =
    (location.state as LoginLocationState)?.from?.pathname ?? '/';

  useEffect(() => {
    if (user) {
      const target = requiresPasswordChange ? '/definir-senha' : fromPath;
      navigate(target, { replace: true });
    }
  }, [user, requiresPasswordChange, navigate, fromPath]);
}
