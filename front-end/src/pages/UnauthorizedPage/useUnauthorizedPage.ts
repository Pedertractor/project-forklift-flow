import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

type UnauthorizedState = { from?: string } | null | undefined;

export function useUnauthorizedPage() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const state = location.state as UnauthorizedState;
  const attemptedPath = typeof state?.from === 'string' ? state.from : null;

  return {
    userName: user?.name ?? null,
    role: user?.role ?? null,
    attemptedPath,
  };
}

export type UnauthorizedPageViewModel = ReturnType<typeof useUnauthorizedPage>;
